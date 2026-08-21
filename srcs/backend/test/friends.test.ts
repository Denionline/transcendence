import "./setup.js";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";

import app from "../src/app.js";
import { SECRET } from "../src/lib/env.js";
import { prisma } from "../src/lib/prisma.js";
import { UserRole } from "../generated/prisma/client.js";

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
	return jwt.sign({ userId: user.id, role: user.role, sessionId: crypto.randomUUID() }, SECRET, {
		algorithm: "HS256",
		expiresIn: "15m",
	});
}

async function api(
	baseUrl: string,
	method: string,
	path: string,
	options: { token?: string; body?: unknown } = {},
) {
	const headers: Record<string, string> = { "Content-Type": "application/json" };
	if (options.token) headers.Authorization = `Bearer ${options.token}`;

	const res = await fetch(`${baseUrl}${path}`, {
		method,
		headers,
		body: options.body === undefined ? undefined : JSON.stringify(options.body),
	});

	const text = await res.text();
	const json = text ? (JSON.parse(text) as Record<string, unknown>) : null;
	return { status: res.status, body: json };
}

const createdUserIds: string[] = [];

after(async () => {
	await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
	await prisma.$disconnect();
});

async function makeUser(role: UserRole = UserRole.artist, username = "friends-test") {
	const user = await prisma.user.create({
		data: {
			email: `friends-test-${crypto.randomUUID()}@test.local`,
			username,
			role,
		},
	});
	createdUserIds.push(user.id);
	return user;
}

test("POST /api/friends/:id sends a request", async () => {
	const a = await makeUser();
	const b = await makeUser();

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "POST", `/api/friends/${b.id}`, {
			token: tokenFor(a),
		});
		assert.equal(status, 201);
		assert.equal(body?.userId, a.id);
		assert.equal(body?.friendId, b.id);
		assert.equal(body?.status, "pending");
	});
});

test("POST /api/friends/:id rejects self-invite (400 VALIDATION_ERROR)", async () => {
	const a = await makeUser();

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "POST", `/api/friends/${a.id}`, {
			token: tokenFor(a),
		});
		assert.equal(status, 400);
		assert.equal(body?.error, "VALIDATION_ERROR");
	});
});

test("POST /api/friends/:id rejects an admin caller (403 FORBIDDEN)", async () => {
	const admin = await makeUser(UserRole.admin);
	const b = await makeUser();

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "POST", `/api/friends/${b.id}`, {
			token: tokenFor(admin),
		});
		assert.equal(status, 403);
		assert.equal(body?.error, "FORBIDDEN");
	});
});

test("POST /api/friends/:id on an unknown user (404 USER_NOT_FOUND)", async () => {
	const a = await makeUser();

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "POST", "/api/friends/does-not-exist", {
			token: tokenFor(a),
		});
		assert.equal(status, 404);
		assert.equal(body?.error, "USER_NOT_FOUND");
	});
});

test("POST /api/friends/:id twice, same direction (409 FRIEND_REQUEST_EXISTS)", async () => {
	const a = await makeUser();
	const b = await makeUser();

	await withServer(async (baseUrl) => {
		await api(baseUrl, "POST", `/api/friends/${b.id}`, { token: tokenFor(a) });
		const { status, body } = await api(baseUrl, "POST", `/api/friends/${b.id}`, {
			token: tokenFor(a),
		});
		assert.equal(status, 409);
		assert.equal(body?.error, "FRIEND_REQUEST_EXISTS");
	});
});

test("POST /api/friends/:id when the reverse request already exists (409 FRIEND_REQUEST_EXISTS)", async () => {
	const a = await makeUser();
	const b = await makeUser();

	await withServer(async (baseUrl) => {
		// b already invited a
		await api(baseUrl, "POST", `/api/friends/${a.id}`, { token: tokenFor(b) });
		// a tries to invite b back
		const { status, body } = await api(baseUrl, "POST", `/api/friends/${b.id}`, {
			token: tokenFor(a),
		});
		assert.equal(status, 409);
		assert.equal(body?.error, "FRIEND_REQUEST_EXISTS");
	});
});

test("PATCH /api/friends/:id accepts a pending request", async () => {
	const a = await makeUser();
	const b = await makeUser();

	await withServer(async (baseUrl) => {
		await api(baseUrl, "POST", `/api/friends/${b.id}`, { token: tokenFor(a) });
		// b (the recipient) accepts the request sent by a
		const { status, body } = await api(baseUrl, "PATCH", `/api/friends/${a.id}`, {
			token: tokenFor(b),
			body: { accepted: true },
		});
		assert.equal(status, 200);
		assert.equal(body?.status, "accepted");
	});
});

test("PATCH /api/friends/:id declines a pending request", async () => {
	const a = await makeUser();
	const b = await makeUser();

	await withServer(async (baseUrl) => {
		await api(baseUrl, "POST", `/api/friends/${b.id}`, { token: tokenFor(a) });
		const { status, body } = await api(baseUrl, "PATCH", `/api/friends/${a.id}`, {
			token: tokenFor(b),
			body: { accepted: false },
		});
		assert.equal(status, 200);
		assert.equal(body?.status, "declined");
	});
});

