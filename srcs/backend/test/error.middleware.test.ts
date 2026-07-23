import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";

import { errorHandler } from "../src/middlewares/error.middleware.js";
import { throwError } from "../src/lib/http-error.js";

function makeTestApp() {
	const app = express();
	app.get("/http-error", () => {
		throwError(409, "CONFLICT", "conflict");
	});
	app.get("/unknown-error", () => {
		throw new Error("boom");
	});
	app.use(errorHandler);
	return app;
}

async function get(path: string) {
	const app = makeTestApp();
	const server = app.listen(0);
	const { port } = server.address() as AddressInfo;
	try {
		const res = await fetch(`http://localhost:${port}${path}`);
		return { status: res.status, body: await res.json() };
	} finally {
		server.close();
	}
}

test("errorHandler formats HttpError with its own status, code and message", async () => {
	const { status, body } = await get("/http-error");
	assert.equal(status, 409);
	assert.deepEqual(body, { error: "CONFLICT", message: "conflict" });
});

test("errorHandler falls back to 500 for unknown errors", async () => {
	const { status, body } = await get("/unknown-error");
	assert.equal(status, 500);
	assert.deepEqual(body, { error: "INTERNAL_ERROR", message: "Internal server error" });
});
