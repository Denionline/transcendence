import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";

import { rateLimit } from "../src/middlewares/rate-limit.middleware.js";
import { errorHandler } from "../src/middlewares/error.middleware.js";

function makeTestApp(options: { windowMs: number; max: number }) {
	const app = express();
	app.post("/login", rateLimit(options), (_req, res) => {
		res.json({ ok: true });
	});
	app.use(errorHandler);
	return app;
}

async function hammer(times: number, options = { windowMs: 60_000, max: 3 }) {
	const server = makeTestApp(options).listen(0);
	const { port } = server.address() as AddressInfo;
	try {
		const responses = [];
		for (let i = 0; i < times; i++) {
			const res = await fetch(`http://localhost:${port}/login`, { method: "POST" });
			responses.push({
				status: res.status,
				retryAfter: res.headers.get("retry-after"),
				body: (await res.json()) as { error?: string },
			});
		}
		return responses;
	} finally {
		server.close();
	}
}

test("rateLimit lets through exactly `max` requests per window", async () => {
	const responses = await hammer(4);
	assert.deepEqual(
		responses.map((r) => r.status),
		[200, 200, 200, 429],
	);
});

test("rateLimit answers 429 TOO_MANY_REQUESTS with a Retry-After header", async () => {
	const [blocked] = (await hammer(4)).slice(-1);
	assert.equal(blocked.status, 429);
	assert.equal(blocked.body.error, "TOO_MANY_REQUESTS");
	assert.ok(Number(blocked.retryAfter) > 0, "expected a positive Retry-After");
});

test("rateLimit starts a fresh window once the old one has elapsed", async () => {
	const responses = await hammer(4, { windowMs: 1, max: 3 });
	assert.deepEqual(
		responses.map((r) => r.status),
		[200, 200, 200, 200],
		"a 1ms window expires between requests, so nothing should be blocked",
	);
});
