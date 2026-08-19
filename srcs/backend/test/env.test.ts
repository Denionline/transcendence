import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";

//	src/lib/env.ts reads process.env once, at import time, so each case needs a
//	genuinely fresh module instance. A unique query string is the ESM way to
//	defeat the module cache — there is no `delete require.cache` here.
let instance = 0;
async function loadEnv(overrides: Record<string, string | undefined>) {
	const saved: Record<string, string | undefined> = {};
	for (const [key, value] of Object.entries(overrides)) {
		saved[key] = process.env[key];
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
	try {
		return (await import(
			`../src/lib/env.js?case=${(instance += 1)}`
		)) as typeof import("../src/lib/env.js");
	} finally {
		for (const [key, value] of Object.entries(saved)) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	}
}

//	The regression these guard: .env.example ships every key with an empty
//	value and the README says to copy it, so "" is the value a fresh clone
//	actually produces. `??` passes it straight through.
test("UPLOAD_DIR falls back when empty, not just when absent", async () => {
	assert.equal((await loadEnv({ UPLOAD_DIR: "" })).UPLOAD_DIR, "/app/uploads");
	assert.equal((await loadEnv({ UPLOAD_DIR: "   " })).UPLOAD_DIR, "/app/uploads");
	assert.equal((await loadEnv({ UPLOAD_DIR: undefined })).UPLOAD_DIR, "/app/uploads");
});

test("UPLOAD_DIR keeps a real value, trimmed", async () => {
	assert.equal((await loadEnv({ UPLOAD_DIR: "  /var/artmate  " })).UPLOAD_DIR, "/var/artmate");
});

test("MAX_UPLOAD_MB falls back when empty, not just when absent", async () => {
	assert.equal((await loadEnv({ MAX_UPLOAD_MB: "" })).MAX_UPLOAD_MB, 50);
	assert.equal((await loadEnv({ MAX_UPLOAD_MB: undefined })).MAX_UPLOAD_MB, 50);
});

test("MAX_UPLOAD_MB keeps a real value", async () => {
	assert.equal((await loadEnv({ MAX_UPLOAD_MB: "10" })).MAX_UPLOAD_MB, 10);
});

//	A typo is not an absence: silently defaulting would hide it, and silently
//	accepting it gives NaN (limit never fires) or 0 (nothing uploads at all).
test("MAX_UPLOAD_MB rejects values that are not positive numbers", async () => {
	for (const bad of ["abc", "0", "-5", "NaN"])
		await assert.rejects(
			() => loadEnv({ MAX_UPLOAD_MB: bad }),
			/MAX_UPLOAD_MB must be a positive number/,
			`expected "${bad}" to be rejected`,
		);
});
