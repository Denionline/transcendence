import type { Credentials, RegisterData, User } from "./types";
import { delay } from "../../lib/delay";

const DB_KEY = "artmate_db_users";
const SESSION_KEY = "artmate_session";

export interface StoredUser extends User {
	password: string;
}

const seedUsers: StoredUser[] = [
	{
		id: "1",
		email: "artist@email.com",
		username: "artist",
		role: "artist",
		avatarUrl: null,
		createdAt: "2024-01-01T00:00:00.000Z",
		isActive: true,
		password: "artist",
	},
	{
		id: "2",
		email: "hirer@email.com",
		username: "hirer",
		role: "hirer",
		avatarUrl: null,
		createdAt: "2024-01-01T00:00:00.000Z",
		isActive: true,
		password: "hirer",
	},
	{
		id: "3",
		email: "admin@email.com",
		username: "admin",
		role: "admin",
		avatarUrl: null,
		createdAt: "2024-01-01T00:00:00.000Z",
		isActive: true,
		password: "admin",
	},
];

export function readUsers(): StoredUser[] {
	const raw = localStorage.getItem(DB_KEY);
	if (!raw) {
		localStorage.setItem(DB_KEY, JSON.stringify(seedUsers));
		return seedUsers;
	}
	return JSON.parse(raw) as StoredUser[];
}

export function writeUsers(users: StoredUser[]): void {
	localStorage.setItem(DB_KEY, JSON.stringify(users));
}

export function toPublicUser(user: StoredUser): User {
	const { id, email, username, role, avatarUrl, createdAt, isActive } = user;
	return { id, email, username, role, avatarUrl, createdAt, isActive };
}

export async function registerRequest(data: RegisterData): Promise<User> {
	await delay(undefined, 600);
	const users = readUsers();
	if (users.some((u) => u.email === data.email)) {
		throw new Error("Email already in use");
	}
	const user: StoredUser = {
		id: crypto.randomUUID(),
		email: data.email,
		username: data.name,
		role: data.role,
		avatarUrl: null,
		createdAt: new Date().toISOString(),
		isActive: true,
		password: data.password,
	};
	writeUsers([...users, user]);
	localStorage.setItem(SESSION_KEY, user.id);
	return toPublicUser(user);
}

export async function loginRequest(credentials: Credentials): Promise<User> {
	await delay(undefined, 600);
	const users = readUsers();
	const user = users.find((u) => u.email === credentials.email);
	if (!user || user.password !== credentials.password) {
		throw new Error("Invalid email or password");
	}
	localStorage.setItem(SESSION_KEY, user.id);
	return toPublicUser(user);
}

export async function fetchMe(): Promise<User | null> {
	await delay(undefined, 300);
	const sessionUserId = localStorage.getItem(SESSION_KEY);
	if (!sessionUserId) return null;
	const user = readUsers().find((u) => u.id === sessionUserId);
	return user ? toPublicUser(user) : null;
}

export async function logoutRequest(): Promise<void> {
	await delay(undefined, 300);
	localStorage.removeItem(SESSION_KEY);
}

export async function updateProfileRequest(
	id: string,
	updates: { username: string; email: string },
): Promise<User> {
	await delay(undefined, 400);
	const users = readUsers();
	const index = users.findIndex((u) => u.id === id);
	if (index === -1) throw new Error("User not found");
	if (users.some((u) => u.id !== id && u.email === updates.email)) {
		throw new Error("Email already in use");
	}
	users[index] = { ...users[index], ...updates };
	writeUsers(users);
	return toPublicUser(users[index]);
}

export async function updatePasswordRequest(
	id: string,
	currentPassword: string,
	newPassword: string,
): Promise<void> {
	await delay(undefined, 400);
	const users = readUsers();
	const index = users.findIndex((u) => u.id === id);
	if (index === -1) throw new Error("User not found");
	if (users[index].password !== currentPassword) {
		throw new Error("Current password is incorrect");
	}
	users[index] = { ...users[index], password: newPassword };
	writeUsers(users);
}
