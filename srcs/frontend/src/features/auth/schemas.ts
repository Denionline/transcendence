import { z } from "zod";

export const loginSchema = z.object({
	email: z.string().min(1, "Email is required").email("Enter a valid email"),
	password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

const passwordSchema = z
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
	name: z.string().min(1, "Name is required"),
	email: z.string().min(1, "Email is required").email("Enter a valid email"),
	password: passwordSchema,
	role: z.enum(["artist", "hirer"]),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
