import { getAccessToken } from "../features/auth/api";

export class ApiError extends Error {
	status: number;
	code?: string;

	constructor(status: number, message: string, code?: string) {
		super(message);
		this.status = status;
		this.code = code;
	}
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
	const token = getAccessToken();
	const res = await fetch(`/api${path}`, {
		...options,
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...options.headers,
		},
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new ApiError(res.status, body.message ?? `Request failed (${res.status})`, body.error);
	}
	return res.status === 204 ? (null as T) : res.json();
}
