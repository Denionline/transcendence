import { useEffect, useState } from "react";
import type { User, UserRole } from "../../auth/types";
import { deleteUsers, fetchUsers, setUsersActive, updateUser } from "../api";

export function useUsers() {
	const [users, setUsers] = useState<User[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function load() {
			try {
				const data = await fetchUsers();
				if (!cancelled) setUsers(data);
			} catch (err) {
				if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load users");
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		}

		load();

		return () => {
			cancelled = true;
		};
	}, []);

	async function setActive(ids: string[], isActive: boolean) {
		const updated = await setUsersActive(ids, isActive);
		const updatedById = new Map(updated.map((u) => [u.id, u]));
		setUsers((prev) => prev.map((u) => updatedById.get(u.id) ?? u));
	}

	async function remove(ids: string[]) {
		await deleteUsers(ids);
		const idSet = new Set(ids);
		setUsers((prev) => prev.filter((u) => !idSet.has(u.id)));
	}

	async function update(
		id: string,
		updates: { username: string; email: string; role: UserRole },
	) {
		const updated = await updateUser(id, updates);
		setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
	}

	return { users, isLoading, error, setActive, remove, update };
}
