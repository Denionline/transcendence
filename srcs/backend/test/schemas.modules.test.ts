import test, { describe } from "node:test";
import assert from "node:assert/strict";
import type { ZodType } from "zod";

import { loginBody, registerBody } from "../src/modules/auth/auth.schema.js";
import { listUsersQuery, updateUserBody, userIdParams } from "../src/modules/users/users.schema.js";
import {
	createGigBody,
	gigIdParams,
	listGigsQuery,
	updateGigBody,
} from "../src/modules/gigs/gigs.schema.js";
import { updateProfileBody } from "../src/modules/profile/profile.schema.js";
import {
	createSwipeBody,
	nextQuery,
	swipeHistoryQuery,
} from "../src/modules/swipes/swipe.schema.js";
import { createMessageBody, sendMessageEvent } from "../src/modules/messages/messages.schema.js";
import { friendIdParams, updateFriendshipBody } from "../src/modules/friends/friends.schema.js";
import { LIMITS } from "../src/lib/schemas.js";

function accept<T>(schema: ZodType<T>, value: unknown): T {
	const result = schema.safeParse(value);
	assert.equal(
		result.success,
		true,
		`expected acceptance, got: ${
			result.success
				? ""
				: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
		}`,
	);
	return result.data as T;
}

function refuse(schema: ZodType, value: unknown): string {
	const result = schema.safeParse(value);
	assert.equal(result.success, false, `expected ${JSON.stringify(value)} to be refused`);
	return result.success ? "" : result.error.issues[0].message;
}

function failedFields(schema: ZodType, value: unknown): string[] {
	const result = schema.safeParse(value);
	assert.equal(result.success, false, "expected a failure to read fields from");
	return result.success ? [] : result.error.issues.map((issue) => issue.path.join("."));
}

describe("auth.schema", () => {
	const valid = {
		name: "Ada Lovelace",
		email: "Ada@Example.com",
		password: "correct horse battery",
		role: "artist",
	};

	test("a well-formed registration parses and normalises the email", () => {
		assert.equal(accept(registerBody, valid).email, "ada@example.com");
	});

	test("role=admin is refused: admin is granted, never self-assigned", () => {
		assert.match(refuse(registerBody, { ...valid, role: "admin" }), /artist.*hirer|hirer/);
	});

	test("an unknown role is refused rather than defaulted", () => {
		refuse(registerBody, { ...valid, role: "moderator" });
		refuse(registerBody, { ...valid, role: "" });
	});

	test("every required field is required", () => {
		for (const field of ["name", "email", "password", "role"]) {
			const body: Record<string, unknown> = { ...valid };
			delete body[field];
			assert.deepEqual(failedFields(registerBody, body), [field]);
		}
	});

	test("the name is bounded at the username limit, not left open", () => {
		accept(registerBody, { ...valid, name: "a".repeat(LIMITS.username) });
		assert.deepEqual(
			failedFields(registerBody, { ...valid, name: "a".repeat(LIMITS.username + 1) }),
			["name"],
		);
	});

	test("loginBody asks for exactly an email and a password", () => {
		assert.deepEqual(accept(loginBody, { email: "a@b.co", password: "x" }), {
			email: "a@b.co",
			password: "x",
		});
		refuse(loginBody, { email: "a@b.co" });
		refuse(loginBody, { email: "nope", password: "x" });
	});

	test("an unknown key is dropped rather than refused", () => {
		const parsed = accept(registerBody, { ...valid, isAdmin: true });
		assert.equal("isAdmin" in parsed, false);
	});
});

describe("users.schema", () => {
	test("userIdParams requires an id", () => {
		assert.deepEqual(accept(userIdParams, { id: "u1" }), { id: "u1" });
		refuse(userIdParams, {});
	});

	test("listUsersQuery refuses an unknown role rather than ignoring it", () => {
		assert.deepEqual(accept(listUsersQuery, { role: "artist" }), { role: "artist" });
		assert.match(refuse(listUsersQuery, { role: "wizard" }), /role must be one of/);
	});

	test("listUsersQuery treats both filters as optional", () => {
		assert.deepEqual(accept(listUsersQuery, {}), {});
	});

	test("listUsersQuery bounds the search term", () => {
		accept(listUsersQuery, { search: "a".repeat(LIMITS.shortText) });
		assert.deepEqual(failedFields(listUsersQuery, { search: "a".repeat(LIMITS.shortText + 1) }), [
			"search",
		]);
	});

	test("updateUserBody is a partial update: an empty body parses", () => {
		assert.deepEqual(accept(updateUserBody, {}), {});
	});

	test("updateUserBody accepts null avatarUrl to clear it back to initials", () => {
		assert.equal(accept(updateUserBody, { avatarUrl: null }).avatarUrl, null);
	});

	test("updateUserBody refuses an unsafe avatarUrl", () => {
		assert.deepEqual(failedFields(updateUserBody, { avatarUrl: "javascript:alert(1)" }), [
			"avatarUrl",
		]);
	});

	test("updateUserBody accepts a role, leaving authorisation to the route", () => {
		assert.equal(accept(updateUserBody, { role: "admin" }).role, "admin");
	});

	test("every failed field is reported at once", () => {
		const fields = failedFields(updateUserBody, {
			email: "nope",
			username: "",
			avatarUrl: "data:text/html,x",
		});
		assert.deepEqual(fields.sort(), ["avatarUrl", "email", "username"]);
	});
});

