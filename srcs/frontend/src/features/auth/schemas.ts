import { z } from "zod";
import { LIMITS } from "../../lib/limits";
import { sanitizeLine } from "../../lib/sanitize";

//	Bounds mirror srcs/backend/src/lib/schemas.ts (LIMITS), and
//	srcs/frontend/src/test/parity.test.ts fails if they drift apart.

const emailField = z
	.string()
	.trim()
	.min(1, "Email is required")
	.max(LIMITS.email, "That email address is too long")
	.pipe(z.email("Enter a valid email"));

export const loginSchema = z.object({
	email: emailField,
	password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

//	Exported: the settings page changes a password too, and used to ask for
//	four characters where this asks for eight and four character classes —
//	the one place the client was laxer than the server it talks to.
export const passwordSchema = z
	.string()
	.min(8, "Password must be at least 8 characters")
	.regex(/[a-z]/, "Password must contain a lowercase letter")
	.regex(/[A-Z]/, "Password must contain an uppercase letter")
	.regex(/[0-9]/, "Password must contain a digit")
	.regex(/[^a-zA-Z0-9]/, "Password must contain a symbol")
	.refine((value) => new TextEncoder().encode(value).length <= 72, {
		message: "Password is too long",
	});

export const registerSchema = z.object({
	//	This becomes the username on the server, so it carries the username's
	//	bound — and is sanitized first, or a name of nothing but zero-width
	//	spaces passes here and is refused there.
	name: z
		.string()
		.transform(sanitizeLine)
		.pipe(
			z
				.string()
				.min(1, "Name is required")
				.max(LIMITS.username, `Keep the name under ${LIMITS.username} characters`),
		),
	email: emailField,
	password: passwordSchema,
	role: z.enum(["artist", "hirer"]),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;

//	The settings page's own form. `confirmPassword` carries the mismatch
//	message so it lands under the field the user has to fix, not at the top.
export const changePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, "Enter your current password"),
		newPassword: passwordSchema,
		confirmPassword: z.string().min(1, "Confirm your new password"),
	})
	.refine((values) => values.newPassword === values.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
