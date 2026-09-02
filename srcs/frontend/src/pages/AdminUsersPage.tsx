import { useEffect, useMemo, useRef, useState } from "react";
import { SearchIcon, Trash2 } from "lucide-react";
import type { User } from "../features/auth/types";
import { useAuth } from "../features/auth/hooks/useAuth";
import { useUsers } from "../features/admin/hooks/useUsers";
import { useToast } from "../features/toast/hooks/useToast";
import UsersTable from "../features/admin/components/UsersTable";
import EditUserDialog from "../features/admin/components/EditUserDialog";
import { getPageWindow } from "../lib/pageWindow";
import { useTranslation } from "react-i18next";

const PAGE_SIZE = 8;

export default function AdminUsersPage() {
	const { t } = useTranslation();
	const { user: currentUser } = useAuth();
	const { users, isLoading, error, update, remove } = useUsers();
	const toast = useToast();

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
		const count = pendingDeleteIds.length;
		try {
			await remove(pendingDeleteIds);
			setSelectedIds((prev) => {
				const next = new Set(prev);
				pendingDeleteIds.forEach((id) => next.delete(id));
				return next;
			});
			setPendingDeleteIds(null);
			toast.success(t("admin.deletedToast", { count }));
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t("admin.deleteFailed"));
		}
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
						placeholder={t("admin.searchUsers")}
						aria-label={t("admin.searchUsers")}
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
						maxLength={120}
					/>
				</label>
			</div>

			{selectedCount > 0 && (
				<div className="flex flex-wrap items-center gap-2 rounded-box bg-base-200 p-3">
					<span className="text-sm font-medium">
						{t("admin.selectedCount", { count: selectedCount })}
					</span>
					<div className="ml-auto flex flex-wrap gap-2">
						<button
							className="btn btn-sm btn-outline btn-error"
							onClick={() => setPendingDeleteIds(Array.from(selectedIds))}
						>
							<Trash2 className="size-4" />
							{t("admin.delete")}
						</button>
						<button className="btn btn-sm btn-ghost" onClick={() => setSelectedIds(new Set())}>
							{t("admin.clear")}
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
					<h3 className="text-lg font-bold">
						{t("admin.deleteTitle", { count: pendingDeleteIds?.length ?? 0 })}
					</h3>
					<p className="py-4 text-base-content/70">{t("admin.deleteBody")}</p>
					<div className="modal-action">
						<button className="btn" onClick={() => setPendingDeleteIds(null)}>
							{t("admin.cancel")}
						</button>
						<button className="btn btn-error" onClick={confirmDelete}>
							{t("admin.delete")}
						</button>
					</div>
				</div>
				<form method="dialog" className="modal-backdrop">
					<button>{t("admin.close")}</button>
				</form>
			</dialog>

			<EditUserDialog user={editingUser} onClose={() => setEditingUser(null)} onSave={update} />
		</div>
	);
}
