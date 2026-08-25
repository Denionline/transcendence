import { describe, expect, test } from "vitest";

import {
	MAX_BIO_LENGTH,
	MAX_CATEGORIES,
	accountSchema,
	artistDetailsSchema,
	artistOnboardingSchema,
	hirerDetailsSchema,
	hirerOnboardingSchema,
} from "./schemas";
import { LIMITS } from "../../lib/limits";

const account = { username: "ada", email: "ada@example.com", avatarUrl: "" };

describe("accountSchema", () => {
	test("accepts a filled-in account", () => {
		expect(accountSchema.safeParse(account).success).toBe(true);
	});

	test("bounds the username and refuses an empty one", () => {
		expect(
			accountSchema.safeParse({ ...account, username: "a".repeat(LIMITS.username) }).success,
		).toBe(true);
		expect(
			accountSchema.safeParse({ ...account, username: "a".repeat(LIMITS.username + 1) }).success,
		).toBe(false);
		expect(accountSchema.safeParse({ ...account, username: "   " }).success).toBe(false);
	});

	test("a username of nothing but invisibles is empty", () => {
		expect(accountSchema.safeParse({ ...account, username: "​​​" }).success).toBe(false);
	});

	test("bounds the email at RFC 5321's limit", () => {
		const atLimit = "a".repeat(LIMITS.email - 12) + "@example.com";
		expect(accountSchema.safeParse({ ...account, email: atLimit }).success).toBe(true);
		expect(accountSchema.safeParse({ ...account, email: "a" + atLimit }).success).toBe(false);
	});

	//	"" means "no avatar"; the call site turns it into the null the API wants.
	test("accepts an empty avatarUrl, meaning no avatar", () => {
		expect(accountSchema.safeParse({ ...account, avatarUrl: "" }).success).toBe(true);
	});

	test("accepts a same-origin path and an absolute http(s) URL", () => {
		for (const avatarUrl of [
			"/api/files/abc/raw",
			"https://cdn.intra.42.fr/users/x.jpg",
			"http://example.com/x.png",
		]) {
			expect(accountSchema.safeParse({ ...account, avatarUrl }).success, avatarUrl).toBe(true);
		}
	});

	//	"//evil.example/x.png" reads as a path but is an absolute URL to someone
	//	else's host, so a startsWith("/") test would wave it through.
	test("refuses javascript:, data: and protocol-relative URLs", () => {
		for (const avatarUrl of [
			"javascript:alert(1)",
			"data:image/png;base64,AAAA",
			"//evil.example/x.png",
			"file:///etc/passwd",
			"not a url",
		]) {
			expect(accountSchema.safeParse({ ...account, avatarUrl }).success, avatarUrl).toBe(false);
		}
	});
});

describe("artistDetailsSchema", () => {
	const details = { categories: ["painting"], bio: "", location: "", availability: true };

	test("accepts the minimum: one category and nothing else", () => {
		expect(artistDetailsSchema.safeParse(details).success).toBe(true);
	});

	test("insists on at least one category and caps the list", () => {
		expect(artistDetailsSchema.safeParse({ ...details, categories: [] }).success).toBe(false);
		expect(
			artistDetailsSchema.safeParse({
				...details,
				categories: Array(MAX_CATEGORIES).fill("painting"),
			}).success,
		).toBe(true);
		expect(
			artistDetailsSchema.safeParse({
				...details,
				categories: Array(MAX_CATEGORIES + 1).fill("painting"),
			}).success,
		).toBe(false);
	});

	//	The slug is picked from a list rather than typed, but it still travels
	//	as a string the server measures with requiredText("category", 60).
	test("bounds a category slug, and refuses an empty one", () => {
		expect(
			artistDetailsSchema.safeParse({ ...details, categories: ["a".repeat(60)] }).success,
		).toBe(true);
		expect(
			artistDetailsSchema.safeParse({ ...details, categories: ["a".repeat(61)] }).success,
		).toBe(false);
		expect(artistDetailsSchema.safeParse({ ...details, categories: [""] }).success).toBe(false);
	});

	test("bounds the bio and the location", () => {
		expect(
			artistDetailsSchema.safeParse({ ...details, bio: "a".repeat(MAX_BIO_LENGTH) }).success,
		).toBe(true);
		expect(
			artistDetailsSchema.safeParse({ ...details, bio: "a".repeat(MAX_BIO_LENGTH + 1) }).success,
		).toBe(false);
		expect(
			artistDetailsSchema.safeParse({ ...details, location: "a".repeat(LIMITS.shortText + 1) })
				.success,
		).toBe(false);
	});

	test("the bio keeps its line breaks, being prose", () => {
		const result = artistDetailsSchema.safeParse({ ...details, bio: "one\ntwo" });
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.bio).toBe("one\ntwo");
	});

	test("availability is a boolean, not whatever a checkbox hands over", () => {
		expect(artistDetailsSchema.safeParse({ ...details, availability: false }).success).toBe(true);
		expect(artistDetailsSchema.safeParse({ ...details, availability: "on" }).success).toBe(false);
	});

	//	The old settings form collected a rate with no column behind it, and
	//	the current UI does not ask for one.
	test("has no rate field", () => {
		const result = artistDetailsSchema.safeParse({ ...details, rate: "500" });
		expect(result.success).toBe(true);
		if (result.success) expect("rate" in result.data).toBe(false);
	});
});

describe("hirerDetailsSchema", () => {
	const details = { organizationName: "Cafe Central", bio: "", location: "" };

	test("requires an organization name", () => {
		expect(hirerDetailsSchema.safeParse(details).success).toBe(true);
		expect(hirerDetailsSchema.safeParse({ ...details, organizationName: "" }).success).toBe(false);
		expect(hirerDetailsSchema.safeParse({ ...details, organizationName: "   " }).success).toBe(
			false,
		);
	});

	test("bounds the organization name", () => {
		expect(
			hirerDetailsSchema.safeParse({
				...details,
				organizationName: "a".repeat(LIMITS.shortText + 1),
			}).success,
		).toBe(false);
	});

	//	Matching runs on each gig's own category, not on the hirer's profile,
	//	so the hirer form never collects one.
	test("has no categories field", () => {
		const result = hirerDetailsSchema.safeParse({ ...details, categories: ["music"] });
		expect(result.success).toBe(true);
		if (result.success) expect("categories" in result.data).toBe(false);
	});
});

describe("onboarding", () => {
	const artist = { category: "painting", bio: "", location: "", availability: true };
	const hirer = { organizationName: "Cafe Central", bio: "", location: "" };

	//	Category is the only thing artist onboarding blocks on: it is what
	//	swipe matching is keyed on. Everything else can be filled in later.
	test("an artist needs only a category", () => {
		expect(artistOnboardingSchema.safeParse(artist).success).toBe(true);
		expect(artistOnboardingSchema.safeParse({ ...artist, category: "" }).success).toBe(false);
	});

	test("a hirer needs an organization name instead", () => {
		expect(hirerOnboardingSchema.safeParse(hirer).success).toBe(true);
		expect(hirerOnboardingSchema.safeParse({ ...hirer, organizationName: "" }).success).toBe(false);
	});

	test("the optional fields are still bounded, being the same columns", () => {
		expect(
			artistOnboardingSchema.safeParse({ ...artist, bio: "a".repeat(MAX_BIO_LENGTH + 1) }).success,
		).toBe(false);
		expect(
			artistOnboardingSchema.safeParse({ ...artist, location: "a".repeat(LIMITS.shortText + 1) })
				.success,
		).toBe(false);
	});
});
