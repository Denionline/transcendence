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

//	memoryStorage, not diskStorage: the disk backend would write the file
//	itself, making it a second place that touches the upload directory.
const upload = multer({
	storage: multer.memoryStorage(),
	//	The global ceiling, enforced mid-stream. The per-type cap in
	//	files.service.ts is the tighter, real limit.
	limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
});

//	MulterError is not an HttpError, so the error middleware would render it
//	a 500. Translated here rather than in error.middleware.ts.
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

//	Exported because the rate-limit test asserts the exact boundary.
export const UPLOAD_MAX_PER_WINDOW = 20;
export const UPLOAD_WINDOW_MS = 15 * 60_000;

const uploadRateLimit = rateLimit({
	windowMs: UPLOAD_WINDOW_MS,
	max: UPLOAD_MAX_PER_WINDOW,
	message: "too many uploads, try again later",
	keyOf: (req) => req.user!.id,
});

//	GET /:id/raw has no requireAuth, so there is no user id to key on.
//	Generous on purpose: a gallery fetches every thumbnail at once and a
//	<video> scrub fires a burst of Range requests. This is a ceiling on
//	abuse, not a quota. Note the dev-server proxy does not forward
//	X-Forwarded-For, so in the container setup this bucket is shared by all
//	callers rather than per-client.
export const RAW_MAX_PER_MINUTE = 600;

const rawRateLimit = rateLimit({
	windowMs: 60_000,
	max: RAW_MAX_PER_MINUTE,
	message: "too many file requests, try again in a moment",
});

//	requireAuth and the rate limit run before multer, so an unauthenticated
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
//	are where `visibility` is actually enforced.
router.get("/", requireAuth, async (req: Request, res) => {
	const { page, pageSize } = parsePagination(req.query);
	const result = await listOwnFiles(req.user!.id, { page, pageSize });
	res.status(200).json(result);
});

//	404 rather than 403 for someone else's file, so ids stay unenumerable.
router.get("/:id", requireAuth, async (req: Request, res) => {
	const fileId = parseId(req.params.id);
	const file = await getFileForViewer(fileId, req.user!.id);
	res.status(200).json(toPublic(file));
});

//	The bytes. No requireAuth and deliberately no `visibility` check: <img>
//	and <video> issue bare browser GETs with no Authorization header, so a
//	check here could only reject the owner's own browser. Visibility is
//	enforced where it is enforceable — in the endpoints that decide which
//	ids a caller learns.
router.get("/:id/raw", rawRateLimit, async (req: Request, res, next: NextFunction) => {
	const fileId = parseId(req.params.id);
	const file = await getFileOrThrow(fileId);

	//	The stored MIME, never one re-derived from the extension. Set before
	//	sendFile, which only guesses a type when Content-Type is unset.
	res.setHeader("Content-Type", file.mimeType);
	//	Nothing validated what these bytes actually are, so this is what stops
	//	a browser sniffing HTML out of something declared as image/png.
	res.setHeader("X-Content-Type-Options", "nosniff");
	const scope = file.visibility === FileVisibility.public ? "public" : "private";
	res.setHeader("Cache-Control", `${scope}, max-age=86400, immutable`);

	//	sendFile brings HTTP Range with it. Without Range, <video> seeking
	//	silently breaks and Safari refuses to play at all.
	res.sendFile(resolveKey(file.location), (error?: unknown) => {
		if (!error) return;
		//	Bytes are already on the wire, so there is no status line left to
		//	change. Cutting the connection is the only honest signal.
		if (res.headersSent) return res.destroy();

		const failure = error as NodeJS.ErrnoException & { status?: number };

		//	An unsatisfiable Range: the caller's mistake, not a missing file.
		//	send() has already put the required `bytes */<size>` Content-Range on
		//	the response.
		if (failure.status === 416)
			return next(
				new HttpError(416, "RANGE_NOT_SATISFIABLE", "requested range is not satisfiable"),
			);

		//	A row the database knows about whose bytes are gone — after a
		//	`make fclean`, say. That is a 404, never a 500.
		if (failure.code === "ENOENT")
			return next(new HttpError(404, "FILE_NOT_FOUND", "no file with that id"));

		//	EACCES, EISDIR, EIO: ours, not theirs. Answered 500 and logged — a
		//	404 here would hide an outage behind a plausible client error.
		next(failure);
	});
});

//	Owner or admin, as in profile.routes.ts. A 403 is safe here in a way it
//	is not on GET: the caller already proved they hold the id.
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
