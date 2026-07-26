import test from "node:test";
import assert from "node:assert/strict";

import { assertPasswordPolicy, hashPassword, verifyPassword } from "../src/lib/password.js";
import { HttpError } from "../src/lib/http-error.js";

const OWNER = { email: "jane.doe@example.com", username: "Jane" };
const STRONG = "Correct#Horse7Battery";

function rejects(password: string, owner = OWNER) {
	assert.throws(
		() => assertPasswordPolicy(password, owner),
		(err: unknown) =>
			err instanceof HttpError && err.status === 400 && err.code === "WEAK_PASSWORD",
		`expected ${JSON.stringify(password)} to be rejected`,
	);
}

test("assertPasswordPolicy accepts a password meeting every rule", () => {
	assert.doesNotThrow(() => assertPasswordPolicy(STRONG, OWNER));
});

test("assertPasswordPolicy rejects passwords shorter than the minimum", () => {
	rejects("Ab3#efgh");
});

test("assertPasswordPolicy rejects a missing character class", () => {
	rejects("correct#horse7battery");
	rejects("CORRECT#HORSE7BATTERY");
	rejects("Correct#HorseBattery");
	rejects("Correct7HorseBattery");
});

test("assertPasswordPolicy counts the 72-byte bcrypt limit in bytes, not characters", () => {
	rejects(`Aa1#${"🙂".repeat(24)}`);
	assert.doesNotThrow(() => assertPasswordPolicy(`Aa1#${"x".repeat(60)}`, OWNER));
});

test("assertPasswordPolicy rejects common passwords even when they pass the classes", () => {
	rejects("Password123!");
	rejects("Welcome2Artmate!");
});

test("assertPasswordPolicy rejects passwords built from the owner's own details", () => {
	rejects("Jane#Doe12345");
	rejects("X7#jane.doe@example.com");
});

test("assertPasswordPolicy ignores personal tokens too short to be meaningful", () => {
	assert.doesNotThrow(() => assertPasswordPolicy(STRONG, { email: "an@x.io", username: "An" }));
});

test("hashPassword salts: the same password hashes differently every time", async () => {
	const [first, second] = await Promise.all([hashPassword(STRONG), hashPassword(STRONG)]);
	assert.notEqual(first, second, "two hashes of one password must not collide");
	assert.match(first, /^\$2[aby]\$12\$/, "expected a bcrypt digest at cost 12");
	assert.ok(await verifyPassword(STRONG, first));
	assert.ok(await verifyPassword(STRONG, second));
});

test("verifyPassword rejects a wrong password", async () => {
	assert.equal(await verifyPassword("Wrong#Horse7Battery", await hashPassword(STRONG)), false);
});

test("verifyPassword rejects a null hash without throwing", async () => {
	assert.equal(await verifyPassword(STRONG, null), false);
});
