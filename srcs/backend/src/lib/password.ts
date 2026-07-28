import bcrypt from "bcrypt";
import { throwError } from "./http-error.js";

const BCRYPT_COST = 12;
const MAX_PASSWORD_BYTES = 72;
const MIN_PASSWORD_LENGTH = 8;
const MIN_PERSONAL_TOKEN_LENGTH = 4;

const TIMING_EQUALIZER_HASH = "$2b$12$ZfxlXwHRIUX8j.mum78f9ez/iX2s8zIlNy4O/tPpdxWnOJ1mlyp..";

const COMMON_PASSWORDS = [
	"password",
	"passw0rd",
	"qwerty",
	"azerty",
	"123456",
	"12345678",
	"letmein",
	"welcome",
	"iloveyou",
	"admin",
	"artmate",
	"transcendence",
];

const CHARACTER_CLASSES = [
	{ test: /[a-z]/, label: "a lowercase letter" },
	{ test: /[A-Z]/, label: "an uppercase letter" },
	{ test: /[0-9]/, label: "a digit" },
	{ test: /[^a-zA-Z0-9]/, label: "a symbol" },
];

function personalTokens(owner: { email: string; username: string }) {
	const [localPart] = owner.email.split("@");
	return [localPart, owner.username]
		.map((token) => token.trim().toLowerCase())
		.filter((token) => token.length >= MIN_PERSONAL_TOKEN_LENGTH);
}

export function assertPasswordPolicy(password: string, owner: { email: string; username: string }) {
	if (password.length < MIN_PASSWORD_LENGTH)
		throwError(400, "WEAK_PASSWORD", `password must be at least ${MIN_PASSWORD_LENGTH} characters`);
	if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES)
		throwError(400, "WEAK_PASSWORD", `password must be at most ${MAX_PASSWORD_BYTES} bytes`);

	const missing = CHARACTER_CLASSES.filter(({ test }) => !test.test(password)).map(
		({ label }) => label,
	);
	if (missing.length > 0)
		throwError(400, "WEAK_PASSWORD", `password must contain ${missing.join(", ")}`);

	const lowered = password.toLowerCase();
	if (COMMON_PASSWORDS.some((common) => lowered.includes(common)))
		throwError(400, "WEAK_PASSWORD", "password is too common");
	if (personalTokens(owner).some((token) => lowered.includes(token)))
		throwError(400, "WEAK_PASSWORD", "password must not contain your name or email");
}

export function hashPassword(password: string) {
	return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, hash: string | null) {
	if (!hash) {
		await bcrypt.compare(password, TIMING_EQUALIZER_HASH);
		return false;
	}
	return bcrypt.compare(password, hash);
}

export const PASSWORD_POLICY = {
	minLength: MIN_PASSWORD_LENGTH,
	maxBytes: MAX_PASSWORD_BYTES,
};
