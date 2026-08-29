import { z } from "zod";
import { LIMITS } from "../../lib/limits";
import { sanitizeLine } from "../../lib/sanitize";

//	Bounds mirror srcs/backend/src/lib/schemas.ts (LIMITS), and
//	srcs/frontend/src/test/parity.test.ts fails if they drift apart.
//
//	Messages are i18n *keys*, not sentences. These schemas are built once at
//	module load, outside React, so they cannot call t() — the component that
//	renders the error resolves the key instead, via translateFieldError().
//	Keep every key below present in src/i18n/locales/*.json; check:i18n fails
//	the build if a language is missing one.

const emailField = z
	.string()
	.trim()
	.min(1, "auth.errors.emailRequired")
	.max(LIMITS.email, "auth.errors.emailTooLong")
	.pipe(z.email("auth.errors.emailInvalid"));

export const loginSchema = z.object({
	email: emailField,
	password: z.string().min(1, "auth.errors.passwordRequired"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

//	Exported: the settings page changes a password too, and used to ask for
//	four characters where this asks for eight and four character classes —
//	the one place the client was laxer than the server it talks to.
export const passwordSchema = z
	.string()
	.min(8, "auth.errors.passwordTooShort")
	.regex(/[a-z]/, "auth.errors.passwordNeedsLowercase")
	.regex(/[A-Z]/, "auth.errors.passwordNeedsUppercase")
	.regex(/[0-9]/, "auth.errors.passwordNeedsDigit")
	.regex(/[^a-zA-Z0-9]/, "auth.errors.passwordNeedsSymbol")
	.refine((value) => new TextEncoder().encode(value).length <= 72, {
		message: "auth.errors.passwordTooLong",
	});

export const registerSchema = z.object({
	//	This becomes the username on the server, so it carries the username's
	//	bound — and is sanitized first, or a name of nothing but zero-width
	//	spaces passes here and is refused there.
	name: z
		.string()
		.transform(sanitizeLine)
		.pipe(
			z.string().min(1, "auth.errors.nameRequired").max(LIMITS.username, "auth.errors.nameTooLong"),
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
		currentPassword: z.string().min(1, "auth.errors.currentPasswordRequired"),
		newPassword: passwordSchema,
		confirmPassword: z.string().min(1, "auth.errors.confirmPasswordRequired"),
	})
	.refine((values) => values.newPassword === values.confirmPassword, {
		message: "auth.errors.passwordsDoNotMatch",
		path: ["confirmPassword"],
	});

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
