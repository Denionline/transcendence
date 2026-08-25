import { describe, expect, test } from "vitest";
import type { ZodType } from "zod";

//	The server's schemas. Imported straight out of the backend package: vite
//	resolves its ".js" specifiers to the ".ts" sources, so there is no build
//	step and no copy to keep in step.
import {
	LIMITS as SERVER_LIMITS,
	avatarUrl as serverAvatarUrl,
	email as serverEmail,
	optionalText,
	paragraph,
	rate as serverRate,
	requiredParagraph,
	requiredText,
	username as serverUsername,
} from "../../../backend/src/lib/schemas.js";
import {
	sanitizeLine as serverSanitizeLine,
	sanitizeParagraph as serverSanitizeParagraph,
} from "../../../backend/src/lib/sanitize.js";
import { registerBody } from "../../../backend/src/modules/auth/auth.schema.js";
import { updateProfileBody } from "../../../backend/src/modules/profile/profile.schema.js";

//	This side.
import { LIMITS } from "../lib/limits";
import { sanitizeLine, sanitizeParagraph } from "../lib/sanitize";
import { registerSchema } from "../features/auth/schemas";
import { editUserSchema } from "../features/admin/schemas";
import { messageContentSchema } from "../features/messages/schemas";
import { opportunitySchema } from "../features/opportunities/schemas";
import {
	MAX_BIO_LENGTH,
	MAX_CATEGORIES,
	accountSchema,
	artistDetailsSchema,
	hirerDetailsSchema,
} from "../features/profile/schemas";

//	The two halves of "validated on both frontend and backend"
//	(docs/subject.md:53), checked against each other.
//
//	The client schemas exist so a typo is answered in the form rather than by a
//	round trip that comes back 400 — every one of them says so in a comment. A
//	client bound that is *looser* than its server counterpart silently breaks
//	that promise: the form says yes, the server says no, and the user gets a
//	banner instead of a message under the field they have to fix.
//
//	So the assertion runs one way only. The client may be stricter than the
//	server; it must never be looser.
//
//	This is the only file that reaches across the package boundary. The two
//	copies of zod never meet — each side parses with its own, and only the
//	resulting booleans are compared.

type Accepts = (value: unknown) => boolean;

/** Whether a schema accepts a value, ignoring what it parses it into. */
function accepts(schema: ZodType): Accepts {
	return (value) => schema.safeParse(value).success;
}

/** Whether a schema accepts a value in one field, the others held valid. */
function acceptsField(schema: ZodType, field: string, base: Record<string, unknown>): Accepts {
	return (value) => schema.safeParse({ ...base, [field]: value }).success;
}

/**
 * The whole point of the file: if the server refuses a value, the client has
 * to refuse it too.
 */
function assertClientIsNoLooser(what: string, server: Accepts, client: Accepts, probes: unknown[]) {
	const looser = probes
		.filter((probe) => !server(probe) && client(probe))
		.map((probe) =>
			typeof probe === "string" ? `string(${probe.length})` : JSON.stringify(probe),
		);

	expect(
		looser,
		`${what}: the client accepts values the server refuses, so the user gets a 400 instead of a message under the field`,
	).toEqual([]);
}

/** Probe values for a bounded single-line text field. */
function textProbes(max: number): unknown[] {
	return ["a".repeat(max), "a".repeat(max + 1), "a".repeat(max * 2), "", "   ", "​​"];
}

describe("the numbers themselves", () => {
	//	Cheaper and broader than probing schemas: this catches a bound that
	//	drifted in a field no form uses yet, before it becomes a bug report.
	test("the client's LIMITS mirror the server's exactly", () => {
		expect(LIMITS).toEqual(SERVER_LIMITS);
	});

	//	Written down independently on each side — MAX_CATEGORIES here,
	//	MAX_PROFILE_CATEGORIES in the backend's categories service — so this
	//	assertion is the only thing keeping them equal.
	test("the category ceiling is the same number on both sides", () => {
		expect(MAX_CATEGORIES).toBe(10);
	});
});

