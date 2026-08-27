import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";
import jwt from "jsonwebtoken";

import { SECRET } from "../src/lib/env.js";
import { requireAuth, requireRole } from "../src/middlewares/auth.middleware.js";
import { errorHandler } from "../src/middlewares/error.middleware.js";
import { UserRole } from "../generated/prisma/client.js";

function makeTestApp() {
	const app = express();
	app.get("/protected", requireAuth, (req, res) => {
		res.json({ userId: req.user?.id });
	});
	app.get("/admin-only", requireAuth, requireRole(UserRole.admin), (_req, res) => {
		res.json({ ok: true });
	});
	app.use(errorHandler);
	return app;
}

async function request(path: string, headers: Record<string, string> = {}) {
	const app = makeTestApp();
	const server = app.listen(0);
	const { port } = server.address() as AddressInfo;
	try {
		const res = await fetch(`http://localhost:${port}${path}`, { headers });
		return {
			status: res.status,
			body: (await res.json()) as { error?: string; message?: string; userId?: number },
		};
	} finally {
		server.close();
	}
}

const requestProtected = (headers: Record<string, string> = {}) => request("/protected", headers);

const bearer = (role: UserRole) => ({
	Authorization: `Bearer ${jwt.sign({ userId: 42, role }, SECRET, {
		algorithm: "HS256",
		expiresIn: "15m",
	})}`,
});

test("requireAuth rejects missing Authorization header", async () => {
	const { status, body } = await requestProtected();
	assert.equal(status, 401);
	assert.equal(body.error, "MISSING_TOKEN");
	assert.equal(body.message, "Missing or malformed Authorization header");
});

test("requireAuth rejects malformed Authorization header (no Bearer prefix)", async () => {
	const { status } = await requestProtected({ Authorization: "abc123" });
	assert.equal(status, 401);
});

test("requireAuth rejects an invalid token", async () => {
	const { status, body } = await requestProtected({ Authorization: "Bearer not-a-real-token" });
	assert.equal(status, 401);
	assert.equal(body.error, "INVALID_TOKEN");
	assert.equal(body.message, "Invalid token");
});

test("requireAuth rejects an expired token", async () => {
	const expired = jwt.sign({ userId: 1, role: UserRole.artist }, SECRET, {
		algorithm: "HS256",
		expiresIn: -10,
	});
	const { status, body } = await requestProtected({ Authorization: `Bearer ${expired}` });
	assert.equal(status, 401);
	assert.equal(body.error, "TOKEN_EXPIRED");
	assert.equal(body.message, "Token expired");
});

test("requireAuth accepts a valid token and attaches req.user", async () => {
	const token = jwt.sign({ userId: 42, role: UserRole.artist }, SECRET, {
		algorithm: "HS256",
		expiresIn: "15m",
	});
	const { status, body } = await requestProtected({ Authorization: `Bearer ${token}` });
	assert.equal(status, 200);
	assert.deepEqual(body, { userId: 42 });
});

test("requireRole rejects an unauthenticated caller with the standard error shape", async () => {
	const { status, body } = await request("/admin-only");
	assert.equal(status, 401);
	assert.equal(body.error, "MISSING_TOKEN");
});

test("requireRole rejects a caller whose role is not allowed", async () => {
	const { status, body } = await request("/admin-only", bearer(UserRole.artist));
	assert.equal(status, 403);
	assert.equal(body.error, "FORBIDDEN");
	assert.equal(body.message, "insufficient permissions");
});

test("requireRole admits a caller whose role is allowed", async () => {
	const { status } = await request("/admin-only", bearer(UserRole.admin));
	assert.equal(status, 200);
});
