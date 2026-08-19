import { NextFunction, Request, Response, Router } from "express";
import multer, { MulterError } from "multer";
import { HttpError, throwError } from "../../lib/http-error.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { rateLimit } from "../../middlewares/rate.limit.middleware.js";
import { parsePagination } from "../../lib/pagination.js";
import { MAX_UPLOAD_MB } from "../../lib/env.js";
import { resolveKey } from "../../lib/storage.js";
import { FileVisibility, UserRole } from "../../../generated/prisma/enums.js";
import {
	createFile,
	deleteFileById,
	getFileForViewer,
	getFileOrThrow,
	listOwnFiles,
	parseVisibility,
	toPublic,
} from "./files.service.js";
import { parseId } from "../gigs/gigs.routes.js";

const router = Router();

//	memoryStorage, not diskStorage: multer's disk backend would write the file
//	under a name of its own choosing and leave us to move it, which is a second
//	place that touches the upload directory. storage.ts stays the only one.
const upload = multer({
	storage: multer.memoryStorage(),
	//	The global ceiling, enforced *mid-stream*: this aborts a 50 GB upload
	//	while it is still arriving, instead of after it has landed in memory.
	//	The per-type cap in files.service.ts is the tighter, real limit.
	limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
});

//	multer rejects with a MulterError, which is not an HttpError, so the error
//	middleware would render it as a 500. Translate it here rather than teaching
//	error.middleware.ts about multer.
function receiveFile(req: Request, res: Response, next: NextFunction) {
	upload.single("file")(req, res, (error: unknown) => {
		if (!error) return next();
		if (error instanceof MulterError) {
			if (error.code === "LIMIT_FILE_SIZE")
				return next(
					new HttpError(413, "FILE_TOO_LARGE", `uploads are limited to ${MAX_UPLOAD_MB} MB`),
				);
			return next(
				new HttpError(400, "VALIDATION_ERROR", 'send exactly one file in the "file" field'),
			);
		}
		next(error);
	});
}

//	Keyed by user id rather than address, so one person on a shared NAT cannot
//	spend everybody else's budget. Exported because the test asserts the exact
//	boundary — a magic 20 in the test would drift the moment this number does.
export const UPLOAD_MAX_PER_WINDOW = 20;
export const UPLOAD_WINDOW_MS = 15 * 60_000;

const uploadRateLimit = rateLimit({
	windowMs: UPLOAD_WINDOW_MS,
	max: UPLOAD_MAX_PER_WINDOW,
	message: "too many uploads, try again later",
	keyOf: (req) => req.user!.id,
});

//	GET /:id/raw is the one endpoint here with no requireAuth (see the comment
//	on the route), so there is no user id to key on and no login to exhaust —
//	without this, one client can pull a 50 MB video in a loop forever.
//
//	Deliberately generous. A gallery page fetches every thumbnail at once, and
//	a <video> scrub fires a burst of Range requests for a single file, so a
//	tight limit would break normal use long before it inconvenienced anyone.
//	This is a ceiling on abuse, not a quota.
//
//	One honest caveat: in the container setup the browser reaches the API
//	through the frontend's dev-server proxy, which does not forward
//	X-Forwarded-For, so every request arrives with the proxy's address. This
//	bucket is therefore shared by all callers rather than per-client — which
//	is part of why the number is high. Trusting a forwarded header instead
//	would be worse: it is client-supplied, and spoofing it would defeat the
//	limit entirely.
export const RAW_MAX_PER_MINUTE = 600;

const rawRateLimit = rateLimit({
	windowMs: 60_000,
	max: RAW_MAX_PER_MINUTE,
	message: "too many file requests, try again in a moment",
});

//	requireAuth and the rate limit run *before* multer, so an unauthenticated
//	or over-quota caller is rejected before a single byte is buffered.
router.post("/", requireAuth, uploadRateLimit, receiveFile, async (req: Request, res) => {
	const uploaded = req.file;
	if (!uploaded) throwError(400, "VALIDATION_ERROR", 'no file received in the "file" field');

	const body = req.body ?? {};
	const file = await createFile({
		ownerId: req.user!.id,
		buffer: uploaded.buffer,
		declaredMime: uploaded.mimetype,
		originalName: uploaded.originalname,
		visibility: parseVisibility(body.visibility),
	});
	res.status(201).json(file);
});

