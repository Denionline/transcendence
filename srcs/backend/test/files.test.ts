import "./setup.js";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { mkdir, readdir, rm, unlink } from "node:fs/promises";
import path from "node:path";
import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";

import app from "../src/app.js";
import { SECRET, UPLOAD_DIR } from "../src/lib/env.js";
import { prisma } from "../src/lib/prisma.js";
import { UserRole } from "../generated/prisma/client.js";

//	A real 1x1 PNG. Nothing in the backend inspects the bytes, but a test that
//	uploads plausible input is a better regression net than one that does not.
const PNG = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
	"base64",
);

async function withServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
	const server = app.listen(0);
	const { port } = server.address() as AddressInfo;
	try {
		return await run(`http://localhost:${port}`);
	} finally {
		server.close();
	}
}

function tokenFor(user: { id: string; role: UserRole }): string {
	return jwt.sign({ userId: user.id, role: user.role }, SECRET, {
		algorithm: "HS256",
		expiresIn: "15m",
	});
}

const createdUserIds: string[] = [];

after(async () => {
	await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
	await prisma.$disconnect();
	//	setup.ts points UPLOAD_DIR at a per-pid temp directory; take it with us.
	await rm(UPLOAD_DIR, { recursive: true, force: true });
});

async function makeUser(role: UserRole = UserRole.artist) {
	const user = await prisma.user.create({
		data: {
			email: `files-test-${crypto.randomUUID()}@test.local`,
			username: "files-test",
			role,
		},
	});
	createdUserIds.push(user.id);
	return user;
}

interface UploadOptions {
	bytes?: Buffer;
	mimeType?: string;
	filename?: string;
	visibility?: string;
}

