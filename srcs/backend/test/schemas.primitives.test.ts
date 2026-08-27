import test, { describe } from "node:test";
import assert from "node:assert/strict";
import type { ZodType } from "zod";

import {
	LIMITS,
	avatarUrl,
	email,
	enumOf,
	id,
	idParams,
	nullableParagraph,
	nullableText,
	optionalText,
	paragraph,
	password,
	rate,
	requiredParagraph,
	requiredText,
	username,
} from "../src/lib/schemas.js";
import { UserRole } from "../generated/prisma/enums.js";

function accept<T>(schema: ZodType<T>, value: unknown): T {
	const result = schema.safeParse(value);
	assert.equal(
		result.success,
		true,
		`expected ${JSON.stringify(value)} to be accepted, got: ${
			result.success ? "" : result.error.issues.map((issue) => issue.message).join("; ")
		}`,
	);
	return result.data as T;
}

function refuse(schema: ZodType, value: unknown): string {
	const result = schema.safeParse(value);
	assert.equal(result.success, false, `expected ${JSON.stringify(value)} to be refused`);
	return result.success ? "" : result.error.issues[0].message;
}

const ZERO_WIDTH = "​";
const RTL_OVERRIDE = "‮";

describe("id", () => {
	test("accepts any bounded non-empty string, uuid or not", () => {
		assert.equal(accept(id, "does-not-exist"), "does-not-exist");
		assert.equal(accept(id, "0f8fad5b-d9cb-469f-a165-70867728950e").length, 36);
	});

	test("does not validate uuid shape, so a wrong id can still 404", () => {
		assert.equal(accept(id, "!!!not-a-uuid!!!"), "!!!not-a-uuid!!!");
	});

	test("trims, then refuses what is left of an empty string", () => {
		assert.equal(accept(id, "  abc  "), "abc");
		assert.match(refuse(id, "   "), /id is required/);
		assert.match(refuse(id, ""), /id is required/);
	});

	test("accepts exactly the bound and refuses one past it", () => {
		assert.equal(accept(id, "a".repeat(LIMITS.id)).length, LIMITS.id);
		assert.match(refuse(id, "a".repeat(LIMITS.id + 1)), /id is too long/);
	});

	test("refuses values that are not strings", () => {
		for (const value of [42, null, undefined, {}, ["a"], true]) {
			assert.match(refuse(id, value), /id must be a string|id is required/);
		}
	});

	test("idParams pulls the id out of a params object", () => {
		assert.deepEqual(accept(idParams, { id: "abc" }), { id: "abc" });
		assert.match(refuse(idParams, {}), /id must be a string|id is required/);
	});
});

describe("email", () => {
	test("is lowercased and trimmed, so the stored value is canonical", () => {
		assert.equal(accept(email, "  Me@Example.COM  "), "me@example.com");
	});

	test("a pasted address with surrounding whitespace is valid", () => {
		assert.equal(accept(email, " me@example.com "), "me@example.com");
	});

	test("refuses malformed addresses", () => {
		for (const value of ["not-an-email", "@example.com", "me@", "me example.com", ""]) {
			assert.match(refuse(email, value), /invalid email format/);
		}
	});

	test("accepts an address at RFC 5321's length and refuses one past it", () => {
		const domain = "@example.com";
		const atLimit = "a".repeat(LIMITS.email - domain.length) + domain;
		assert.equal(accept(email, atLimit).length, LIMITS.email);
		assert.match(refuse(email, "a" + atLimit), /at most 254 characters/);
	});

	test("refuses non-strings", () => {
		assert.match(refuse(email, 42), /email must be a string/);
		assert.match(refuse(email, null), /email must be a string/);
	});
});

describe("password", () => {
	test("accepts anything non-empty up to 512 characters", () => {
		assert.equal(accept(password, "a"), "a");
		assert.equal(accept(password, "a".repeat(512)).length, 512);
	});

	test("refuses empty, oversized and non-string values", () => {
		assert.match(refuse(password, ""), /password is required/);
		assert.match(refuse(password, "a".repeat(513)), /password is too long/);
		assert.match(refuse(password, 12345678), /password must be a string/);
	});

	test("does not trim, because spaces are legitimate password characters", () => {
		assert.equal(accept(password, "  hunter two  "), "  hunter two  ");
	});
});

describe("requiredText", () => {
	const title = requiredText("title", 10);

	test("sanitizes before measuring, so invisibles do not fill the budget", () => {
		const padded = ZERO_WIDTH.repeat(10) + "hello" + ZERO_WIDTH.repeat(10);
		assert.equal(accept(title, padded), "hello");
	});

	test("a string of nothing but invisibles is empty, not full", () => {
		assert.match(refuse(title, ZERO_WIDTH.repeat(50)), /title cannot be empty/);
		assert.match(refuse(title, "   "), /title cannot be empty/);
		assert.match(refuse(title, RTL_OVERRIDE), /title cannot be empty/);
	});

	test("collapses line breaks and runs of spacing into single spaces", () => {
		assert.equal(accept(requiredText("title", 40), "a\nb\tc   d"), "a b c d");
	});

	test("measures the sanitized value against the bound", () => {
		assert.equal(accept(title, "0123456789"), "0123456789");
		assert.match(refuse(title, "01234567890"), /title must be at most 10 characters/);
	});

	test("names the field it was built for in every message", () => {
		assert.match(refuse(requiredText("location", 5), "far too long"), /location/);
		assert.match(refuse(requiredText("location", 5), 42), /location must be a string/);
	});

	test("defaults to the shortText bound", () => {
		const field = requiredText("field");
		assert.equal(accept(field, "a".repeat(LIMITS.shortText)).length, LIMITS.shortText);
		refuse(field, "a".repeat(LIMITS.shortText + 1));
	});
});

