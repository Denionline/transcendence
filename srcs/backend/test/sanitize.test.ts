import test from "node:test";
import assert from "node:assert/strict";

import { sanitizeLine, sanitizeParagraph } from "../src/lib/sanitize.js";

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
