function required(name: string, value: string | undefined): string {
	if (!value) throw new Error(`${name} environment variable is not set`);
	return value;
}

/** Falls back on absent *or* empty — `??` only covers the former. */
function optional(value: string | undefined, fallback: string): string {
	const trimmed = value?.trim();
	return trimmed ? trimmed : fallback;
}

/**
 * Same fallback rule, plus a numeric guard. A typo'd value is not an absence,
 * so it throws at boot rather than quietly becoming NaN (every comparison
 * false, so multer's limit never fires) or 0 (every upload 413s).
 */
function positive(name: string, value: string | undefined, fallback: number): number {
	const raw = optional(value, "");
	if (!raw) return fallback;
	const parsed = Number(raw);
	if (!Number.isFinite(parsed) || parsed <= 0)
		throw new Error(`${name} must be a positive number, got "${raw}"`);
	return parsed;
}

export const SECRET = required("JWT_SECRET", process.env.JWT_SECRET);
export const R_SECRET = required("JWT_REFRESH_SECRET", process.env.JWT_REFRESH_SECRET);

export const FT_UID = required("FT_API_UID", process.env.FT_API_UID);
export const FT_SECRET = required("FT_API_SECRET", process.env.FT_API_SECRET);
export const FT_CALLBACK_URL = required("FT_API_CALLBACK_URL", process.env.FT_API_CALLBACK_URL);

export const FRONTEND_URL = required("FRONTEND_URL", process.env.FRONTEND_URL);

// Neither is passed to `required()`: both have a safe default, so a teammate
// who pulls this branch without editing their .env still gets a working app.
// The default is the in-container path; the host (tests, CI) overrides it.
//
// `??` would be wrong here. .env.example ships every key with an empty value,
// so a copied-but-unedited file hands us "" — which is defined, passes `??`
// untouched, and is catastrophic for both: path.resolve("") is the *process
// working directory* (bytes written outside the volume, lost on rebuild), and
// Number("") is 0 (multer rejects every upload, including a 2 KB avatar).
// `optional()` uses the same falsy test as `required()` above.
export const UPLOAD_DIR = optional(process.env.UPLOAD_DIR, "/app/uploads");
export const MAX_UPLOAD_MB = positive("MAX_UPLOAD_MB", process.env.MAX_UPLOAD_MB, 50);
