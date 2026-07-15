import { useEffect, useMemo, useRef, useState } from "react";
import { Ban, CircleCheck, SearchIcon, Trash2 } from "lucide-react";
import { useAuth } from "../features/auth/hooks/useAuth";
import { useUsers } from "../features/admin/hooks/useUsers";
import type { User, UserRole } from "../features/auth/types";

const PAGE_SIZE = 8;

const ROLE_BADGE: Record<UserRole, string> = {
	admin: "badge-primary",
	hirer: "badge-secondary",
	artist: "badge-accent",
};

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function initials(username: string): string {
	return username.slice(0, 2).toUpperCase();
}

export default function AdminUsersPage() {
	const { user: currentUser } = useAuth();
	const { users, isLoading, error, setActive, remove } = useUsers();

	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);

	const deleteDialogRef = useRef<HTMLDialogElement>(null);
	const headerCheckboxRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (pendingDeleteIds) deleteDialogRef.current?.showModal();
		else deleteDialogRef.current?.close();
	}, [pendingDeleteIds]);

	const filtered = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) return users;
		return users.filter((u) =>
			[u.username, u.email, u.role, u.isActive ? "active" : "disabled"].some((field) =>
				field.toLowerCase().includes(query),
			),
		);
	}, [users, search]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const currentPage = Math.min(page, totalPages);
	const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

	const pageSelectableIds = paginated.filter((u) => u.id !== currentUser?.id).map((u) => u.id);
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

	async function handleBulkSetActive(isActive: boolean) {
		await setActive(Array.from(selectedIds), isActive);
	}

	async function confirmDelete() {
		if (!pendingDeleteIds) return;
		await remove(pendingDeleteIds);
		setSelectedIds((prev) => {
			const next = new Set(prev);
			pendingDeleteIds.forEach((id) => next.delete(id));
			return next;
		});
		setPendingDeleteIds(null);
	}

	const selectedCount = selectedIds.size;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="text-xl font-bold">Users</h1>
				<label className="input">
					<SearchIcon className="text-base-content opacity-50" />
					<input
						type="search"
						placeholder="Search by name, email, role or status"
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
					/>
				</label>
			</div>

			{selectedCount > 0 && (
				<div className="flex flex-wrap items-center gap-2 rounded-box bg-base-200 p-3">
					<span className="text-sm font-medium">{selectedCount} selected</span>
					<div className="ml-auto flex flex-wrap gap-2">
						<button
							className="btn btn-sm btn-outline btn-success"
							onClick={() => handleBulkSetActive(true)}
						>
							<CircleCheck className="size-4" />
							Enable
						</button>
						<button
							className="btn btn-sm btn-outline btn-warning"
							onClick={() => handleBulkSetActive(false)}
						>
							<Ban className="size-4" />
							Disable
						</button>
						<button
							className="btn btn-sm btn-outline btn-error"
							onClick={() => setPendingDeleteIds(Array.from(selectedIds))}
						>
							<Trash2 className="size-4" />
							Delete
						</button>
						<button className="btn btn-sm btn-ghost" onClick={() => setSelectedIds(new Set())}>
							Clear
						</button>
					</div>
				</div>
			)}

			{error && (
				<div className="alert alert-error">
					<span>{error}</span>
				</div>
			)}

			<div className="overflow-x-auto rounded-box border border-base-content/10 bg-base-100">
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

						{!isLoading && paginated.length === 0 && (
							<tr>
								<td colSpan={6} className="py-10 text-center text-base-content/60">
									No users match your search.
								</td>
							</tr>
						)}

						{!isLoading &&
							paginated.map((u) => (
								<UserRow
									key={u.id}
									user={u}
									isSelf={u.id === currentUser?.id}
									selected={selectedIds.has(u.id)}
									onToggleSelect={() => toggleSelectRow(u.id)}
									onToggleActive={() => setActive([u.id], !u.isActive)}
									onDelete={() => setPendingDeleteIds([u.id])}
								/>
							))}
					</tbody>
				</table>
			</div>

			{!isLoading && filtered.length > 0 && (
				<div className="flex flex-wrap items-center justify-between gap-3">
					<span className="text-sm text-base-content/60">
						Showing {(currentPage - 1) * PAGE_SIZE + 1}-
						{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
					</span>
					<div className="join">
						<button
							className="join-item btn btn-sm"
							disabled={currentPage === 1}
							onClick={() => setPage((p) => p - 1)}
						>
							«
						</button>
						{Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
							<button
								key={p}
								className={`join-item btn btn-sm ${p === currentPage ? "btn-active" : ""}`}
								onClick={() => setPage(p)}
							>
								{p}
							</button>
						))}
						<button
							className="join-item btn btn-sm"
							disabled={currentPage === totalPages}
							onClick={() => setPage((p) => p + 1)}
						>
							»
						</button>
					</div>
				</div>
			)}

			<dialog ref={deleteDialogRef} className="modal" onClose={() => setPendingDeleteIds(null)}>
				<div className="modal-box">
					<h3 className="text-lg font-bold">Delete {pendingDeleteIds?.length ?? 0} user(s)?</h3>
					<p className="py-4 text-base-content/70">
						This action cannot be undone. The selected user(s) will be permanently removed.
					</p>
					<div className="modal-action">
						<button className="btn" onClick={() => setPendingDeleteIds(null)}>
							Cancel
						</button>
						<button className="btn btn-error" onClick={confirmDelete}>
							Delete
						</button>
					</div>
				</div>
				<form method="dialog" className="modal-backdrop">
					<button>close</button>
				</form>
			</dialog>
		</div>
	);
}