describe("optionalText and nullableText", () => {
	test("optionalText allows empty, meaning no value given", () => {
		assert.equal(accept(optionalText("bio", 10), ""), "");
		assert.equal(accept(optionalText("bio", 10), "   "), "");
	});

	test("optionalText still enforces the upper bound", () => {
		assert.match(refuse(optionalText("bio", 5), "far too long"), /at most 5 characters/);
	});

	test("nullableText accepts null to clear the column", () => {
		assert.equal(accept(nullableText("location", 10), null), null);
		assert.equal(accept(nullableText("location", 10), "Porto"), "Porto");
	});

	test("nullableText is not optional: undefined is still refused", () => {
		refuse(nullableText("location", 10), undefined);
	});
});

describe("paragraph primitives", () => {
	test("prose keeps the line breaks the author typed", () => {
		assert.equal(accept(paragraph("bio", 100), "one\ntwo\nthree"), "one\ntwo\nthree");
	});

	test("runs of blank lines are capped but not collapsed away", () => {
		assert.equal(accept(paragraph("bio", 100), "one\n\n\n\n\ntwo"), "one\n\ntwo");
	});

	test("carriage returns are normalised so stored prose has one line ending", () => {
		assert.equal(accept(paragraph("bio", 100), "one\r\ntwo"), "one\ntwo");
	});

	test("paragraph allows empty; requiredParagraph does not", () => {
		assert.equal(accept(paragraph("bio", 100), ""), "");
		assert.match(refuse(requiredParagraph("content", 100), "   "), /content cannot be empty/);
	});

	test("nullableParagraph accepts null", () => {
		assert.equal(accept(nullableParagraph("bio", 100), null), null);
	});

	test("defaults to the longText bound", () => {
		const bio = paragraph("bio");
		assert.equal(accept(bio, "a".repeat(LIMITS.longText)).length, LIMITS.longText);
		refuse(bio, "a".repeat(LIMITS.longText + 1));
	});
});

describe("username", () => {
	test("is a required single line bounded at the username limit", () => {
		assert.equal(accept(username, "  ada  "), "ada");
		assert.equal(accept(username, "a".repeat(LIMITS.username)).length, LIMITS.username);
		assert.match(refuse(username, "a".repeat(LIMITS.username + 1)), /at most 40 characters/);
		assert.match(refuse(username, ""), /username cannot be empty/);
	});

	test("cannot smuggle a bidi override that reorders how a name displays", () => {
		assert.equal(accept(username, "ada" + RTL_OVERRIDE + "lovelace"), "adalovelace");
	});
});

describe("avatarUrl", () => {
	test("accepts a same-origin path, which is what an uploaded file gets", () => {
		assert.equal(accept(avatarUrl, "/api/files/abc/raw"), "/api/files/abc/raw");
	});

	test("accepts an absolute http(s) URL, which is what 42 hands back", () => {
		assert.equal(
			accept(avatarUrl, "https://cdn.intra.42.fr/users/x.jpg").startsWith("https"),
			true,
		);
		accept(avatarUrl, "http://example.com/x.png");
	});

	test("refuses a protocol-relative URL that only looks like a path", () => {
		assert.match(refuse(avatarUrl, "//evil.example/x.png"), /same-origin path or an http/);
	});

	test("refuses schemes that are not http(s)", () => {
		for (const value of [
			"javascript:alert(1)",
			"data:image/png;base64,AAAA",
			"file:///etc/passwd",
			"ftp://example.com/x.png",
			"not a url at all",
		]) {
			assert.match(refuse(avatarUrl, value), /same-origin path or an http/);
		}
	});

	test("accepts the length bound and refuses one past it", () => {
		const long = "/" + "a".repeat(LIMITS.url - 1);
		assert.equal(accept(avatarUrl, long).length, LIMITS.url);
		assert.match(refuse(avatarUrl, long + "a"), /avatarUrl is too long/);
	});
});

describe("rate", () => {
	test("accepts whole non-negative amounts, including zero", () => {
		assert.equal(accept(rate, 0), 0);
		assert.equal(accept(rate, LIMITS.rate), LIMITS.rate);
	});

	test("refuses fractions, negatives and anything past the ceiling", () => {
		assert.match(refuse(rate, 12.5), /rate must be a whole number/);
		assert.match(refuse(rate, -1), /rate cannot be negative/);
		assert.match(refuse(rate, LIMITS.rate + 1), /rate must be at most/);
	});

	test("refuses non-numbers, including numeric strings from a form", () => {
		assert.match(refuse(rate, "100"), /rate must be a number/);
		assert.match(refuse(rate, NaN), /rate must be a number|whole number/);
		assert.match(refuse(rate, Infinity), /rate must be a number|whole number|at most/);
		assert.match(refuse(rate, null), /rate must be a number/);
	});
});

describe("enumOf", () => {
	const role = enumOf(UserRole, "role");

	test("accepts every value the Prisma enum declares", () => {
		for (const value of Object.values(UserRole)) {
			assert.equal(accept(role, value), value);
		}
	});

	test("refuses anything else and lists the allowed values in the message", () => {
		const message = refuse(role, "superuser");
		assert.match(message, /role must be one of/);
		for (const value of Object.values(UserRole)) {
			assert.ok(message.includes(value), `message should list ${value}`);
		}
	});

	test("is case-sensitive and does not coerce", () => {
		refuse(role, "ARTIST");
		refuse(role, 0);
		refuse(role, null);
	});
});
