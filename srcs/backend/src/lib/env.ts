function required(name: string, value: string | undefined): string {
	if (!value)
		throw new Error(`${name} environment variable is not set`);
	return value;
}

export const SECRET = required("JWT_SECRET", process.env.JWT_SECRET);
export const R_SECRET = required("JWT_REFRESH_SECRET", process.env.JWT_REFRESH_SECRET);