describe("sanitization", () => {
	//	The bounds only agree if both sides measure the same string. The client
	//	copy of sanitize.ts exists solely to make that true, so it is compared
	//	against the original rather than trusted to stay in step.
	const cases = [
		"  spaced  ",
		"one\ntwo",
		"one\r\ntwo",
		"one\n\n\n\n\ntwo",
		"a\tb   c",
		"​hidden​",
		"‮reversed",
		"﻿bom",
		"é composed",
		" unicode break",
		"",
		"   ",
	];

	test("sanitizeLine agrees with the server's, character for character", () => {
		for (const value of cases) {
			expect(sanitizeLine(value), JSON.stringify(value)).toBe(serverSanitizeLine(value));
		}
	});

	test("sanitizeParagraph agrees with the server's, character for character", () => {
		for (const value of cases) {
			expect(sanitizeParagraph(value), JSON.stringify(value)).toBe(serverSanitizeParagraph(value));
		}
	});
});

describe("account fields", () => {
	test("username in the profile form is bounded like the server's", () => {
		assertClientIsNoLooser(
			"username (profile settings)",
			accepts(serverUsername),
			acceptsField(accountSchema, "username", { email: "a@b.co", avatarUrl: "" }),
			textProbes(SERVER_LIMITS.username),
		);
	});

	test("username in the admin dialog is bounded like the server's", () => {
		assertClientIsNoLooser(
			"username (admin edit dialog)",
			accepts(serverUsername),
			acceptsField(editUserSchema, "username", { email: "a@b.co", role: "artist" }),
			textProbes(SERVER_LIMITS.username),
		);
	});

	//	The registration form's `name` becomes the username on the server.
	test("the name collected at registration is bounded like the username it becomes", () => {
		assertClientIsNoLooser(
			"name (registration)",
			acceptsField(registerBody, "name", {
				email: "a@b.co",
				password: "Aa1!aaaa",
				role: "artist",
			}),
			acceptsField(registerSchema, "name", {
				email: "a@b.co",
				password: "Aa1!aaaa",
				role: "artist",
			}),
			textProbes(SERVER_LIMITS.username),
		);
	});

	const emailProbes = [
		"a".repeat(SERVER_LIMITS.email - 12) + "@example.com",
		"a".repeat(SERVER_LIMITS.email - 11) + "@example.com",
		"a".repeat(500) + "@example.com",
		"not-an-email",
		"@example.com",
		"",
	];

	test("email in the profile form is bounded and format-checked like the server's", () => {
		assertClientIsNoLooser(
			"email (profile settings)",
			accepts(serverEmail),
			acceptsField(accountSchema, "email", { username: "ada", avatarUrl: "" }),
			emailProbes,
		);
	});

	test("email in the admin dialog matches the server too", () => {
		assertClientIsNoLooser(
			"email (admin edit dialog)",
			accepts(serverEmail),
			acceptsField(editUserSchema, "email", { username: "ada", role: "artist" }),
			emailProbes,
		);
	});

	test("email at registration matches the server", () => {
		assertClientIsNoLooser(
			"email (registration)",
			accepts(serverEmail),
			acceptsField(registerSchema, "email", {
				name: "Ada",
				password: "Aa1!aaaa",
				role: "artist",
			}),
			emailProbes,
		);
	});

	//	The form uses "" for "no avatar" and the call site translates it to null
	//	before sending (ProfileSection.tsx: `checked.data.avatarUrl || null`), so
	//	"" is compared against what actually goes on the wire.
	test("avatarUrl refuses the same unsafe shapes on both sides", () => {
		assertClientIsNoLooser(
			"avatarUrl",
			(value) => serverAvatarUrl.nullable().safeParse(value === "" ? null : value).success,
			acceptsField(accountSchema, "avatarUrl", { username: "ada", email: "a@b.co" }),
			[
				"/api/files/abc/raw",
				"https://cdn.example/x.png",
				"http://example.com/x.png",
				"//evil.example/x.png",
				"javascript:alert(1)",
				"data:image/png;base64,AAAA",
				"file:///etc/passwd",
				"not a url",
				"/" + "a".repeat(SERVER_LIMITS.url),
			],
		);
	});
});

