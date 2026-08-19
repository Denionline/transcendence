function required(name: string, value: string | undefined): string {
	if (!value) throw new Error(`${name} environment variable is not set`);
	return value;
}

function optional(value: string | undefined, fallback: string): string {
	const trimmed = value?.trim();
	return trimmed ? trimmed : fallback;
}

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

export const UPLOAD_DIR = optional(process.env.UPLOAD_DIR, "/app/uploads");
export const MAX_UPLOAD_MB = positive("MAX_UPLOAD_MB", process.env.MAX_UPLOAD_MB, 50);
