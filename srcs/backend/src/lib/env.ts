function required(name: string, value: string | undefined): string {
	if (!value)
		throw new Error(`${name} environment variable is not set`);
	return value;
}

export const SECRET = required("JWT_SECRET", process.env.JWT_SECRET);