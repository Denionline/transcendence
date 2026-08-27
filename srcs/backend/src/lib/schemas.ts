import { z } from "zod";
import { sanitizeLine, sanitizeParagraph } from "./sanitize.js";

export const LIMITS = {
	id: 64,
	email: 254,
	username: 40,
	shortText: 120,
	longText: 2000,
	url: 2048,
	rate: 1_000_000,
} as const;

export const id = z
	.string("id must be a string")
	.trim()
	.min(1, "id is required")
	.max(LIMITS.id, "id is too long");

export const idParams = z.object({ id });

export const email = z
	.string("email must be a string")
	.trim()
	.toLowerCase()
	.max(LIMITS.email, `email must be at most ${LIMITS.email} characters`)
	.pipe(z.email("invalid email format"));

export const password = z
	.string("password must be a string")
	.min(1, "password is required")
	.max(512, "password is too long");

function sanitizedText(
	field: string,
	max: number,
	minimum: number,
	clean: (value: string) => string,
) {
	return z
		.string(`${field} must be a string`)
		.transform(clean)
		.pipe(
			z
				.string()
				.min(minimum, `${field} cannot be empty`)
				.max(max, `${field} must be at most ${max} characters`),
		);
}

export function requiredText(field: string, max: number = LIMITS.shortText) {
	return sanitizedText(field, max, 1, sanitizeLine);
}

export function optionalText(field: string, max: number = LIMITS.shortText) {
	return sanitizedText(field, max, 0, sanitizeLine);
}

export function nullableText(field: string, max: number = LIMITS.shortText) {
	return optionalText(field, max).nullable();
}

export function paragraph(field: string, max: number = LIMITS.longText) {
	return sanitizedText(field, max, 0, sanitizeParagraph);
}

export function requiredParagraph(field: string, max: number = LIMITS.longText) {
	return sanitizedText(field, max, 1, sanitizeParagraph);
}

export function nullableParagraph(field: string, max: number = LIMITS.longText) {
	return paragraph(field, max).nullable();
}

export const username = requiredText("username", LIMITS.username);

function isSafeAvatarUrl(value: string): boolean {
	if (value.startsWith("//")) return false;
	if (value.startsWith("/")) return true;

	try {
		const { protocol } = new URL(value);
		return protocol === "http:" || protocol === "https:";
	} catch {
		return false;
	}
}

export const avatarUrl = z
	.string("avatarUrl must be a string")
	.trim()
	.max(LIMITS.url, "avatarUrl is too long")
	.refine(isSafeAvatarUrl, "avatarUrl must be a same-origin path or an http(s) URL");

export const rate = z
	.number("rate must be a number")
	.int("rate must be a whole number")
	.min(0, "rate cannot be negative")
	.max(LIMITS.rate, `rate must be at most ${LIMITS.rate}`);

export function enumOf<T extends Record<string, string>>(values: T, field: string) {
	return z.enum(
		Object.values(values) as [T[keyof T], ...T[keyof T][]],
		`${field} must be one of: ${Object.values(values).join(", ")}`,
	);
}
