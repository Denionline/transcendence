import { useEffect, useMemo, useRef, useState } from "react";
import { SearchIcon, Trash2 } from "lucide-react";
import type { User } from "../features/auth/types";
import { useAuth } from "../features/auth/hooks/useAuth";
import { useUsers } from "../features/admin/hooks/useUsers";
import UsersTable from "../features/admin/components/UsersTable";
import EditUserDialog from "../features/admin/components/EditUserDialog";

const PAGE_SIZE = 8;

/** Windowed page list: first, last, and pages around `current`, with "…" gaps. */
function getPageWindow(current: number, total: number): (number | "…")[] {
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

	const pages = new Set([1, total, current - 1, current, current + 1]);
	const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

	const result: (number | "…")[] = [];
	sorted.forEach((p, i) => {
		if (i > 0 && p - sorted[i - 1] > 1) result.push("…");
		result.push(p);
	});
	return result;
}

export default function AdminUsersPage() {
	const { user: currentUser } = useAuth();
	const { users, isLoading, error, update, remove } = useUsers();

	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
	const [editingUser, setEditingUser] = useState<User | null>(null);

	const deleteDialogRef = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		if (pendingDeleteIds) deleteDialogRef.current?.showModal();
		else deleteDialogRef.current?.close();
	}, [pendingDeleteIds]);

	const filtered = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) return users;
		return users.filter((u) =>
			[u.username, u.email, u.role].some((field) => field.toLowerCase().includes(query)),
		);
	}, [users, search]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const currentPage = Math.min(page, totalPages);
	const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
					<SearchIcon className="text-base-content opacity-50" aria-hidden="true" />
					<input
						type="search"
						placeholder="Search by name, email, role or status"
						aria-label="Search by name, email, role or status"
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
				<UsersTable
					users={paginated}
					isLoading={isLoading}
					currentUserId={currentUser?.id}
					selectedIds={selectedIds}
					setSelectedIds={setSelectedIds}
					onEdit={(id) => setEditingUser(users.find((u) => u.id === id) ?? null)}
					onDelete={(id) => setPendingDeleteIds([id])}
				/>
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
						{getPageWindow(currentPage, totalPages).map((p, i) =>
							p === "…" ? (
								<button key={`ellipsis-${i}`} className="join-item btn btn-sm btn-disabled">
									…
								</button>
							) : (
								<button
									key={p}
									className={`join-item btn btn-sm ${p === currentPage ? "btn-active" : ""}`}
									onClick={() => setPage(p)}
								>
									{p}
								</button>
							),
						)}
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

			<EditUserDialog user={editingUser} onClose={() => setEditingUser(null)} onSave={update} />
		</div>
	);
}
