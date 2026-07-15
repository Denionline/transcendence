import type { User, UserRole } from "../auth/types";
import { readUsers, writeUsers, toPublicUser } from "../auth/api";

function delay<T>(value: T, ms = 400): Promise<T> {
	return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export async function fetchUsers(): Promise<User[]> {
	await delay(undefined);
	return readUsers().map(toPublicUser);
}

export async function setUserActive(id: string, isActive: boolean): Promise<User> {
	await delay(undefined);
	const users = readUsers();
	const index = users.findIndex((u) => u.id === id);
	if (index === -1) throw new Error("User not found");
	users[index] = { ...users[index], isActive };
	writeUsers(users);
	return toPublicUser(users[index]);
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
