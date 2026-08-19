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
		throw new Error(body.message ?? "Request failed");
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
	const { token, ...user } = await request("/auth/login", {
		method: "POST",
		body: JSON.stringify(credentials),
	});
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
	const { token } = await request("/auth/refresh", { method: "POST" });
	setAccessToken(token);
	return token;
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
	currentPassword: string,
	newPassword: string,
): Promise<void> {
	void id;
	void currentPassword;
	void newPassword;
	throw new Error("Changing your password is not available yet");
}
