import type { Credentials, RegisterData, User } from "./types";

const users: User[] = [
	{
		id: "1",
		email: "artist@email.com",
		username: "artist",
		role: "artist",
		avatarUrl: null,
		createdAt: "2024-01-01T00:00:00.000Z",
	},
	{
		id: "2",
		email: "hirer@email.com",
		username: "hirer",
		role: "hirer",
		avatarUrl: null,
		createdAt: "2024-01-01T00:00:00.000Z",
	},
	{
		id: "3",
		email: "admin@email.com",
		username: "admin",
		role: "admin",
		avatarUrl: null,
		createdAt: "2024-01-01T00:00:00.000Z",
	},
];

let nextId = users.length + 1;

export function registerRequest(data: RegisterData): Promise<User> {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			if (users.some((u) => u.email === data.email)) {
				reject(new Error("Email already in use"));
				return;
			}
			const user: User = {
				id: String(nextId++),
				email: data.email,
				username: data.name,
				role: "artist",
				avatarUrl: null,
				createdAt: new Date().toISOString(),
			};
			users.push(user);
			resolve(user);
		}, 600);
	});
}

export function loginRequest(credentials: Credentials): Promise<User> {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			const user = users.find((u) => u.email === credentials.email);
			if (!user) {
				reject(new Error("Invalid email or password"));
				return;
			}
			resolve(user);
		}, 600);
	});
}

export function fetchMe(): Promise<User | null> {
	return new Promise((resolve) => {
		setTimeout(() => resolve(null), 300);
	});
}

export function logoutRequest(): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(() => resolve(), 300);
	});
}
