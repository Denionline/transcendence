import "./setup.js";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { rm } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";

import app from "../src/app.js";
import { SECRET, UPLOAD_DIR } from "../src/lib/env.js";
import { prisma } from "../src/lib/prisma.js";
import { RAW_MAX_PER_MINUTE } from "../src/modules/files/files.routes.js";
import { UserRole } from "../generated/prisma/client.js";

//	Its own file: the limiter's bucket Map lives at module scope, and
//	node:test gives each file a fresh process, not each test. Same reasoning
//	as test/auth.login-attempts.test.ts.

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

test("GET /api/files/:id/raw is rate limited", async () => {
	const user = await prisma.user.create({
		data: {
			email: `raw-limit-${crypto.randomUUID()}@test.local`,
			username: "raw-limit-test",
			role: UserRole.artist,
		},
	});
	createdUserIds.push(user.id);
	const token = jwt.sign({ userId: user.id, role: user.role }, SECRET, {
		algorithm: "HS256",
		expiresIn: "15m",
	});

	const server = app.listen(0);
	const { port } = server.address() as AddressInfo;
	const baseUrl = `http://localhost:${port}`;

	try {
		const form = new FormData();
		form.append("file", new Blob([new Uint8Array(PNG)], { type: "image/png" }), "cat.png");
		const created = await fetch(`${baseUrl}/api/files`, {
			method: "POST",
			headers: { Authorization: `Bearer ${token}` },
			body: form,
		});
		assert.equal(created.status, 201);
		const { id } = (await created.json()) as { id: string };
		const rawUrl = `${baseUrl}/api/files/${id}/raw`;

		//	The upload does not touch this bucket, only /raw does. Batched so the
		//	runtime is not holding 600 open sockets.
		let served = 0;
		for (let sent = 0; sent < RAW_MAX_PER_MINUTE; sent += 50) {
			const batch = await Promise.all(
				Array.from({ length: 50 }, () => fetch(rawUrl).then((res) => res.status)),
			);
			served += batch.filter((status) => status === 200).length;
		}
		assert.equal(served, RAW_MAX_PER_MINUTE, "every request inside the budget should be served");

		const refused = await fetch(rawUrl);
		assert.equal(refused.status, 429);
		assert.equal(((await refused.json()) as { error: string }).error, "TOO_MANY_REQUESTS");

		const retryAfter = Number(refused.headers.get("Retry-After"));
		assert.ok(
			retryAfter > 0 && retryAfter <= 60,
			`Retry-After should be within the 60s window, got ${retryAfter}`,
		);
	} finally {
		server.close();
	}
});
