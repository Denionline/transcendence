import { describe, expect, test } from "vitest";

import { messageContentSchema } from "./schemas";
import { LIMITS } from "../../lib/limits";

describe("messageContentSchema", () => {
	test("accepts an ordinary message", () => {
		const result = messageContentSchema.safeParse("see you at six");
		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toBe("see you at six");
	});

	test("trims the message it hands back", () => {
		const result = messageContentSchema.safeParse("  hello  ");
		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toBe("hello");
	});

	test("keeps line breaks, since a message is prose", () => {
		const result = messageContentSchema.safeParse("one\ntwo");
		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toBe("one\ntwo");
	});

	test("a message of nothing but whitespace is not a message", () => {
		expect(messageContentSchema.safeParse("").success).toBe(false);
		expect(messageContentSchema.safeParse("   ").success).toBe(false);
		expect(messageContentSchema.safeParse("\n\n").success).toBe(false);
	});

	//	The bug the parity suite caught: .trim() leaves zero-width characters
	//	alone, so this passed the composer and the server refused it.
	test("a message of nothing but invisibles is not a message either", () => {
		expect(messageContentSchema.safeParse("​​​").success).toBe(false);
		expect(messageContentSchema.safeParse("﻿").success).toBe(false);
	});

	test("is capped at the same length the server enforces", () => {
		expect(messageContentSchema.safeParse("a".repeat(LIMITS.longText)).success).toBe(true);
		expect(messageContentSchema.safeParse("a".repeat(LIMITS.longText + 1)).success).toBe(false);
	});

	test("says what to do rather than what went wrong", () => {
		const result = messageContentSchema.safeParse("");
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error.issues[0].message).toBe("Write something first");
	});
});
