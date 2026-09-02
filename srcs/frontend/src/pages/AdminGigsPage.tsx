import { useEffect, useMemo, useRef, useState } from "react";
import { SearchIcon } from "lucide-react";
import { useAdminGigs } from "../features/admin/hooks/useAdminGigs";
import GigsTable from "../features/admin/components/GigsTable";
import { useToast } from "../features/toast/hooks/useToast";
import { getPageWindow } from "../lib/pageWindow";
import { useTranslation } from "react-i18next";

const PAGE_SIZE = 10;

export default function AdminGigsPage() {
	const { t } = useTranslation();
	const toast = useToast();
	const { gigs, isLoading, error, remove } = useAdminGigs();

	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const deleteDialogRef = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		if (pendingDeleteId) deleteDialogRef.current?.showModal();
		else deleteDialogRef.current?.close();
	}, [pendingDeleteId]);

	const filtered = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) return gigs;
		return gigs.filter((gig) =>
			[gig.title, gig.hirer?.username ?? "", gig.category.label, gig.status].some((field) =>
				field.toLowerCase().includes(query),
			),
		);
	}, [gigs, search]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const currentPage = Math.min(page, totalPages);
	const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

	const pendingGig = gigs.find((gig) => gig.id === pendingDeleteId) ?? null;

	async function confirmDelete() {
		if (!pendingDeleteId) return;
		setIsDeleting(true);
		try {
			await remove(pendingDeleteId);
			toast.success(t("adminGigs.deleted"));
			setPendingDeleteId(null);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t("adminGigs.deleteFailed"));
		} finally {
			setIsDeleting(false);
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="text-xl font-bold">{t("adminGigs.title")}</h1>
				<label className="input">
					<SearchIcon className="text-base-content opacity-50" aria-hidden="true" />
					<input
						type="search"
						placeholder={t("adminGigs.search")}
						aria-label={t("adminGigs.search")}
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
						maxLength={120}
					/>
				</label>
			</div>

			{error && (
				<div className="alert alert-error">
					<span>{error}</span>
				</div>
			)}

			<div className="overflow-x-auto rounded-box border border-base-content/10 bg-base-100">
				<GigsTable gigs={paginated} isLoading={isLoading} onDelete={setPendingDeleteId} />
			</div>

			{!isLoading && filtered.length > 0 && (
				<div className="flex flex-wrap items-center justify-between gap-3">
					<span className="text-sm text-base-content/60">
						{t("adminGigs.showing", {
							from: (currentPage - 1) * PAGE_SIZE + 1,
							to: Math.min(currentPage * PAGE_SIZE, filtered.length),
							total: filtered.length,
						})}
					</span>
					{totalPages > 1 && (
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
					)}
				</div>
			)}

			<dialog ref={deleteDialogRef} className="modal" onClose={() => setPendingDeleteId(null)}>
				<div className="modal-box">
					<h3 className="text-lg font-bold">{t("adminGigs.deleteTitle")}</h3>
					<p className="py-4 text-base-content/70">
						{t("adminGigs.deleteBody", { title: pendingGig?.title ?? "" })}
					</p>
					<div className="modal-action">
						<button className="btn" onClick={() => setPendingDeleteId(null)}>
							{t("adminGigs.cancel")}
						</button>
						<button className="btn btn-error" onClick={confirmDelete} disabled={isDeleting}>
							{isDeleting && <span className="loading loading-spinner loading-xs" />}
							{t("adminGigs.delete")}
						</button>
					</div>
				</div>
				<form method="dialog" className="modal-backdrop">
					<button>{t("adminGigs.close")}</button>
				</form>
			</dialog>
		</div>
	);
}