function UserRow({
	user,
	isSelf,
	selected,
	onToggleSelect,
	onToggleActive,
	onDelete,
}: {
	user: User;
	isSelf: boolean;
	selected: boolean;
	onToggleSelect: () => void;
	onToggleActive: () => void;
	onDelete: () => void;
}) {
	return (
		<tr className={selected ? "bg-base-200" : undefined}>
			<th>
				<input
					type="checkbox"
					className="checkbox"
					checked={selected}
					disabled={isSelf}
					onChange={onToggleSelect}
				/>
			</th>
			<td>
				<div className="flex items-center gap-3">
					<div className="avatar avatar-placeholder">
						<div className="w-10 rounded-full bg-neutral text-neutral-content">
							<span className="text-xs">{initials(user.username)}</span>
						</div>
					</div>
					<div>
						<div className="font-bold">
							{user.username}
							{isSelf && <span className="badge badge-ghost badge-sm ml-2">You</span>}
						</div>
						<div className="text-sm opacity-50">{user.email}</div>
					</div>
				</div>
			</td>
			<td>
				<span className={`badge badge-sm ${ROLE_BADGE[user.role]}`}>{user.role}</span>
			</td>
			<td>
				<span className={`badge badge-sm ${user.isActive ? "badge-success" : "badge-error"}`}>
					{user.isActive ? "active" : "disabled"}
				</span>
			</td>
			<td>{formatDate(user.createdAt)}</td>
			<td>
				<div className="flex justify-end gap-1">
					<button
						className={`btn btn-ghost btn-xs tooltip ${isSelf ? "tooltip-left" : ""}`}
						data-tip={
							isSelf
								? "You can't modify your own account"
								: user.isActive
									? "Disable user"
									: "Enable user"
						}
						disabled={isSelf}
						onClick={onToggleActive}
					>
						{user.isActive ? <Ban className="size-4" /> : <CircleCheck className="size-4" />}
					</button>
					<button
						className="btn btn-ghost btn-xs text-error tooltip tooltip-left"
						data-tip={isSelf ? "You can't delete your own account" : "Delete user"}
						disabled={isSelf}
						onClick={onDelete}
					>
						<Trash2 className="size-4" />
					</button>
				</div>
			</td>
		</tr>
	);
}
