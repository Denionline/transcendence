import { describe, expect, test } from "vitest";

import { editUserSchema } from "./schemas";
import { LIMITS } from "../../lib/limits";

const valid = { username: "ada", email: "ada@example.com", role: "artist" };

describe("editUserSchema", () => {
	test("accepts a well-formed edit", () => {
		expect(editUserSchema.safeParse(valid).success).toBe(true);
	});

	//	Unlike registration, an admin *can* set the admin role here — the server
	//	decides whether this particular caller may.
	test("offers all three roles, including admin", () => {
		for (const role of ["artist", "hirer", "admin"]) {
			expect(editUserSchema.safeParse({ ...valid, role }).success, role).toBe(true);
		}
		expect(editUserSchema.safeParse({ ...valid, role: "wizard" }).success).toBe(false);
	});

	test("bounds the username and refuses an empty one", () => {
		expect(
			editUserSchema.safeParse({ ...valid, username: "a".repeat(LIMITS.username) }).success,
		).toBe(true);
		expect(
			editUserSchema.safeParse({ ...valid, username: "a".repeat(LIMITS.username + 1) }).success,
		).toBe(false);
		expect(editUserSchema.safeParse({ ...valid, username: "   " }).success).toBe(false);
	});

	//	The bug the parity suite caught: no upper bound, so a long address
	//	passed the dialog and came back a 400.
	test("bounds the email at RFC 5321's limit", () => {
		const atLimit = "a".repeat(LIMITS.email - 12) + "@example.com";
		expect(editUserSchema.safeParse({ ...valid, email: atLimit }).success).toBe(true);
		expect(editUserSchema.safeParse({ ...valid, email: "a" + atLimit }).success).toBe(false);
	});

	test("asks for an email that looks like one", () => {
		expect(editUserSchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
		expect(editUserSchema.safeParse({ ...valid, email: "" }).success).toBe(false);
	});
});
