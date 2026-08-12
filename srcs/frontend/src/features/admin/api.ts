import { apiRequest } from "../../lib/apiClient";
import type { UserRole } from "../auth/types";
import type { ManagedUser } from "./types";

interface UsersPage {
	items: ManagedUser[];
	page: number;
	pageSize: number;
	total: number;
}

const PAGE_SIZE = 100;

export async function fetchUsers(): Promise<ManagedUser[]> {
	const first = await apiRequest<UsersPage>(`/users?page=1&pageSize=${PAGE_SIZE}`);
	const users = [...first.items];

	const totalPages = Math.ceil(first.total / first.pageSize);
	for (let page = 2; page <= totalPages; page++) {
		const next = await apiRequest<UsersPage>(`/users?page=${page}&pageSize=${PAGE_SIZE}`);
		users.push(...next.items);
	}

	return users;
}

export async function updateUser(
	id: string,
	updates: { username: string; email: string; role: UserRole },
): Promise<ManagedUser> {
	return apiRequest<ManagedUser>(`/users/${id}`, {
		method: "PUT",
		body: JSON.stringify(updates),
	});
}

export async function deleteUsers(ids: string[]): Promise<void> {
	await Promise.all(ids.map((id) => apiRequest<null>(`/users/${id}`, { method: "DELETE" })));
}
