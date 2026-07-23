function required(name: string, value: string | undefined): string {
	if (!value) throw new Error(`${name} environment variable is not set`);
	return value;
}

export const SECRET = required("JWT_SECRET", process.env.JWT_SECRET);
export const R_SECRET = required("JWT_REFRESH_SECRET", process.env.JWT_REFRESH_SECRET);

export const FT_UID = required("FT_API_UID", process.env.FT_API_UID);
export const FT_SECRET = required("FT_API_SECRET", process.env.FT_API_SECRET);
export const FT_CALLBACK_URL = required("FT_API_CALLBACK_URL", process.env.FT_API_CALLBACK_URL);
