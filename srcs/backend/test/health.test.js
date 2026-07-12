import test from "node:test";
import assert from "node:assert/strict";

import app from "../index.js";

// Boots the app on an ephemeral port and hits the real routes so the CI test
// job exercises the running server, not just imports.
test("GET /health responds with { status: 'ok' }", async () => {
	const server = app.listen(0);
	const { port } = server.address();
	try {
		const res = await fetch(`http://localhost:${port}/health`);
		assert.equal(res.status, 200);
		assert.deepEqual(await res.json(), { status: "ok" });
	} finally {
		server.close();
	}
});

test("GET / responds with 200", async () => {
	const server = app.listen(0);
	const { port } = server.address();
	try {
		const res = await fetch(`http://localhost:${port}/`);
		assert.equal(res.status, 200);
	} finally {
		server.close();
	}
});