describe("profile detail fields", () => {
	const base = { categories: ["painting"], location: "", availability: true };

	test("bio is bounded the same on both sides", () => {
		assertClientIsNoLooser(
			"bio",
			acceptsField(updateProfileBody, "bio", {}),
			acceptsField(artistDetailsSchema, "bio", { ...base, bio: "" }),
			[
				"a".repeat(SERVER_LIMITS.longText),
				"a".repeat(SERVER_LIMITS.longText + 1),
				"a".repeat(5000),
			],
		);
	});

	test("location is bounded the same on both sides", () => {
		assertClientIsNoLooser(
			"location",
			acceptsField(updateProfileBody, "location", {}),
			acceptsField(artistDetailsSchema, "location", { ...base, bio: "" }),
			["a".repeat(SERVER_LIMITS.shortText), "a".repeat(SERVER_LIMITS.shortText + 1)],
		);
	});

	//	A slug is picked from a list rather than typed, but it still travels as
	//	a string, and the server parses each entry with requiredText(…, 60) —
	//	so an unbounded array element here would be a 400 the form let through.
	test("a category slug is bounded like the server parses it", () => {
		assertClientIsNoLooser(
			"profile categories",
			acceptsField(updateProfileBody, "categories", {}),
			acceptsField(artistDetailsSchema, "categories", { ...base, bio: "" }),
			[["painting"], ["a".repeat(60)], ["a".repeat(61)], [""], ["   "], ["one", "​"], "painting"],
		);
	});

	//	Only the hirer form collects this one.
	test("organizationName is bounded the same on both sides", () => {
		assertClientIsNoLooser(
			"organizationName",
			acceptsField(updateProfileBody, "organizationName", {}),
			acceptsField(hirerDetailsSchema, "organizationName", { bio: "", location: "" }),
			textProbes(SERVER_LIMITS.shortText),
		);
	});

	test("availability is a boolean on both sides", () => {
		assertClientIsNoLooser(
			"availability",
			acceptsField(updateProfileBody, "availability", {}),
			acceptsField(artistDetailsSchema, "availability", { ...base, bio: "" }),
			[true, false, "on", "true", 1, null],
		);
	});

	//	The client is allowed to be stricter, and here it is: the bio counter
	//	promises 280 where the server would take 2000. Asserted so that a later
	//	edit cannot quietly raise it past the server's ceiling.
	test("the bio ceiling the counter promises is within the server's", () => {
		expect(MAX_BIO_LENGTH).toBeLessThanOrEqual(SERVER_LIMITS.longText);
	});
});

describe("gig fields", () => {
	//	Compared against the primitives gigs.schema.ts builds these fields from,
	//	rather than against createGigBody itself. That schema imports a Prisma
	//	enum for `status`, and the generated client is gitignored — importing it
	//	here would make this package's `npm run build` fail on a fresh clone
	//	until someone ran `prisma generate` in the other one. The bounds are the
	//	same either way; `status` has no field on this form to drift against.
	const clientBase = {
		title: "A gig",
		category: "painting",
		description: "",
		location: "",
		rate: "",
	};

	test("title is bounded the same on both sides", () => {
		assertClientIsNoLooser(
			"gig title",
			accepts(requiredText("title", SERVER_LIMITS.shortText)),
			acceptsField(opportunitySchema, "title", clientBase),
			textProbes(SERVER_LIMITS.shortText),
		);
	});

	test("description is bounded the same on both sides", () => {
		assertClientIsNoLooser(
			"gig description",
			accepts(paragraph("description", SERVER_LIMITS.longText)),
			acceptsField(opportunitySchema, "description", clientBase),
			[
				"a".repeat(SERVER_LIMITS.longText),
				"a".repeat(SERVER_LIMITS.longText + 1),
				"a".repeat(5000),
			],
		);
	});

	test("location is bounded the same on both sides", () => {
		assertClientIsNoLooser(
			"gig location",
			accepts(optionalText("location", SERVER_LIMITS.shortText)),
			acceptsField(opportunitySchema, "location", clientBase),
			["a".repeat(SERVER_LIMITS.shortText), "a".repeat(SERVER_LIMITS.shortText + 1)],
		);
	});

	//	The form holds a rate as the string an <input> gives it and converts on
	//	submit, so the client is compared on the string and the server on the
	//	number that string becomes.
	const rateProbes = [
		String(SERVER_LIMITS.rate),
		String(SERVER_LIMITS.rate + 1),
		"9999999999",
		"-1",
		"12.5",
		"abc",
	];

	test("the gig rate has the same ceiling on both sides", () => {
		assertClientIsNoLooser(
			"gig rate",
			(value) => serverRate.safeParse(Number(value)).success,
			acceptsField(opportunitySchema, "rate", clientBase),
			rateProbes,
		);
	});
});

describe("message content", () => {
	test("the composer refuses what the server would refuse", () => {
		assertClientIsNoLooser(
			"message content",
			accepts(requiredParagraph("content", SERVER_LIMITS.longText)),
			accepts(messageContentSchema),
			[
				"a".repeat(SERVER_LIMITS.longText),
				"a".repeat(SERVER_LIMITS.longText + 1),
				"",
				"   ",
				"\n\n",
				"​​​",
			],
		);
	});
});