//	Never set Content-Type by hand on a FormData body: the boundary is part of
//	it, and only the runtime knows the boundary it generated.
async function upload(baseUrl: string, token: string, options: UploadOptions = {}) {
	const bytes = options.bytes ?? PNG;
	const form = new FormData();
	form.append(
		"file",
		new Blob([new Uint8Array(bytes)], { type: options.mimeType ?? "image/png" }),
		options.filename ?? "cat.png",
	);
	if (options.visibility) form.append("visibility", options.visibility);

	const res = await fetch(`${baseUrl}/api/files`, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}` },
		body: form,
	});
	const text = await res.text();
	return { status: res.status, body: text ? (JSON.parse(text) as Record<string, unknown>) : null };
}

//	`location` is deliberately not in any response body, so the tests that
//	assert on disk state read it straight from the row.
async function locationOf(fileId: string): Promise<string> {
	const file = await prisma.file.findUnique({ where: { id: fileId }, select: { location: true } });
	assert.ok(file, `no File row for ${fileId}`);
	return file.location;
}

async function api(
	baseUrl: string,
	method: string,
	path: string,
	options: { token?: string } = {},
) {
	const headers: Record<string, string> = {};
	if (options.token) headers.Authorization = `Bearer ${options.token}`;
	const res = await fetch(`${baseUrl}${path}`, { method, headers });
	const text = await res.text();
	return { status: res.status, body: text ? (JSON.parse(text) as Record<string, unknown>) : null };
}

test("POST /api/files stores an image and returns its metadata (201)", async () => {
	const artist = await makeUser();

	await withServer(async (baseUrl) => {
		const { status, body } = await upload(baseUrl, tokenFor(artist));

		assert.equal(status, 201);
		assert.ok(body?.id);
		assert.equal(body?.type, "image");
		assert.equal(body?.mimeType, "image/png");
		assert.equal(body?.sizeBytes, PNG.byteLength);
		assert.equal(body?.originalName, "cat.png");
		//	Default visibility is private: a file becomes portfolio material
		//	only by being asked for.
		assert.equal(body?.visibility, "private");
		assert.equal(body?.url, `/api/files/${body?.id}/raw`);

		//	The stored name is a fresh uuid with the extension the allow-list
		//	chose — never the client's filename, which is why a filename of
		//	"../../etc/passwd" has nowhere to go. It is also independent of the
		//	row id, so a leaked path discloses nothing about the id.
		const location = await locationOf(body?.id as string);
		assert.match(location, /^[0-9a-f-]{36}\.png$/);
		assert.notEqual(location, "cat.png");
		const stored = await readdir(UPLOAD_DIR);
		assert.ok(stored.includes(location));
	});
});

test("POST /api/files rejects a file over its per-type cap (413)", async () => {
	const artist = await makeUser();
	//	6 MB as image/png: past the 5 MB image cap but well under the 50 MB
	//	global multer limit, so this exercises files.service.ts, not multer.
	const oversize = Buffer.alloc(6 * 1024 * 1024, 1);

	await withServer(async (baseUrl) => {
		const { status, body } = await upload(baseUrl, tokenFor(artist), { bytes: oversize });
		assert.equal(status, 413);
		assert.equal(body?.error, "FILE_TOO_LARGE");
	});
});

test("POST /api/files rejects types outside the allow-list (415)", async () => {
	const artist = await makeUser();

	await withServer(async (baseUrl) => {
		for (const mimeType of ["image/svg+xml", "application/pdf", "image/gif"]) {
			const { status, body } = await upload(baseUrl, tokenFor(artist), { mimeType });
			assert.equal(status, 415, `${mimeType} should be refused`);
			assert.equal(body?.error, "UNSUPPORTED_FILE_TYPE");
		}
	});
});

//	Regression: `visibility in FileVisibility` walked the prototype chain, so
//	every Object.prototype member passed validation, reached Prisma as a column
//	value and came back a 500. "nonsense" was always rejected correctly — it is
//	the inherited keys that got through, which is why this test lists both.
test("POST /api/files rejects a bogus visibility with 400, prototype keys included", async () => {
	const artist = await makeUser();

	await withServer(async (baseUrl) => {
		const before = (await readdir(UPLOAD_DIR)).length;
		for (const visibility of [
			"constructor",
			"toString",
			"__proto__",
			"hasOwnProperty",
			"nonsense",
		]) {
			const { status, body } = await upload(baseUrl, tokenFor(artist), { visibility });
			assert.equal(status, 400, `visibility=${visibility} should be refused`);
			assert.equal(body?.error, "VALIDATION_ERROR");
		}
		//	Rejected before createFile runs, so not one of them wrote bytes.
		assert.equal((await readdir(UPLOAD_DIR)).length, before);
	});
});

//	The documented hole, asserted on purpose. Validation is input validation:
//	nothing checks that the bytes are really a PNG. What contains the risk is
//	the response — the stored MIME plus nosniff. If someone later drops the
//	nosniff header, this test is what breaks.
test("mislabelled bytes are stored, and served with the declared type and nosniff", async () => {
	const artist = await makeUser();
	const html = Buffer.from("<script>alert(1)</script>", "utf8");

	await withServer(async (baseUrl) => {
		const { status, body } = await upload(baseUrl, tokenFor(artist), {
			bytes: html,
			mimeType: "image/png",
			filename: "not-really.png",
		});
		assert.equal(status, 201);

		const raw = await fetch(`${baseUrl}/api/files/${body?.id}/raw`);
		assert.equal(raw.status, 200);
		assert.equal(raw.headers.get("content-type"), "image/png");
		assert.equal(raw.headers.get("x-content-type-options"), "nosniff");
		await raw.text();
	});
});

test("GET /api/files/:id/raw is 404 for an unknown id", async () => {
	await withServer(async (baseUrl) => {
		const res = await fetch(`${baseUrl}/api/files/${crypto.randomUUID()}/raw`);
		assert.equal(res.status, 404);
		await res.text();
	});
});

//	B1, stated as a test rather than left implicit: holding the id *is* the
//	permission. A test expecting 403 here would encode a security property
//	this design deliberately does not have.
test("GET /api/files/:id/raw serves another user's private file (200)", async () => {
	const owner = await makeUser();
	const stranger = await makeUser();

	await withServer(async (baseUrl) => {
		const { body } = await upload(baseUrl, tokenFor(owner));

		const res = await fetch(`${baseUrl}/api/files/${body?.id}/raw`, {
			headers: { Authorization: `Bearer ${tokenFor(stranger)}` },
		});
		assert.equal(res.status, 200);
		assert.equal(res.headers.get("cache-control"), "private, max-age=86400, immutable");
		const served = Buffer.from(await res.arrayBuffer());
		assert.deepEqual(served, PNG);
	});
});

//	…and this is the test that actually protects private files: the listing
//	never discloses an id the caller has no business holding.
test("GET /api/files lists only the caller's own files", async () => {
	const owner = await makeUser();
	const stranger = await makeUser();

	await withServer(async (baseUrl) => {
		const { body: mine } = await upload(baseUrl, tokenFor(owner));

		const own = await api(baseUrl, "GET", "/api/files", { token: tokenFor(owner) });
		assert.equal(own.status, 200);
		const ownIds = (own.body?.items as { id: string }[]).map((file) => file.id);
		assert.ok(ownIds.includes(mine?.id as string));

		const theirs = await api(baseUrl, "GET", "/api/files", { token: tokenFor(stranger) });
		assert.equal(theirs.status, 200);
		const strangerIds = (theirs.body?.items as { id: string }[]).map((file) => file.id);
		assert.ok(!strangerIds.includes(mine?.id as string));
	});
});

test("GET /api/files/:id is 404 (not 403) for another user's private file", async () => {
	const owner = await makeUser();
	const stranger = await makeUser();

	await withServer(async (baseUrl) => {
		const { body } = await upload(baseUrl, tokenFor(owner));

		const asStranger = await api(baseUrl, "GET", `/api/files/${body?.id}`, {
			token: tokenFor(stranger),
		});
		assert.equal(asStranger.status, 404);

		const asOwner = await api(baseUrl, "GET", `/api/files/${body?.id}`, {
			token: tokenFor(owner),
		});
		assert.equal(asOwner.status, 200);
		assert.equal(asOwner.body?.id, body?.id);
	});
});

test("a public file appears on its owner's profile with a url", async () => {
	const artist = await makeUser();
	await prisma.artistProfile.create({ data: { userId: artist.id, bio: "paints walls" } });
	const stranger = await makeUser();

	await withServer(async (baseUrl) => {
		const { body: hidden } = await upload(baseUrl, tokenFor(artist));
		const { body: shown } = await upload(baseUrl, tokenFor(artist), { visibility: "public" });

		const { status, body } = await api(baseUrl, "GET", `/api/profile/${artist.id}`, {
			token: tokenFor(stranger),
		});
		assert.equal(status, 200);
		const portfolio = body?.portfolio as { id: string; url: string }[];
		assert.deepEqual(
			portfolio.map((file) => file.id),
			[shown?.id],
		);
		assert.equal(portfolio[0].url, `/api/files/${shown?.id}/raw`);
		//	The private one is absent, which is the whole access control.
		assert.ok(!portfolio.some((file) => file.id === hidden?.id));
	});
});

test("DELETE /api/files/:id is 403 for a non-owner", async () => {
	const owner = await makeUser();
	const stranger = await makeUser();

	await withServer(async (baseUrl) => {
		const { body } = await upload(baseUrl, tokenFor(owner));
		const { status } = await api(baseUrl, "DELETE", `/api/files/${body?.id}`, {
			token: tokenFor(stranger),
		});
		assert.equal(status, 403);
	});
});

test("DELETE /api/files/:id removes the row and the bytes", async () => {
	const owner = await makeUser();

	await withServer(async (baseUrl) => {
		const { body } = await upload(baseUrl, tokenFor(owner));
		const fileId = body?.id as string;

		const location = await locationOf(fileId);
		assert.ok((await readdir(UPLOAD_DIR)).includes(location));

		const deleted = await api(baseUrl, "DELETE", `/api/files/${fileId}`, {
			token: tokenFor(owner),
		});
		assert.equal(deleted.status, 204);

		const gone = await api(baseUrl, "GET", `/api/files/${fileId}`, { token: tokenFor(owner) });
		assert.equal(gone.status, 404);

		assert.ok(!(await readdir(UPLOAD_DIR)).includes(location));
	});
});

//	Range is the reason A1 beat A2 and the reason /raw uses res.sendFile: no
//	Range means <video> cannot seek and Safari refuses to play at all.
test("GET /api/files/:id/raw answers a Range request with 206", async () => {
	const owner = await makeUser();

	await withServer(async (baseUrl) => {
		const { body } = await upload(baseUrl, tokenFor(owner));

		const res = await fetch(`${baseUrl}/api/files/${body?.id}/raw`, {
			headers: { Range: "bytes=0-9" },
		});
		assert.equal(res.status, 206);
		assert.equal(res.headers.get("content-range"), `bytes 0-9/${PNG.byteLength}`);
		const chunk = Buffer.from(await res.arrayBuffer());
		assert.equal(chunk.byteLength, 10);
		assert.deepEqual(chunk, PNG.subarray(0, 10));
	});
});

//	L1. sendFile reports four unrelated failures through one callback, and the
//	route used to answer 404 to all of them. The three tests below pin the three
//	that are distinguishable, because "no file with that id" is a plausible
//	enough answer that a broken volume could hide behind it for a whole deploy.

test("GET /api/files/:id/raw answers an unsatisfiable Range with 416", async () => {
	const owner = await makeUser();

	await withServer(async (baseUrl) => {
		const { body } = await upload(baseUrl, tokenFor(owner));

		const res = await fetch(`${baseUrl}/api/files/${body?.id}/raw`, {
			headers: { Range: `bytes=${PNG.byteLength + 1000}-${PNG.byteLength + 2000}` },
		});
		//	Used to be 404 — the caller asked for a range this file cannot
		//	satisfy, which says nothing about whether the file exists.
		assert.equal(res.status, 416);
		assert.equal(((await res.json()) as { error: string }).error, "RANGE_NOT_SATISFIABLE");
		//	RFC 9110 §14.4: a 416 carries the unsatisfied-range form so the
		//	client learns the real length and can retry. send() sets it on the
		//	response before erroring, and it has to survive our error handler.
		assert.equal(res.headers.get("content-range"), `bytes */${PNG.byteLength}`);
	});
});

test("GET /api/files/:id/raw is 404 when the row outlives its bytes", async () => {
	const owner = await makeUser();

	await withServer(async (baseUrl) => {
		const { body } = await upload(baseUrl, tokenFor(owner));
		//	The state after a `make fclean` that spared the database: the row is
		//	fine, so getFileOrThrow passes, and only sendFile finds out.
		await unlink(path.join(UPLOAD_DIR, await locationOf(body?.id as string)));

		const res = await fetch(`${baseUrl}/api/files/${body?.id}/raw`);
		assert.equal(res.status, 404);
		assert.equal(((await res.json()) as { error: string }).error, "FILE_NOT_FOUND");
	});
});

test("GET /api/files/:id/raw reports an unreadable file as 500, not 404", async () => {
	const owner = await makeUser();

	await withServer(async (baseUrl) => {
		const { body } = await upload(baseUrl, tokenFor(owner));
		//	A directory where the bytes should be: EISDIR rather than ENOENT.
		//	Chosen over chmod 000 because root ignores permission bits, and a
		//	test that quietly passes for one user and not another is worse than
		//	no test. The contrast with the case above is the whole point — the
		//	file is equally unservable, but this one is *our* fault.
		const stored = path.join(UPLOAD_DIR, await locationOf(body?.id as string));
		await unlink(stored);
		await mkdir(stored);

		//	The error handler logs "Unhandled error:" here on purpose. Noise in
		//	the test output, but that log line is the point of the finding: a
		//	404 would have produced no log at all.
		const res = await fetch(`${baseUrl}/api/files/${body?.id}/raw`);
		assert.equal(res.status, 500, "a broken volume must not masquerade as a missing file");
		assert.equal(((await res.json()) as { error: string }).error, "INTERNAL_ERROR");
	});
});

test("deleting an account takes its uploaded bytes with it", async () => {
	const owner = await makeUser();
	const admin = await makeUser(UserRole.admin);

	await withServer(async (baseUrl) => {
		const { body } = await upload(baseUrl, tokenFor(owner));
		const fileId = body?.id as string;
		const location = await locationOf(fileId);

		const { status } = await api(baseUrl, "DELETE", `/api/users/${owner.id}`, {
			token: tokenFor(admin),
		});
		assert.equal(status, 204);

		//	The cascade drops the row; the hook is what drops the bytes.
		assert.equal(await prisma.file.count({ where: { id: fileId } }), 0);
		assert.ok(!(await readdir(UPLOAD_DIR)).includes(location));
	});
});
