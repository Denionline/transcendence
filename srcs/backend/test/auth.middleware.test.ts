import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";
import jwt from "jsonwebtoken";

import { SECRET } from "../src/lib/env.js";
import { verifyToken } from "../src/middlewares/auth.middleware.js";
import { errorHandler } from "../src/middlewares/error.middleware.js";
import { UserRole } from "../generated/prisma/client.js";

function makeTestApp() {
	const app = express();
	app.get("/protected", verifyToken, (req, res) => {
		res.json({ userId: req.user?.userId });
	});
	app.use(errorHandler);
	return app;
}

async function requestProtected(headers: Record<string, string> = {}) {
	const app = makeTestApp();
	const server = app.listen(0);
	const { port } = server.address() as AddressInfo;
	try {
		const res = await fetch(`http://localhost:${port}/protected`, { headers });
		return { status: res.status, body: await res.json() };
	} finally {
		server.close();
	}
}

test("verifyToken rejects missing Authorization header", async () => {
	const { status, body } = await requestProtected();
	assert.equal(status, 401);
	assert.equal(body.error, "Missing or malformed Authorization header");
});

test("verifyToken rejects malformed Authorization header (no Bearer prefix)", async () => {
	const { status } = await requestProtected({ Authorization: "abc123" });
	assert.equal(status, 401);
});

test("verifyToken rejects an invalid token", async () => {
	const { status, body } = await requestProtected({ Authorization: "Bearer not-a-real-token" });
	assert.equal(status, 401);
	assert.equal(body.error, "Invalid token");
});

test("verifyToken rejects an expired token", async () => {
	const expired = jwt.sign({ userId: 1, role: UserRole.artist }, SECRET, {
		algorithm: "HS256",
		expiresIn: -10,
	});
	const { status, body } = await requestProtected({ Authorization: `Bearer ${expired}` });
	assert.equal(status, 401);
	assert.equal(body.error, "Token expired");
});

test("verifyToken accepts a valid token and attaches req.user", async () => {
	const token = jwt.sign({ userId: 42, role: UserRole.artist }, SECRET, {
		algorithm: "HS256",
		expiresIn: "15m",
	});
	const { status, body } = await requestProtected({ Authorization: `Bearer ${token}` });
	assert.equal(status, 200);
	assert.deepEqual(body, { userId: 42 });
});