describe("gigs.schema", () => {
	const valid = { title: "Mural for a cafe", category: "painting" };

	test("title and category are the only required fields", () => {
		assert.deepEqual(accept(createGigBody, valid), valid);
		assert.deepEqual(failedFields(createGigBody, { category: "painting" }), ["title"]);
		assert.deepEqual(failedFields(createGigBody, { title: "x" }), ["category"]);
	});

	test("the optional fields parse when given", () => {
		const parsed = accept(createGigBody, {
			...valid,
			description: "Two walls, exterior.",
			location: "Porto",
			rate: 500,
			status: "open",
		});
		assert.equal(parsed.rate, 500);
		assert.equal(parsed.status, "open");
	});

	test("an unknown status is refused", () => {
		assert.match(refuse(createGigBody, { ...valid, status: "pending" }), /status must be one of/);
	});

	test("a rate sent as a string from a form is refused, not coerced", () => {
		assert.deepEqual(failedFields(createGigBody, { ...valid, rate: "500" }), ["rate"]);
	});

	test("gig text is sanitized and bounded like everything else", () => {
		assert.equal(accept(createGigBody, { ...valid, title: "  a\nb  " }).title, "a b");
		assert.deepEqual(failedFields(createGigBody, { ...valid, title: "a".repeat(121) }), ["title"]);
		assert.deepEqual(
			failedFields(createGigBody, { ...valid, description: "a".repeat(LIMITS.longText + 1) }),
			["description"],
		);
	});

	test("updateGigBody accepts an empty body, leaving no-op detection to the service", () => {
		assert.deepEqual(accept(updateGigBody, {}), {});
		assert.equal(accept(updateGigBody, { title: "New title" }).title, "New title");
	});

	test("updateGigBody still enforces the bounds it inherited", () => {
		assert.deepEqual(failedFields(updateGigBody, { title: "" }), ["title"]);
		assert.deepEqual(failedFields(updateGigBody, { status: "nope" }), ["status"]);
	});

	test("listGigsQuery treats ?mine as a flag, whatever its value", () => {
		for (const mine of ["", "1", "true", "anything"]) {
			assert.equal(accept(listGigsQuery, { mine }).mine, mine);
		}
	});

	test("listGigsQuery refuses an unknown status filter", () => {
		assert.deepEqual(accept(listGigsQuery, {}), {});
		refuse(listGigsQuery, { status: "archived" });
	});

	test("gigIdParams requires an id", () => {
		assert.deepEqual(accept(gigIdParams, { id: "g1" }), { id: "g1" });
		refuse(gigIdParams, {});
	});
});

describe("profile.schema", () => {
	test("every field is optional: an empty body parses", () => {
		assert.deepEqual(accept(updateProfileBody, {}), {});
	});

	test("bio and location accept null to clear and a string to set", () => {
		assert.equal(accept(updateProfileBody, { bio: null }).bio, null);
		assert.equal(accept(updateProfileBody, { location: null }).location, null);
		assert.equal(accept(updateProfileBody, { bio: "  hello  " }).bio, "hello");
	});

	test("organizationName is required-when-present: null is not a way to clear it", () => {
		assert.equal(accept(updateProfileBody, { organizationName: "Cafe" }).organizationName, "Cafe");
		assert.deepEqual(failedFields(updateProfileBody, { organizationName: null }), [
			"organizationName",
		]);
		assert.deepEqual(failedFields(updateProfileBody, { organizationName: "  " }), [
			"organizationName",
		]);
	});

	test("availability must be a real boolean, not a string from a form", () => {
		assert.equal(accept(updateProfileBody, { availability: false }).availability, false);
		assert.match(
			refuse(updateProfileBody, { availability: "true" }),
			/availability must be a boolean/,
		);
	});

	test("categories is shape-checked here and counted elsewhere", () => {
		assert.deepEqual(accept(updateProfileBody, { categories: ["painting", "mural"] }).categories, [
			"painting",
			"mural",
		]);
		assert.deepEqual(accept(updateProfileBody, { categories: [] }).categories, []);
		accept(updateProfileBody, { categories: Array(50).fill("painting") });
		refuse(updateProfileBody, { categories: "painting" });
		refuse(updateProfileBody, { categories: [""] });
	});

	test("bio keeps its line breaks, being prose", () => {
		assert.equal(accept(updateProfileBody, { bio: "one\ntwo" }).bio, "one\ntwo");
	});
});

