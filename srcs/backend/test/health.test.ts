import "dotenv/config"
import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";

import app from "../src/app.js";

// Boots the app on an ephemeral port and hits the real routes so the CI test
// job exercises the running server, not just imports.
test("GET /health responds with { status: 'ok' }", async () => {
	const server = app.listen(0);
	const address = server.address() as AddressInfo;
	const { port } = address;
	try {
		const res = await fetch(`http://localhost:${port}/health`);
		assert.equal(res.status, 200);
		assert.deepEqual(await res.json(), { status: "ok" });
	} finally {
		server.close();
	}
});

