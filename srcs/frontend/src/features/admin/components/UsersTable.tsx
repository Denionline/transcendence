import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import type { ManagedUser } from "../types";
import UserRow from "./UserRow";

interface UsersTableProps {
	users: ManagedUser[];
	isLoading: boolean;
	currentUserId?: string;
	selectedIds: Set<string>;
	setSelectedIds: Dispatch<SetStateAction<Set<string>>>;
	onToggleActive: (id: string, isActive: boolean) => void;
	onEdit: (id: string) => void;
	onDelete: (id: string) => void;
}

export default function UsersTable({
	users,
	isLoading,
	currentUserId,
	selectedIds,
	setSelectedIds,
	onToggleActive,
	onEdit,
	onDelete,
}: UsersTableProps) {
	const headerCheckboxRef = useRef<HTMLInputElement>(null);

	const pageSelectableIds = users.filter((u) => u.id !== currentUserId).map((u) => u.id);
	const allPageSelected =
		pageSelectableIds.length > 0 && pageSelectableIds.every((id) => selectedIds.has(id));
	const somePageSelected = pageSelectableIds.some((id) => selectedIds.has(id));

	useEffect(() => {
		if (headerCheckboxRef.current) {
			headerCheckboxRef.current.indeterminate = somePageSelected && !allPageSelected;
		}
	}, [somePageSelected, allPageSelected]);

	function toggleSelectAllOnPage() {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (allPageSelected) {
				pageSelectableIds.forEach((id) => next.delete(id));
			} else {
				pageSelectableIds.forEach((id) => next.add(id));
			}
			return next;
		});
	}

	function toggleSelectRow(id: string) {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	return (
		<table className="table">
			<thead>
				<tr>
					<th>
						<input
							ref={headerCheckboxRef}
							type="checkbox"
							className="checkbox"
							checked={allPageSelected}
							disabled={pageSelectableIds.length === 0}
							onChange={toggleSelectAllOnPage}
						/>
					</th>
					<th>User</th>
					<th>Role</th>
					<th>Status</th>
					<th>Joined</th>
					<th className="text-right">Actions</th>
				</tr>
			</thead>
			<tbody>
				{isLoading && (
					<tr>
						<td colSpan={6} className="py-10 text-center">
							<span className="loading loading-spinner loading-md" />
						</td>
					</tr>
				)}

				{!isLoading && users.length === 0 && (
					<tr>
						<td colSpan={6} className="py-10 text-center text-base-content/60">
							No users match your search.
						</td>
					</tr>
				)}

				{!isLoading &&
					users.map((u) => (
						<UserRow
							key={u.id}
							user={u}
							isSelf={u.id === currentUserId}
							selected={selectedIds.has(u.id)}
							onToggleSelect={() => toggleSelectRow(u.id)}
							onToggleActive={() => onToggleActive(u.id, !u.isActive)}
							onEdit={() => onEdit(u.id)}
							onDelete={() => onDelete(u.id)}
						/>
					))}
			</tbody>
		</table>
	);
}