test("PATCH /api/friends/:id rejects a non-boolean body (400 VALIDATION_ERROR)", async () => {
	const a = await makeUser();
	const b = await makeUser();

	await withServer(async (baseUrl) => {
		await api(baseUrl, "POST", `/api/friends/${b.id}`, { token: tokenFor(a) });
		const { status, body } = await api(baseUrl, "PATCH", `/api/friends/${a.id}`, {
			token: tokenFor(b),
			body: { accepted: "yes" },
		});
		assert.equal(status, 400);
		assert.equal(body?.error, "VALIDATION_ERROR");
	});
});

test("PATCH /api/friends/:id with no matching request (404 FRIEND_REQUEST_NOT_FOUND)", async () => {
	const a = await makeUser();
	const b = await makeUser();

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "PATCH", `/api/friends/${a.id}`, {
			token: tokenFor(b),
			body: { accepted: true },
		});
		assert.equal(status, 404);
		assert.equal(body?.error, "FRIEND_REQUEST_NOT_FOUND");
	});
});

test("PATCH /api/friends/:id: the sender cannot accept their own request (404, not the recipient)", async () => {
	const a = await makeUser();
	const b = await makeUser();

	await withServer(async (baseUrl) => {
		await api(baseUrl, "POST", `/api/friends/${b.id}`, { token: tokenFor(a) });
		// a (the sender) tries to "accept" — there's no request FROM b TO a
		const { status, body } = await api(baseUrl, "PATCH", `/api/friends/${b.id}`, {
			token: tokenFor(a),
			body: { accepted: true },
		});
		assert.equal(status, 404);
		assert.equal(body?.error, "FRIEND_REQUEST_NOT_FOUND");
	});
});

test("DELETE /api/friends/:id cancels a request from the sender's side", async () => {
	const a = await makeUser();
	const b = await makeUser();

	await withServer(async (baseUrl) => {
		await api(baseUrl, "POST", `/api/friends/${b.id}`, { token: tokenFor(a) });
		const { status } = await api(baseUrl, "DELETE", `/api/friends/${b.id}`, { token: tokenFor(a) });
		assert.equal(status, 204);
	});

	assert.equal(
		await prisma.friend.findFirst({ where: { userId: a.id, friendId: b.id } }),
		null,
	);
});

test("DELETE /api/friends/:id unfriends from the recipient's side too", async () => {
	const a = await makeUser();
	const b = await makeUser();

	await withServer(async (baseUrl) => {
		await api(baseUrl, "POST", `/api/friends/${b.id}`, { token: tokenFor(a) });
		await api(baseUrl, "PATCH", `/api/friends/${a.id}`, {
			token: tokenFor(b),
			body: { accepted: true },
		});
		// b was the recipient of the original request, not the sender — must still work
		const { status } = await api(baseUrl, "DELETE", `/api/friends/${a.id}`, { token: tokenFor(b) });
		assert.equal(status, 204);
	});

	assert.equal(
		await prisma.friend.findFirst({ where: { userId: a.id, friendId: b.id } }),
		null,
	);
});

test("DELETE /api/friends/:id with no relation (404 FRIEND_NOT_FOUND)", async () => {
	const a = await makeUser();
	const b = await makeUser();

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "DELETE", `/api/friends/${b.id}`, {
			token: tokenFor(a),
		});
		assert.equal(status, 404);
		assert.equal(body?.error, "FRIEND_NOT_FOUND");
	});
});

test("GET /api/friends lists confirmed friends, normalized to the other user", async () => {
	const a = await makeUser(UserRole.artist, "friends-test-a");
	const b = await makeUser(UserRole.artist, "friends-test-b");

	await withServer(async (baseUrl) => {
		await api(baseUrl, "POST", `/api/friends/${b.id}`, { token: tokenFor(a) });
		await api(baseUrl, "PATCH", `/api/friends/${a.id}`, {
			token: tokenFor(b),
			body: { accepted: true },
		});

		// Both sides should see each other, even though a was the original sender.
		const forA = await api(baseUrl, "GET", "/api/friends", { token: tokenFor(a) });
		assert.equal(forA.status, 200);
		const itemsA = forA.body!.items as Record<string, unknown>[];
		assert.ok(itemsA.some((item) => item.id === b.id && item.displayName === "friends-test-b"));

		const forB = await api(baseUrl, "GET", "/api/friends", { token: tokenFor(b) });
		const itemsB = forB.body!.items as Record<string, unknown>[];
		assert.ok(itemsB.some((item) => item.id === a.id && item.displayName === "friends-test-a"));
	});
});

test("GET /api/friends excludes pending (not yet accepted) requests", async () => {
	const a = await makeUser();
	const b = await makeUser();

	await withServer(async (baseUrl) => {
		await api(baseUrl, "POST", `/api/friends/${b.id}`, { token: tokenFor(a) });

		const { body } = await api(baseUrl, "GET", "/api/friends", { token: tokenFor(a) });
		const items = body!.items as Record<string, unknown>[];
		assert.ok(!items.some((item) => item.id === b.id));
	});
});

test("GET /api/friends requires authentication (401 without a token)", async () => {
	await withServer(async (baseUrl) => {
		const { status } = await api(baseUrl, "GET", "/api/friends");
		assert.equal(status, 401);
	});
});
