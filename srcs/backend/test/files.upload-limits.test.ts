import "./setup.js";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { rm } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";

import { prisma } from "../src/lib/prisma.js";
import { UserRole } from "../generated/prisma/client.js";

//	Its own file for the same reason as test/files.raw-limit.test.ts — the
//	limiter's bucket Map lives at module scope, and node:test gives each file
//	a fresh process, not each test.
//
//	MAX_UPLOAD_MB is read once, at import time. Overriding it here rather
//	than shipping a >50 MB body also proves the variable is actually wired to
//	multer. The dynamic imports below are load-bearing: ESM hoists every
//	static import above the module body, so a plain import of ../src/app.js
//	would run env.ts before this assignment executed.
const CAP_MB = 1;
process.env.MAX_UPLOAD_MB = String(CAP_MB);

const { default: app } = await import("../src/app.js");
const { SECRET, UPLOAD_DIR, MAX_UPLOAD_MB } = await import("../src/lib/env.js");
const { UPLOAD_MAX_PER_WINDOW, UPLOAD_WINDOW_MS } =
	await import("../src/modules/files/files.routes.js");

const PNG = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
	"base64",
);

const createdUserIds: string[] = [];

after(async () => {
	await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
	await prisma.$disconnect();
	await rm(UPLOAD_DIR, { recursive: true, force: true });
});

async function makeUser() {
	const user = await prisma.user.create({
		data: {
			email: `upload-limits-${crypto.randomUUID()}@test.local`,
			username: "upload-limits-test",
			role: UserRole.artist,
		},
	});
	createdUserIds.push(user.id);
	return user;
}

function tokenFor(user: { id: string; role: UserRole }): string {
	return jwt.sign({ userId: user.id, role: user.role }, SECRET, {
		algorithm: "HS256",
		expiresIn: "15m",
	});
}

async function withServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
	const server = app.listen(0);
	const { port } = server.address() as AddressInfo;
	try {
		return await run(`http://localhost:${port}`);
	} finally {
		server.close();
	}
}

async function upload(baseUrl: string, token: string, bytes: Buffer = PNG) {
	const form = new FormData();
	form.append("file", new Blob([new Uint8Array(bytes)], { type: "image/png" }), "cat.png");
	return await fetch(`${baseUrl}/api/files`, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}` },
		body: form,
	});
}

//	Guards the override itself. If a refactor moved MAX_UPLOAD_MB to a lazy
//	read, the two tests below would still pass at 50 MB by never tripping
//	either limit, and would quietly stop testing anything.
test("the suite really is running under a lowered upload cap", () => {
	assert.equal(MAX_UPLOAD_MB, CAP_MB);
});

test("a body over MAX_UPLOAD_MB is refused with 413, not buffered", async () => {
	const user = await makeUser();

	await withServer(async (baseUrl) => {
		//	Twice the global cap and still under the 5 MB per-type cap for images,
		//	so a 413 here can only have come from multer's mid-stream limit.
		const oversized = Buffer.alloc(2 * CAP_MB * 1024 * 1024);
		const res = await upload(baseUrl, tokenFor(user), oversized);

		assert.equal(res.status, 413);
		const body = (await res.json()) as { error: string; message: string };
		assert.equal(body.error, "FILE_TOO_LARGE");
		assert.match(body.message, new RegExp(`${CAP_MB} MB`));

		//	Bytes are written before the row, so a row here would mean a leaked
		//	file too.
		const rows = await prisma.file.count({ where: { ownerId: user.id } });
		assert.equal(rows, 0, "a rejected upload must leave no row behind");
	});
});

test("POST /api/files is rate limited per user", async () => {
	//	A second user: the limiter runs before multer, so even the refused
	//	upload above spent one of the first user's tokens. That is deliberate —
	//	otherwise oversized bodies would be an unmetered way to make the server
	//	work.
	const user = await makeUser();
	const token = tokenFor(user);

	await withServer(async (baseUrl) => {
		let accepted = 0;
		for (let sent = 0; sent < UPLOAD_MAX_PER_WINDOW; sent += 1) {
			const res = await upload(baseUrl, token);
			if (res.status === 201) accepted += 1;
		}
		assert.equal(
			accepted,
			UPLOAD_MAX_PER_WINDOW,
			"every upload inside the budget should be accepted",
		);

		const refused = await upload(baseUrl, token);
		assert.equal(refused.status, 429);
		assert.equal(((await refused.json()) as { error: string }).error, "TOO_MANY_REQUESTS");

		const retryAfter = Number(refused.headers.get("Retry-After"));
		assert.ok(
			retryAfter > 0 && retryAfter <= UPLOAD_WINDOW_MS / 1000,
			`Retry-After should be within the ${UPLOAD_WINDOW_MS / 1000}s window, got ${retryAfter}`,
		);

		//	The budget is per user, not global. Worth pinning: keying on the
		//	address instead would put every user behind one NAT in the same bucket.
		const other = await makeUser();
		const spared = await upload(baseUrl, tokenFor(other));
		assert.equal(spared.status, 201);
	});
});