describe("swipe.schema", () => {
	test("createSwipeBody needs a gigId and a real boolean", () => {
		assert.deepEqual(accept(createSwipeBody, { gigId: "g1", liked: true }), {
			gigId: "g1",
			liked: true,
		});
		assert.deepEqual(failedFields(createSwipeBody, { gigId: "g1" }), ["liked"]);
		assert.match(refuse(createSwipeBody, { gigId: "g1", liked: "yes" }), /liked must be a boolean/);
		assert.deepEqual(failedFields(createSwipeBody, { liked: true }), ["gigId"]);
	});

	test("targetUserId is optional", () => {
		assert.equal(
			accept(createSwipeBody, { gigId: "g1", liked: false, targetUserId: "u2" }).targetUserId,
			"u2",
		);
	});

	test("nextQuery takes everything as optional", () => {
		assert.deepEqual(accept(nextQuery, {}), {});
		assert.equal(accept(nextQuery, { excludeIds: "a,b,c" }).excludeIds, "a,b,c");
	});

	test("an id list is bounded before it is ever split", () => {
		accept(nextQuery, { excludeIds: "a".repeat(2000) });
		assert.deepEqual(failedFields(nextQuery, { excludeIds: "a".repeat(2001) }), ["excludeIds"]);
		assert.deepEqual(failedFields(nextQuery, { categories: "a".repeat(2001) }), ["categories"]);
	});

	test("swipeHistoryQuery takes liked as the string it arrives as", () => {
		assert.equal(accept(swipeHistoryQuery, { liked: "true" }).liked, "true");
		assert.equal(accept(swipeHistoryQuery, { liked: "false" }).liked, "false");
		assert.match(refuse(swipeHistoryQuery, { liked: "1" }), /liked must be true or false/);
		assert.match(refuse(swipeHistoryQuery, { liked: true }), /liked must be true or false/);
	});
});

describe("messages.schema", () => {
	test("content is required prose, sanitized before it is measured", () => {
		assert.equal(accept(createMessageBody, { content: "  hello  " }).content, "hello");
		assert.equal(accept(createMessageBody, { content: "one\ntwo" }).content, "one\ntwo");
	});

	test("a message of nothing but whitespace or invisibles is not a message", () => {
		assert.match(refuse(createMessageBody, { content: "   " }), /content cannot be empty/);
		assert.match(refuse(createMessageBody, { content: "​​" }), /content cannot be empty/);
		refuse(createMessageBody, {});
	});

	test("content is capped at the longText limit", () => {
		accept(createMessageBody, { content: "a".repeat(LIMITS.longText) });
		assert.deepEqual(
			failedFields(createMessageBody, { content: "a".repeat(LIMITS.longText + 1) }),
			["content"],
		);
	});

	test("the socket event carries a matchId as well as content", () => {
		assert.deepEqual(accept(sendMessageEvent, { matchId: "m1", content: "hi" }), {
			matchId: "m1",
			content: "hi",
		});
		assert.deepEqual(failedFields(sendMessageEvent, { content: "hi" }), ["matchId"]);
	});

	test("an event with no payload at all is refused rather than throwing", () => {
		for (const payload of [undefined, null, "", 42, [], "not an object"]) {
			assert.equal(sendMessageEvent.safeParse(payload).success, false);
		}
	});
});

describe("friends.schema", () => {
	test("an invite decision is a boolean, not a string a form happened to send", () => {
		assert.deepEqual(accept(updateFriendshipBody, { accepted: true }), { accepted: true });
		assert.deepEqual(accept(updateFriendshipBody, { accepted: false }), { accepted: false });

		for (const accepted of ["true", "false", 1, 0, "yes", null]) {
			assert.match(refuse(updateFriendshipBody, { accepted }), /accepted must be a boolean/);
		}
	});

	test("a PATCH with no body is refused rather than throwing on a missing property", () => {
		for (const payload of [{}, undefined, null]) {
			assert.equal(updateFriendshipBody.safeParse(payload).success, false);
		}
	});

	test("unknown keys are stripped, so a stray field cannot reach the service", () => {
		assert.deepEqual(accept(updateFriendshipBody, { accepted: true, status: "blocked" }), {
			accepted: true,
		});
	});

	test("the friend id is bounded and required", () => {
		assert.deepEqual(accept(friendIdParams, { id: "u1" }), { id: "u1" });
		assert.deepEqual(failedFields(friendIdParams, {}), ["id"]);
		assert.match(refuse(friendIdParams, { id: "  " }), /id is required/);
		assert.match(refuse(friendIdParams, { id: "a".repeat(LIMITS.id + 1) }), /id is too long/);
	});
});
