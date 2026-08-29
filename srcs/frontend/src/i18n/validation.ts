import type { TFunction } from "i18next";
import { LIMITS } from "../lib/limits";

const VALIDATION_PARAMS = {
	usernameMax: LIMITS.username,
	emailMax: LIMITS.email,
	passwordMin: 8,
} as const;

export function translateFieldError(t: TFunction, message: string | undefined) {
	if (!message) return undefined;
	return t(message, VALIDATION_PARAMS);
}