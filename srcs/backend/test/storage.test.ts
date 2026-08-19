import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { resolveKey } from "../src/lib/storage.js";
import { UPLOAD_DIR } from "../src/lib/env.js";
import { HttpError } from "../src/lib/http-error.js";

//	resolveKey is what stands between a `File` row and an arbitrary path on
//	disk. It is called with a value out of the database, which is only ever
//	as trustworthy as whatever wrote it.
const ROOT = path.resolve(UPLOAD_DIR);

function refusal(error: unknown): boolean {
	assert.ok(error instanceof HttpError);
	assert.equal(error.status, 400);
	assert.equal(error.code, "INVALID_PATH");
	return true;
}

test("resolveKey accepts a normal stored location", () => {
	const location = "0f2f8c6a-2b1e-4f7a-9d3c-5e8a1b2c3d4e.png";
	assert.equal(resolveKey(location), path.join(ROOT, location));
});

//	Each of these resolves outside the upload directory, which is why the
//	guard resolves before comparing: a check on the raw string would wave
//	every one of them through.
test("resolveKey refuses anything that escapes the upload directory", () => {
	for (const location of [
		"../secret.png",
		"../../etc/passwd",
		"a/../../escaped.png",
		"/etc/passwd",
		"./../../escaped.png",
	])
		assert.throws(() => resolveKey(location), refusal, `${location} should be refused`);
});

//	Why the guard compares against `ROOT + path.sep` and not `ROOT`: a
//	sibling whose name merely starts with the root's is a different
//	directory, and a bare startsWith(ROOT) would consider it contained.
test("resolveKey refuses a sibling directory sharing the root's name prefix", () => {
	const sibling = path.join("..", `${path.basename(ROOT)}-evil`, "file.png");
	assert.throws(() => resolveKey(sibling), refusal);
});

//	These resolve to the upload directory itself, which is not a file, so an
//	empty `location` would reach fs and come back EISDIR — a 500 for what is
//	really a malformed row.
test("resolveKey refuses a location naming the upload directory itself", () => {
	for (const location of ["", ".", "./", "/", ".."])
		assert.throws(
			() => resolveKey(location),
			refusal,
			`${JSON.stringify(location)} should be refused`,
		);
});
