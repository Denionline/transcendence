import { describe, expect, test } from "vitest";

import { opportunitySchema } from "./schemas";
import { LIMITS } from "../../lib/limits";

const valid = {
	title: "Mural for a cafe",
	category: "painting",
	description: "",
	location: "",
	rate: "",
};

describe("opportunitySchema", () => {
	test("accepts a gig with only its required fields filled in", () => {
		expect(opportunitySchema.safeParse(valid).success).toBe(true);
	});

	test("requires a title and a category", () => {
		expect(opportunitySchema.safeParse({ ...valid, title: "" }).success).toBe(false);
		expect(opportunitySchema.safeParse({ ...valid, category: "" }).success).toBe(false);
	});

	//	The bug the parity suite caught: no .trim(), so a title of spaces passed
	//	the form and the server refused it.
	test("a title of nothing but spaces or invisibles is not a title", () => {
		for (const title of ["   ", "​​​", "\t"]) {
			expect(opportunitySchema.safeParse({ ...valid, title }).success, title).toBe(false);
		}
	});

	test("bounds the title, description and location as the server does", () => {
		expect(
			opportunitySchema.safeParse({ ...valid, title: "a".repeat(LIMITS.shortText) }).success,
		).toBe(true);
		expect(
			opportunitySchema.safeParse({ ...valid, title: "a".repeat(LIMITS.shortText + 1) }).success,
		).toBe(false);
		expect(
			opportunitySchema.safeParse({ ...valid, description: "a".repeat(LIMITS.longText + 1) })
				.success,
		).toBe(false);
		expect(
			opportunitySchema.safeParse({ ...valid, location: "a".repeat(LIMITS.shortText + 1) }).success,
		).toBe(false);
	});

	test("takes a rate as a whole-number string, or nothing at all", () => {
		for (const rate of ["", "0", "500", String(LIMITS.rate)]) {
			expect(opportunitySchema.safeParse({ ...valid, rate }).success, rate).toBe(true);
		}
	});

	test("refuses a rate past the server's ceiling, and anything not whole", () => {
		for (const rate of [String(LIMITS.rate + 1), "9999999999", "-1", "12.5", "abc"]) {
			expect(opportunitySchema.safeParse({ ...valid, rate }).success, rate).toBe(false);
		}
	});

	//	The form no longer holds its own copy of the vocabulary: an unknown
	//	category is shape-valid here and answered CATEGORY_NOT_FOUND server-side.
	test("accepts any non-empty category, leaving the vocabulary to the server", () => {
		expect(opportunitySchema.safeParse({ ...valid, category: "not-a-real-category" }).success).toBe(
			true,
		);
	});

	test("sanitizes the values it hands back", () => {
		const result = opportunitySchema.safeParse({
			...valid,
			title: "  Mural\tfor a cafe  ",
			description: "one\r\ntwo",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.title).toBe("Mural for a cafe");
			expect(result.data.description).toBe("one\ntwo");
		}
	});
});
