import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ApiError, apiRequest } from "./apiClient";

//	Only the error path is exercised here. What matters for validation is that
//	the `details` array the backend's error middleware sends survives the trip
//	into ApiError — without it, fieldErrorsFromApi has nothing to work with and
//	every server-side rule shows up as a banner instead of under its field.

vi.mock("../features/auth/api", () => ({
	getAccessToken: () => null,
	hasSessionMarker: () => false,
	refreshAccessToken: vi.fn(),
}));

vi.mock("../features/auth/sessionEvents", () => ({
	notifySessionExpired: vi.fn(),
}));

/** Stubs fetch with one JSON response, as the API would send it. */
function respondWith(status: number, body: unknown) {
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue({
			ok: status >= 200 && status < 300,
			status,
			json: async () => body,
		}),
	);
}

beforeEach(() => {
	vi.unstubAllGlobals();
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("apiRequest error handling", () => {
	test("carries the validation details through to the caller", async () => {
		respondWith(400, {
			error: "VALIDATION_ERROR",
			message: "invalid input",
			details: [{ path: "email", message: "invalid email format" }],
		});

		await expect(apiRequest("/users/me", { method: "PATCH" })).rejects.toMatchObject({
			status: 400,
			code: "VALIDATION_ERROR",
			message: "invalid input",
			details: [{ path: "email", message: "invalid email format" }],
		});
	});

	test("throws an ApiError, so instanceof checks downstream work", async () => {
		respondWith(400, { error: "VALIDATION_ERROR", message: "invalid input", details: [] });

		await expect(apiRequest("/users/me")).rejects.toBeInstanceOf(ApiError);
	});

	//	details is absent on everything that is not a validation failure, and
	//	the client must not invent an empty array in its place — undefined is
	//	what fieldErrorsFromApi tests for.
	test("leaves details undefined when the server did not send any", async () => {
		respondWith(404, { error: "NOT_FOUND", message: "no such user" });

		const error = await apiRequest("/users/nope").catch((e: unknown) => e);
		expect(error).toBeInstanceOf(ApiError);
		expect((error as ApiError).details).toBeUndefined();
		expect((error as ApiError).code).toBe("NOT_FOUND");
	});

	test("falls back to a readable message when the body has none", async () => {
		respondWith(500, {});

		await expect(apiRequest("/users/me")).rejects.toMatchObject({
			status: 500,
			message: "Request failed (500)",
		});
	});

	//	A proxy or a crash can answer with something that is not JSON at all.
	test("survives a body that is not JSON", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				status: 502,
				json: async () => {
					throw new SyntaxError("Unexpected token <");
				},
			}),
		);

		await expect(apiRequest("/users/me")).rejects.toMatchObject({
			status: 502,
			message: "Request failed (502)",
		});
	});

	test("a 204 resolves to null rather than trying to parse a body", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				status: 204,
				json: async () => {
					throw new Error("should not be called");
				},
			}),
		);

		await expect(apiRequest("/files/abc", { method: "DELETE" })).resolves.toBeNull();
	});
});
