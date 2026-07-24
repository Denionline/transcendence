import type { User, UserRole } from "../auth/types";
import { delay } from "../../lib/delay";

const DB_KEY = "artmate_db_users";

interface StoredUser extends User {
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

function readUsers(): StoredUser[] {
	const raw = localStorage.getItem(DB_KEY);
	if (!raw) {
		localStorage.setItem(DB_KEY, JSON.stringify(seedUsers));
		return seedUsers;
	}
	return JSON.parse(raw) as StoredUser[];
}

function writeUsers(users: StoredUser[]): void {
	localStorage.setItem(DB_KEY, JSON.stringify(users));
}

function toPublicUser(user: StoredUser): User {
	const { id, email, username, role, avatarUrl, createdAt, isActive } = user;
	return { id, email, username, role, avatarUrl, createdAt, isActive };
}

export async function fetchUsers(): Promise<User[]> {
	await delay(undefined);
	return readUsers().map(toPublicUser);
}

export async function setUsersActive(ids: string[], isActive: boolean): Promise<User[]> {
	await delay(undefined);
	const idSet = new Set(ids);
	const users = readUsers().map((u) => (idSet.has(u.id) ? { ...u, isActive } : u));
	writeUsers(users);
	return users.filter((u) => idSet.has(u.id)).map(toPublicUser);
}

export async function updateUser(
	id: string,
	updates: { username: string; email: string; role: UserRole },
): Promise<User> {
	await delay(undefined);
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

export async function deleteUsers(ids: string[]): Promise<void> {
	await delay(undefined);
	const idSet = new Set(ids);
	writeUsers(readUsers().filter((u) => !idSet.has(u.id)));
}
