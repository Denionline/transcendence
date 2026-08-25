import { describe, expect, test } from "vitest";
import { z } from "zod";

import { fieldErrorsFromApi, validateForm } from "./formValidation";
import { ApiError } from "./apiClient";

//	The plumbing every form goes through. Two jobs: turn a schema failure into
//	a map an input can index, and do the same for the server's answer so a rule
//	only the server knows still lands under the right field.

const schema = z.object({
	username: z.string().min(1, "Username is required").max(5, "Too long"),
	email: z.string().min(1, "Email is required").pipe(z.email("Enter a valid email")),
});

describe("validateForm", () => {
	test("hands back the parsed data when everything is valid", () => {
		const result = validateForm(schema, { username: "ada", email: "ada@example.com" });

		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data).toEqual({ username: "ada", email: "ada@example.com" });
	});

	test("hands back the parsed value, not the raw input", () => {
		const trimming = z.object({ name: z.string().trim() });
		const result = validateForm(trimming, { name: "  ada  " });

		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data.name).toBe("ada");
	});

	test("names every failed field at once, so the whole form lights up", () => {
		const result = validateForm(schema, { username: "", email: "nope" });

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(Object.keys(result.errors).sort()).toEqual(["email", "username"]);
		}
	});

	//	A field with three problems still has one input to show them under, and
	//	the first is the one the user hits next.
	test("keeps only the first message for a field", () => {
		const strict = z.object({
			code: z.string().min(5, "Too short").regex(/^\d+$/, "Digits only"),
		});
		const result = validateForm(strict, { code: "ab" });

		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.errors.code).toBe("Too short");
	});

	test("a missing field is reported under its own name", () => {
		const result = validateForm(schema, {});

		expect(result.ok).toBe(false);
		if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(["email", "username"]);
	});

	test("a value that is not an object at all still fails cleanly", () => {
		for (const value of [null, undefined, "string", 42, []]) {
			expect(validateForm(schema, value).ok).toBe(false);
		}
	});
});

describe("fieldErrorsFromApi", () => {
	test("turns a validation error's details into per-field messages", () => {
		const error = new ApiError(400, "invalid input", "VALIDATION_ERROR", [
			{ path: "email", message: "invalid email format" },
			{ path: "username", message: "username is too long" },
		]);

		expect(fieldErrorsFromApi(error)).toEqual({
			email: "invalid email format",
			username: "username is too long",
		});
	});

	test("keeps the first message when the server reports a field twice", () => {
		const error = new ApiError(400, "invalid input", "VALIDATION_ERROR", [
			{ path: "email", message: "first" },
			{ path: "email", message: "second" },
		]);

		expect(fieldErrorsFromApi(error)).toEqual({ email: "first" });
	});

	//	Returning null is the caller's cue to show the message as a form-level
	//	banner instead. Each of these has nothing to attach to an input.
	test("returns null when there is nothing to attach to a field", () => {
		expect(fieldErrorsFromApi(new Error("network down"))).toBeNull();
		expect(fieldErrorsFromApi(new ApiError(500, "boom", "INTERNAL_ERROR"))).toBeNull();
		expect(fieldErrorsFromApi(new ApiError(400, "bad", "VALIDATION_ERROR", []))).toBeNull();
		expect(fieldErrorsFromApi(null)).toBeNull();
		expect(fieldErrorsFromApi("a string")).toBeNull();
	});

	//	A detail about the payload as a whole has an empty path — the refine on
	//	a whole object, for instance. There is no input for it.
	test("skips details with an empty path", () => {
		const onlyFormLevel = new ApiError(400, "bad", "VALIDATION_ERROR", [
			{ path: "", message: "body must be an object" },
		]);
		expect(fieldErrorsFromApi(onlyFormLevel)).toBeNull();

		const mixed = new ApiError(400, "bad", "VALIDATION_ERROR", [
			{ path: "", message: "body must be an object" },
			{ path: "email", message: "invalid email format" },
		]);
		expect(fieldErrorsFromApi(mixed)).toEqual({ email: "invalid email format" });
	});
});
