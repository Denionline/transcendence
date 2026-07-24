import type { Credentials, RegisterData, User } from "./types";

let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => {
	accessToken = t;
};
export const getAccessToken = () => accessToken;

async function request(path: string, options: RequestInit = {}) {
	const res = await fetch(`/api${path}`, {
		...options,
		Credentials: "include",
		headers: {
			"Content-Type": "application/json",
			...accessToken(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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
}

export async function loginRequest(credentials: Credentials): Promise<User> {
	const { token, ...user } = await request("/auth/login", {
		method: "POST",
		body: JSON.stringify(credentials),
	});
	setAccessToken(token);
	return user as User;
}

export async function fetchMe(): Promise<User | null> {
	try {
		const { token } = await request("/auth/refresh", { method: "POST" });
		setAccessToken(token);
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
	updates: { username: string; email: string },
): Promise<User> {
	void id;
	void updates;
	throw new Error("Editing your profile is not available yet");
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
