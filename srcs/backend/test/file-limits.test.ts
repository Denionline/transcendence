import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";

import { ACCEPTED_MIME_TYPES, extFor, maxBytesFor, typeForMime } from "../src/lib/file-limits.js";
import { FileType } from "../generated/prisma/enums.js";

const MB = 1024 * 1024;

//	A table test: every accepted type has to resolve through both functions,
//	so adding a row to FILE_RULES without adding it here leaves a gap.
const accepted: { mimeType: string; type: FileType; extension: string }[] = [
	{ mimeType: "image/jpeg", type: FileType.image, extension: "jpg" },
	{ mimeType: "image/png", type: FileType.image, extension: "png" },
	{ mimeType: "image/webp", type: FileType.image, extension: "webp" },
	{ mimeType: "audio/mpeg", type: FileType.audio, extension: "mp3" },
	{ mimeType: "audio/mp4", type: FileType.audio, extension: "m4a" },
	{ mimeType: "video/mp4", type: FileType.video, extension: "mp4" },
];

test("every accepted MIME maps to its FileType and extension", () => {
	for (const row of accepted) {
		assert.equal(typeForMime(row.mimeType), row.type, `type for ${row.mimeType}`);
		assert.equal(extFor(row.mimeType), row.extension, `extension for ${row.mimeType}`);
	}
});

test("the accepted list and the rules table describe the same set", () => {
	assert.deepEqual([...ACCEPTED_MIME_TYPES].sort(), accepted.map((row) => row.mimeType).sort());
});

//	SVG is excluded deliberately (executable XML) and `document` has no rules
//	entry, so a PDF has no way in. Either returning a FileType means an
//	upload path opened that nobody decided to open.
test("unknown and deliberately excluded MIME types resolve to null", () => {
	for (const mimeType of [
		"image/svg+xml",
		"application/pdf",
		"image/gif",
		"audio/ogg",
		"video/webm",
		"text/html",
		"nonsense/x",
		"",
	]) {
		assert.equal(typeForMime(mimeType), null, `type for "${mimeType}"`);
		assert.equal(extFor(mimeType), null, `extension for "${mimeType}"`);
	}
});

test("per-type size caps are the documented ones", () => {
	assert.equal(maxBytesFor(FileType.image), 5 * MB);
	assert.equal(maxBytesFor(FileType.audio), 15 * MB);
	assert.equal(maxBytesFor(FileType.video), 50 * MB);
});