//	The caller's own files, both visibilities. This and GET /api/profile/:id
//	are where `visibility` is actually enforced — they decide which ids a
//	caller ever learns, and the id is the permission.
router.get("/", requireAuth, async (req: Request, res) => {
	const { page, pageSize } = parsePagination(req.query);
	const result = await listOwnFiles(req.user!.id, { page, pageSize });
	res.status(200).json(result);
});

//	Metadata. This endpoint *is* the access control for a private file: it
//	answers 404 rather than 403 for someone else's, so ids stay unenumerable.
router.get("/:id", requireAuth, async (req: Request, res) => {
	const fileId = parseId(req.params.id);
	const file = await getFileForViewer(fileId, req.user!.id);
	res.status(200).json(toPublic(file));
});

//	The bytes. No requireAuth, no signature, and deliberately no `visibility`
//	check — <img> and <video> issue bare browser GETs with no Authorization
//	header, so a check here could only ever reject the owner's own browser
//	while doing nothing to anyone who already holds the id. Visibility is
//	enforced where it is enforceable: in the two endpoints above and in
//	GET /api/profile/:id, which decide which ids a caller learns.
router.get("/:id/raw", rawRateLimit, async (req: Request, res, next: NextFunction) => {
	const fileId = parseId(req.params.id);
	const file = await getFileOrThrow(fileId);

	//	The stored MIME — the value that passed the allow-list at upload, never
	//	one re-derived from the extension. Setting it before sendFile matters:
	//	sendFile only guesses a type when Content-Type is unset.
	res.setHeader("Content-Type", file.mimeType);
	//	Not optional hardening. Nothing validated what these bytes actually
	//	are, so this header is what stops a browser sniffing HTML out of
	//	something we declared as image/png and running it.
	res.setHeader("X-Content-Type-Options", "nosniff");
	//	`immutable` is honest here: the bytes at a given id never change, and
	//	with no expiry there is nothing to invalidate.
	const scope = file.visibility === FileVisibility.public ? "public" : "private";
	res.setHeader("Cache-Control", `${scope}, max-age=86400, immutable`);

	//	sendFile, not createReadStream().pipe() — it brings HTTP Range, ETag
	//	and Last-Modified with it. Without Range, <video> seeking silently
	//	breaks and Safari refuses to play at all.
	res.sendFile(resolveKey(file.location), (error?: unknown) => {
		if (!error) return;
		//	Bytes are already on the wire, so there is no status line left to
		//	change and no way to say what went wrong. Cutting the connection is
		//	the only honest signal: a truncated body beats a body that looks
		//	complete but is not.
		if (res.headersSent) return res.destroy();

		//	sendFile funnels four unrelated failures through this one callback,
		//	and flattening them all to 404 would report a broken volume as
		//	"no file with that id". Each branch below is a distinct fault with a
		//	distinct owner.
		const failure = error as NodeJS.ErrnoException & { status?: number };

		//	An unsatisfiable Range — `bytes=999999-` on a 100-byte file. The
		//	caller's mistake, not a missing file. send() has already put the
		//	required `bytes */<size>` Content-Range on the response, and it
		//	survives into the error handler because it is the same res.
		if (failure.status === 416)
			return next(
				new HttpError(416, "RANGE_NOT_SATISFIABLE", "requested range is not satisfiable"),
			);

		//	The only disk error that is genuinely the client's problem: a row
		//	the database knows about whose bytes are gone — after a `make
		//	fclean`, say. That is a 404, never a 500.
		if (failure.code === "ENOENT")
			return next(new HttpError(404, "FILE_NOT_FOUND", "no file with that id"));

		//	EACCES, EISDIR, EIO: the volume is misconfigured or the row is
		//	corrupt. Ours, not theirs. Handing it to the error handler untouched
		//	gets it logged and answered 500 — a 404 here would hide the outage
		//	behind a plausible-looking client error, which is exactly how a
		//	broken mount survives a whole deploy unnoticed.
		next(failure);
	});
});

//	Authorisation mirrors profile.routes.ts: owner or admin, nobody else. A
//	403 is safe here in a way it is not on GET — the caller already proved they
//	hold the id, so the only thing left to hide is who owns it.
router.delete("/:id", requireAuth, async (req: Request, res) => {
	const fileId = parseId(req.params.id);
	const caller = req.user!;

	const file = await getFileOrThrow(fileId);
	if (file.ownerId !== caller.id && caller.role !== UserRole.admin)
		throwError(403, "FORBIDDEN", "you cannot delete this file");

	await deleteFileById(file);
	res.status(204).send();
});

export default router;
