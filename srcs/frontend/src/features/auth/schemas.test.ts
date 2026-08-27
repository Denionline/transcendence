import { describe, expect, test } from "vitest";
import type { ZodType } from "zod";

import { changePasswordSchema, loginSchema, passwordSchema, registerSchema } from "./schemas";
import { LIMITS } from "../../lib/limits";

const validRegistration = {
	name: "Ada Lovelace",
	email: "ada@example.com",
	password: "Str0ng!pass",
	role: "artist" as const,
};

/** The first message for one field, which is what that input shows. */
function messageFor(schema: ZodType, value: unknown, field: string): string | null {
	const result = schema.safeParse(value);
	if (result.success) return null;
	return result.error.issues.find((issue) => issue.path[0] === field)?.message ?? null;
}

describe("loginSchema", () => {
	test("accepts a well-formed login", () => {
		expect(loginSchema.safeParse({ email: "ada@example.com", password: "x" }).success).toBe(true);
	});

	test("asks for an email that looks like one", () => {
		expect(messageFor(loginSchema, { email: "nope", password: "x" }, "email")).toBe(
			"Enter a valid email",
		);
		expect(messageFor(loginSchema, { email: "", password: "x" }, "email")).toBe(
			"Email is required",
		);
	});

	test("asks for a password without judging it — that is the server's job here", () => {
		expect(loginSchema.safeParse({ email: "a@b.co", password: "short" }).success).toBe(true);
		expect(messageFor(loginSchema, { email: "a@b.co", password: "" }, "password")).toBe(
			"Password is required",
		);
	});
});

describe("passwordSchema", () => {
	test("accepts a password meeting all four character classes", () => {
		expect(passwordSchema.safeParse("Str0ng!pass").success).toBe(true);
	});

	test("names the class that is missing", () => {
		const cases: [string, string][] = [
			["SHORT1!", "Password must be at least 8 characters"],
			["alllower1!", "Password must contain an uppercase letter"],
			["ALLUPPER1!", "Password must contain a lowercase letter"],
			["NoDigits!!", "Password must contain a digit"],
			["NoSymbols1", "Password must contain a symbol"],
		];

		for (const [password, expected] of cases) {
			const result = passwordSchema.safeParse(password);
			expect(result.success, `${password} should be refused`).toBe(false);
			if (!result.success) expect(result.error.issues[0].message).toBe(expected);
		}
	});

	//	bcrypt truncates at 72 *bytes*, not characters, and the backend refuses
	//	anything longer rather than silently ignoring the tail.
	test("measures the 72-byte ceiling in bytes, not characters", () => {
		expect(passwordSchema.safeParse("Aa1!" + "a".repeat(68)).success).toBe(true);
		expect(passwordSchema.safeParse("Aa1!" + "a".repeat(69)).success).toBe(false);
		//	Each emoji is four bytes: 20 of them is 80 bytes in 20 characters.
		expect(passwordSchema.safeParse("Aa1!" + "\u{1F600}".repeat(20)).success).toBe(false);
	});
});

describe("registerSchema", () => {
	test("accepts a well-formed registration", () => {
		expect(registerSchema.safeParse(validRegistration).success).toBe(true);
	});

	test("only offers the two self-service roles", () => {
		expect(registerSchema.safeParse({ ...validRegistration, role: "hirer" }).success).toBe(true);
		expect(registerSchema.safeParse({ ...validRegistration, role: "admin" }).success).toBe(false);
	});

	//	The bug the parity suite caught: this had no upper bound, so a long name
	//	passed here and came back a 400 from the server.
	test("bounds the name at the username limit the server enforces", () => {
		expect(
			registerSchema.safeParse({ ...validRegistration, name: "a".repeat(LIMITS.username) }).success,
		).toBe(true);
		expect(
			registerSchema.safeParse({ ...validRegistration, name: "a".repeat(LIMITS.username + 1) })
				.success,
		).toBe(false);
	});

	test("a name of nothing but spaces or invisibles is not a name", () => {
		for (const name of ["   ", "​​​", "‮"]) {
			expect(registerSchema.safeParse({ ...validRegistration, name }).success).toBe(false);
		}
	});

	test("sanitizes the name it hands back", () => {
		const result = registerSchema.safeParse({ ...validRegistration, name: "  Ada\tLovelace  " });
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.name).toBe("Ada Lovelace");
	});

	test("bounds the email at RFC 5321's limit, as the server does", () => {
		const atLimit = "a".repeat(LIMITS.email - 12) + "@example.com";
		expect(registerSchema.safeParse({ ...validRegistration, email: atLimit }).success).toBe(true);
		expect(registerSchema.safeParse({ ...validRegistration, email: "a" + atLimit }).success).toBe(
			false,
		);
	});
});

describe("changePasswordSchema", () => {
	const valid = {
		currentPassword: "old-one",
		newPassword: "Str0ng!pass",
		confirmPassword: "Str0ng!pass",
	};

	test("accepts a matching pair that meets the policy", () => {
		expect(changePasswordSchema.safeParse(valid).success).toBe(true);
	});

	//	The mismatch is reported under confirmPassword rather than at the top,
	//	so it lands on the field the user has to fix.
	test("a mismatch is reported under confirmPassword", () => {
		const result = changePasswordSchema.safeParse({ ...valid, confirmPassword: "Different1!" });

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].path).toEqual(["confirmPassword"]);
			expect(result.error.issues[0].message).toBe("Passwords do not match");
		}
	});

	//	The settings page used to ask for four characters here where
	//	registration asked for eight — the one place the client was laxer than
	//	the server it talks to.
	test("holds the new password to the same policy registration uses", () => {
		expect(
			changePasswordSchema.safeParse({
				...valid,
				newPassword: "weak",
				confirmPassword: "weak",
			}).success,
		).toBe(false);
	});

	test("requires the current password", () => {
		expect(changePasswordSchema.safeParse({ ...valid, currentPassword: "" }).success).toBe(false);
	});
});
