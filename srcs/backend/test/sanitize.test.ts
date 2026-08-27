import test from "node:test";
import assert from "node:assert/strict";

import { sanitizeLine, sanitizeParagraph } from "../src/lib/sanitize.js";
import { matchesDeclaredMime, sniffMime } from "../src/lib/file-signature.js";

const PNG = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
	"base64",
);

test("zero-width characters cannot hide inside a name", () => {
	assert.equal(sanitizeLine("ad\u200Bmin"), "admin");
});

test("bidi overrides are stripped", () => {
	assert.equal(sanitizeLine("photo\u202Egnp.exe"), "photognp.exe");
});

test("a single-line field cannot contain line breaks", () => {
	assert.equal(sanitizeLine("line one\nline two"), "line one line two");
	assert.equal(sanitizeLine("unicode\u2028break"), "unicode break");
});

test("control characters are removed, and runs of spacing collapse", () => {
	assert.equal(sanitizeLine("  a\u0000\t\t b  "), "a b");
});

test("the same name in two encodings normalises to one string", () => {
	const composed = "caf\u00E9";
	const decomposed = "cafe\u0301";
	assert.notEqual(composed, decomposed);
	assert.equal(sanitizeLine(decomposed), composed);
});

test("prose keeps its line breaks and indentation", () => {
	assert.equal(sanitizeParagraph("one\n  indented\ntwo"), "one\n  indented\ntwo");
});

test("prose caps runs of blank lines but does not collapse them entirely", () => {
	assert.equal(sanitizeParagraph("one\n\n\n\n\ntwo"), "one\n\ntwo");
});

test("a string of nothing but invisibles sanitizes to empty", () => {
	assert.equal(sanitizeLine("\u200B\u200D\uFEFF"), "");
});

test("a real PNG is recognised", () => {
	assert.deepEqual(sniffMime(PNG), ["image/png"]);
	assert.equal(matchesDeclaredMime(PNG, "image/png"), true);
});

test("a PNG declared as something else is refused", () => {
	assert.equal(matchesDeclaredMime(PNG, "image/jpeg"), false);
	assert.equal(matchesDeclaredMime(PNG, "video/mp4"), false);
});

test("HTML wearing a .png name is not an image", () => {
	const html = Buffer.from("<script>alert(1)</script>", "utf8");
	assert.equal(sniffMime(html), null);
	assert.equal(matchesDeclaredMime(html, "image/png"), false);
});

test("JPEG, WebP and ID3 audio are recognised by their markers", () => {
	assert.deepEqual(sniffMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), ["image/jpeg"]);

	const webp = Buffer.concat([
		Buffer.from("RIFF", "ascii"),
		Buffer.from([0, 0, 0, 0]),
		Buffer.from("WEBP", "ascii"),
	]);
	assert.deepEqual(sniffMime(webp), ["image/webp"]);

	assert.deepEqual(sniffMime(Buffer.from("ID3\u0003", "ascii")), ["audio/mpeg"]);
});

test("an ISO container answers by brand, and audio-only brands are narrowed", () => {
	const iso = (brand: string) =>
		Buffer.concat([
			Buffer.from([0, 0, 0, 0x18]),
			Buffer.from("ftyp", "ascii"),
			Buffer.from(brand, "ascii"),
		]);

	assert.deepEqual(sniffMime(iso("M4A ")), ["audio/mp4"]);
	assert.deepEqual(sniffMime(iso("isom")), ["video/mp4", "audio/mp4"]);
	assert.equal(matchesDeclaredMime(iso("isom"), "video/mp4"), true);
});

test("an empty or truncated buffer matches nothing", () => {
	assert.equal(sniffMime(Buffer.alloc(0)), null);
	assert.equal(sniffMime(Buffer.from([0x89, 0x50])), null);
});
