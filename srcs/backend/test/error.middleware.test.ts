import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";
import { z } from "zod";

import { errorHandler, notFoundHandler } from "../src/middlewares/error.middleware.js";
import { throwError } from "../src/lib/http-error.js";

const schema = z.object({ email: z.email(), age: z.number().int() });

function makeTestApp() {
	const app = express();
	// A 1kb ceiling so the oversize case does not need a megabyte of fixture.
	app.use(express.json({ limit: "1kb" }));
	app.get("/http-error", () => {
		throwError(409, "CONFLICT", "conflict");
	});
	app.get("/unknown-error", () => {
		throw new Error("boom");
	});
	app.get("/library-error", () => {
		throw Object.assign(new Error("internal detail that must not leak"), { status: 415 });
	});
	app.post("/validated", (req, _res) => {
		schema.parse(req.body);
	});
	app.use(notFoundHandler);
	app.use(errorHandler);
	return app;
}

interface ErrorBody {
	error: string;
	message: string;
	details?: { path: string; message: string }[];
}

async function request(
	path: string,
	options: RequestInit = {},
): Promise<{ status: number; body: ErrorBody }> {
	const app = makeTestApp();
	const server = app.listen(0);
	const { port } = server.address() as AddressInfo;
	try {
		const res = await fetch(`http://localhost:${port}${path}`, options);
		return { status: res.status, body: (await res.json()) as ErrorBody };
	} finally {
		server.close();
	}
}

const json = (body: string): RequestInit => ({
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body,
});

test("errorHandler formats HttpError with its own status, code and message", async () => {
	const { status, body } = await request("/http-error");
	assert.equal(status, 409);
	assert.deepEqual(body, { error: "CONFLICT", message: "conflict" });
});

test("errorHandler falls back to 500 for unknown errors", async () => {
	const { status, body } = await request("/unknown-error");
	assert.equal(status, 500);
	assert.deepEqual(body, { error: "INTERNAL_ERROR", message: "Internal server error" });
});

test("a ZodError becomes a 400 VALIDATION_ERROR carrying one detail per failed field", async () => {
	const { status, body } = await request("/validated", json('{"email":"nope","age":1.5}'));

	assert.equal(status, 400);
	assert.equal(body.error, "VALIDATION_ERROR");
	const details = body.details ?? [];
	assert.deepEqual(details.map((detail) => detail.path).sort(), ["age", "email"]);
	for (const detail of details) assert.ok(detail.message.length > 0);
});

test("details is absent on failures that are not validation failures", async () => {
	const { body } = await request("/http-error");
	assert.equal("details" in body, false);
});

test("a malformed JSON body is the caller's 400, not our 500", async () => {
	const { status, body } = await request("/validated", json("{not json"));
	assert.equal(status, 400);
	assert.equal(body.error, "MALFORMED_JSON");
});

test("a body over the parser limit is a 413, not a 500", async () => {
	const { status, body } = await request(
		"/validated",
		json(JSON.stringify({ a: "x".repeat(2000) })),
	);
	assert.equal(status, 413);
	assert.equal(body.error, "PAYLOAD_TOO_LARGE");
});

test("an unmatched route is a JSON 404, not Express's HTML page", async () => {
	const { status, body } = await request("/no-such-route");
	assert.equal(status, 404);
	assert.deepEqual(body, { error: "NOT_FOUND", message: "no route matches that path" });
});

test("a library error keeps its 4xx status but never leaks its message", async () => {
	const { status, body } = await request("/library-error");
	assert.equal(status, 415);
	assert.equal(body.error, "REQUEST_FAILED");
	assert.equal(body.message.includes("internal detail"), false);
});
