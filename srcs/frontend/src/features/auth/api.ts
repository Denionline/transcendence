import type { Credentials, RegisterData, User } from "./types";

let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => {
	accessToken = t;
};
export const getAccessToken = () => accessToken;

export async function request(path: string, options: RequestInit = {}) {
	const res = await fetch(`/api${path}`, {
		...options,
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
			...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
			...options.headers,
		},
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		const error = new Error(body.message ?? "Request failed") as Error & {
			status?: number;
			code?: string;
			retryAfter?: number;
		};
		error.status = res.status;
		if (typeof body.error === "string") error.code = body.error;
		// Rate-limited responses (429) carry Retry-After in seconds — the
		// login form uses it to disable its submit button for that long.
		const retryAfter = Number(res.headers.get("Retry-After"));
		if (Number.isFinite(retryAfter) && retryAfter > 0) error.retryAfter = retryAfter;
		throw error;
	}
	return res.status === 204 ? null : res.json();
}

export async function registerRequest(data: RegisterData): Promise<User> {
	await request("/auth/register", {
		method: "POST",
		body: JSON.stringify({
			email: data.email,
			password: data.password,
			name: data.name,
			role: data.role,
		}),
	});
	const user = await loginRequest({ email: data.email, password: data.password });
	return user;
}

export async function loginRequest(credentials: Credentials): Promise<User> {
	const { ok, code, message, token, retryAfter, ...user } = await request("/auth/login", {
		method: "POST",
		body: JSON.stringify(credentials),
	});
	// Login answers 200 even for a wrong password, a locked account, or a hit
	// rate limit, so the browser logs no console error for a 4xx — the failure
	// is in the body. Surface it as a thrown Error, the same shape a real
	// network failure would have, so LoginForm's catch renders `message`
	// unchanged. `retryAfter` (seconds) rides along for the TOO_MANY_REQUESTS
	// case so the form can hold its submit button for that long.
	if (ok === false) {
		const error = new Error(message ?? "Login failed") as Error & {
			code?: string;
			retryAfter?: number;
		};
		error.code = code;
		if (typeof retryAfter === "number" && retryAfter > 0) error.retryAfter = retryAfter;
		throw error;
	}
	setAccessToken(token);
	return user as User;
}

// Readable companion to the HttpOnly refreshToken cookie: lets the frontend
// know a session might exist without ever exposing the token itself.
export function hasSessionMarker(): boolean {
	return document.cookie.split("; ").some((c) => c.startsWith("hasSession="));
}

// Mints a fresh access token from the HttpOnly refreshToken cookie. Shared by
// fetchMe (once, on load) and apiClient's transparent 401 retry (any time an
// in-memory access token has since expired — see apiClient.ts).
export async function refreshAccessToken(): Promise<string> {
	// /auth/refresh answers 200 even when the refresh cookie is missing or
	// expired, so a returning visitor's page load logs no console error — the
	// failure is in the body. Rethrow it as the same shape a hard failure had,
	// so fetchMe() and apiClient's transparent retry keep treating it as
	// "logged out".
	const body = await request("/auth/refresh", { method: "POST" });
	if (body?.ok === false) {
		const error = new Error(body.message ?? "Your session has expired") as Error & {
			code?: string;
		};
		if (typeof body.code === "string") error.code = body.code;
		throw error;
	}
	setAccessToken(body.token);
	return body.token;
}

export async function fetchMe(): Promise<User | null> {
	if (!hasSessionMarker()) return null;
	try {
		await refreshAccessToken();
	} catch {
		setAccessToken(null);
		return null;
	}
	return request("/auth/me");
}

export async function logoutRequest(): Promise<void> {
	await request("/auth/logout", { method: "POST" });
	setAccessToken(null);
}

export async function updateProfileRequest(
	id: string,
	updates: { username?: string; email?: string; avatarUrl?: string | null },
): Promise<User> {
	return request(`/users/${id}`, {
		method: "PUT",
		body: JSON.stringify(updates),
	});
}

export async function updatePasswordRequest(
	id: string,
	email: string,
	currentPassword: string,
	newPassword: string,
): Promise<void> {
	// There's no dedicated change-password endpoint that verifies the current
	// password server-side — PUT /users/:id will set any password an
	// authenticated caller sends, no questions asked. Reusing the one
	// endpoint that actually checks a password (login) as the verification
	// step means a wrong current password also counts against the account's
	// real login-attempt lockout, same as a genuine failed login would —
	// rather than skipping verification, or inventing a fake check.
	await loginRequest({ email, password: currentPassword });
	await request(`/users/${id}`, {
		method: "PUT",
		body: JSON.stringify({ password: newPassword }),
	});
}
