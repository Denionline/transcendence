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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Boot the real app on a random free port for one test, then always close it.
// `app.listen(0)` lets the OS pick an open port, so test files never collide.
async function withServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
	const server = app.listen(0);
	const { port } = server.address() as AddressInfo;
	try {
		return await run(`http://localhost:${port}`);
	} finally {
		server.close();
	}
}

// Sign a JWT the way the login flow would, so requireAuth accepts it. This is
// how a test "becomes" a given user/role without going through register/login.
function tokenFor(user: { id: string; role: UserRole }): string {
	return jwt.sign({ userId: user.id, role: user.role }, SECRET, {
		algorithm: "HS256",
		expiresIn: "15m",
	});
}

// Every user this suite creates is tracked here and deleted at the end, so the
// shared database is left clean even if an assertion fails mid-test.
const createdUserIds: string[] = [];

async function makeUser(role: UserRole = UserRole.artist) {
	const user = await prisma.user.create({
		data: {
			email: `users-test-${crypto.randomUUID()}@test.local`,
			username: "users-test",
			role,
		},
	});
	createdUserIds.push(user.id);
	return user;
}

// A tiny fetch wrapper: sets the auth header, JSON-encodes the body, and
// tolerates an empty response body (204 No Content has none).
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

after(async () => {
	await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
	await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// Task 1 — list users (paginated), admin only
// ---------------------------------------------------------------------------

test("GET /api/users returns the paginated envelope { items, page, pageSize, total }", async () => {
	const admin = await makeUser(UserRole.admin);
	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "GET", "/api/users?page=1&pageSize=5", {
			token: tokenFor(admin),
		});
		assert.equal(status, 200);
		assert.ok(Array.isArray(body?.items), "items should be an array");
		assert.equal(body?.page, 1);
		assert.equal(body?.pageSize, 5);
		assert.equal(typeof body?.total, "number");
		assert.ok((body?.items as unknown[]).length <= 5, "page must not exceed pageSize");
	});
});

test("GET /api/users clamps an oversized pageSize to the maximum (100)", async () => {
	const admin = await makeUser(UserRole.admin);
	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "GET", "/api/users?pageSize=99999", {
			token: tokenFor(admin),
		});
		assert.equal(status, 200);
		assert.equal(body?.pageSize, 100);
	});
});

test("GET /api/users is forbidden for a non-admin", async () => {
	const artist = await makeUser(UserRole.artist);
	await withServer(async (baseUrl) => {
		const { status } = await api(baseUrl, "GET", "/api/users", { token: tokenFor(artist) });
		assert.equal(status, 403);
	});
});

// ---------------------------------------------------------------------------
// Task 2 — get one user's detail
// ---------------------------------------------------------------------------

test("GET /api/users/:id lets an admin read anyone, without leaking passwordHash", async () => {
	const admin = await makeUser(UserRole.admin);
	const other = await makeUser(UserRole.hirer);
	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "GET", `/api/users/${other.id}`, {
			token: tokenFor(admin),
		});
		assert.equal(status, 200);
		assert.equal(body?.id, other.id);
		assert.equal("passwordHash" in (body as object), false, "must never return passwordHash");
	});
});

test("GET /api/users/:id forbids a non-admin from reading someone else", async () => {
	const artist = await makeUser(UserRole.artist);
	const other = await makeUser(UserRole.artist);
	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "GET", `/api/users/${other.id}`, {
			token: tokenFor(artist),
		});
		assert.equal(status, 403);
		assert.equal(body?.error, "FORBIDDEN");
	});
});

test("GET /api/users/:id returns 404 for an unknown id", async () => {
	const admin = await makeUser(UserRole.admin);
	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "GET", `/api/users/${crypto.randomUUID()}`, {
			token: tokenFor(admin),
		});
		assert.equal(status, 404);
		assert.equal(body?.error, "USER_NOT_FOUND");
	});
});

// ---------------------------------------------------------------------------
// Task 3 — update a user (guards)
// ---------------------------------------------------------------------------

test("PUT /api/users/:id lets a user edit their own username", async () => {
	const artist = await makeUser(UserRole.artist);
	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "PUT", `/api/users/${artist.id}`, {
			token: tokenFor(artist),
			body: { username: "renamed" },
		});
		assert.equal(status, 200);
		assert.equal(body?.username, "renamed");
	});
});

test("PUT /api/users/:id forbids a non-admin from changing role", async () => {
	const artist = await makeUser(UserRole.artist);
	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "PUT", `/api/users/${artist.id}`, {
			token: tokenFor(artist),
			body: { role: UserRole.admin },
		});
		assert.equal(status, 403);
		assert.equal(body?.error, "FORBIDDEN");
	});
});

test("PUT /api/users/:id blocks an admin from demoting themselves (409 SELF_DEMOTE)", async () => {
	const admin = await makeUser(UserRole.admin);
	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "PUT", `/api/users/${admin.id}`, {
			token: tokenFor(admin),
			body: { role: UserRole.artist },
		});
		assert.equal(status, 409);
		assert.equal(body?.error, "SELF_DEMOTE");
	});
});

// ---------------------------------------------------------------------------
// Task 4 — delete a user (hard delete + guards)
// ---------------------------------------------------------------------------

test("DELETE /api/users/:id lets an admin delete another user (204, then gone)", async () => {
	const admin = await makeUser(UserRole.admin);
	const victim = await makeUser(UserRole.artist);
	await withServer(async (baseUrl) => {
		const { status } = await api(baseUrl, "DELETE", `/api/users/${victim.id}`, {
			token: tokenFor(admin),
		});
		assert.equal(status, 204);
		const stillThere = await prisma.user.findUnique({ where: { id: victim.id } });
		assert.equal(stillThere, null, "user should be hard-deleted");
	});
});

test("DELETE /api/users/:id blocks an admin from deleting themselves (409 SELF_DELETE)", async () => {
	const admin = await makeUser(UserRole.admin);
	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "DELETE", `/api/users/${admin.id}`, {
			token: tokenFor(admin),
		});
		assert.equal(status, 409);
		assert.equal(body?.error, "SELF_DELETE");
	});
});

test("DELETE /api/users/:id hard-deletes and cascades the user's refresh tokens", async () => {
	const admin = await makeUser(UserRole.admin);
	const victim = await makeUser(UserRole.artist);
	await prisma.refreshToken.create({
		data: {
			userId: victim.id,
			tokenHash: crypto.randomUUID(),
			expiresAt: new Date(Date.now() + 60_000),
		},
	});

	await withServer(async (baseUrl) => {
		// 1. Admin deletes the victim.
		const { status } = await api(baseUrl, "DELETE", `/api/users/${victim.id}`, {
			token: tokenFor(admin),
		});
		assert.equal(status, 204);

		// 2. The user row itself is gone (hard delete, not a soft flag).
		const stillThere = await prisma.user.findUnique({ where: { id: victim.id } });
		assert.equal(stillThere, null, "user should be hard-deleted");

		// 3. The cascade fired: the child refresh-token row went with it. Without
		//    onDelete: Cascade in schema.prisma, the delete in step 1 would have
		//    thrown a foreign-key error instead of ever reaching here.
		const remainingTokens = await prisma.refreshToken.count({
			where: { userId: victim.id },
		});
		assert.equal(remainingTokens, 0, "refresh tokens should cascade-delete with the user");
	});
});
