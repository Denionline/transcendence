import { describe, expect, test } from "vitest";

import { sanitizeLine, sanitizeParagraph } from "./sanitize";

//	This file is a deliberate copy of srcs/backend/src/lib/sanitize.ts, so that
//	the client measures the same string the server will. The copies are also
//	compared directly against each other in srcs/frontend/src/test/parity.test.ts;
//	these tests pin the behaviour on its own terms.

describe("sanitizeLine", () => {
	test("trims and collapses runs of spacing", () => {
		expect(sanitizeLine("  a   b  ")).toBe("a b");
		expect(sanitizeLine("a\tb")).toBe("a b");
	});

	test("folds line breaks into spaces, since this is one line", () => {
		expect(sanitizeLine("one\ntwo")).toBe("one two");
		expect(sanitizeLine("one\r\ntwo")).toBe("one two");
	});

	test("strips zero-width characters that could hide inside a name", () => {
		expect(sanitizeLine("ad​a")).toBe("ada");
		expect(sanitizeLine("​​​")).toBe("");
	});

	test("strips bidi overrides that would reorder how a name displays", () => {
		expect(sanitizeLine("ada‮lovelace")).toBe("adalovelace");
	});

	test("strips the byte order mark", () => {
		expect(sanitizeLine("﻿ada")).toBe("ada");
	});

	test("normalises two encodings of the same name to one string", () => {
		//	"é" as one code point, and as "e" plus a combining accent.
		expect(sanitizeLine("café")).toBe(sanitizeLine("café"));
	});

	test("leaves an ordinary string alone", () => {
		expect(sanitizeLine("Ada Lovelace")).toBe("Ada Lovelace");
	});
});

describe("sanitizeParagraph", () => {
	test("keeps the line breaks and indentation the author typed", () => {
		expect(sanitizeParagraph("one\n  two")).toBe("one\n  two");
	});

	test("normalises carriage returns to one kind of line ending", () => {
		expect(sanitizeParagraph("one\r\ntwo")).toBe("one\ntwo");
	});

	//	Runs of blank lines are only used to shout, so they are capped — but not
	//	collapsed entirely, which would rewrite what the author wrote.
	test("caps runs of blank lines without removing them", () => {
		expect(sanitizeParagraph("one\n\n\n\n\ntwo")).toBe("one\n\ntwo");
		expect(sanitizeParagraph("one\n\ntwo")).toBe("one\n\ntwo");
	});

	test("strips invisibles here too", () => {
		expect(sanitizeParagraph("​​​")).toBe("");
	});

	test("trims the ends", () => {
		expect(sanitizeParagraph("\n\n  hello  \n\n")).toBe("hello");
	});
});
