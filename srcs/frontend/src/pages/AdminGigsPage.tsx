import { useEffect, useMemo, useRef, useState } from "react";
import { SearchIcon, Trash2 } from "lucide-react";
import { useAdminGigs } from "../features/admin/hooks/useAdminGigs";
import { useToast } from "../features/toast/hooks/useToast";
import { formatDate } from "../lib/format";
import { useTranslation } from "react-i18next";

export default function AdminGigsPage() {
	const { t } = useTranslation();
	const toast = useToast();
	const { gigs, isLoading, error, remove } = useAdminGigs();

	const [search, setSearch] = useState("");
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
						onChange={(e) => setSearch(e.target.value)}
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
				<table className="table">
					<thead>
						<tr>
							<th>{t("adminGigs.gig")}</th>
							<th>{t("adminGigs.hirer")}</th>
							<th>{t("adminGigs.category")}</th>
							<th>{t("adminGigs.status")}</th>
							<th>{t("adminGigs.created")}</th>
							<th className="sr-only">{t("adminGigs.actions")}</th>
						</tr>
					</thead>
					<tbody>
						{isLoading ? (
							<tr>
								<td colSpan={6} className="py-10 text-center">
									<span className="loading loading-spinner loading-md" />
								</td>
							</tr>
						) : filtered.length === 0 ? (
							<tr>
								<td colSpan={6} className="py-10 text-center text-sm text-base-content/60">
									{t("adminGigs.none")}
								</td>
							</tr>
						) : (
							filtered.map((gig) => (
								<tr key={gig.id}>
									<td className="max-w-xs truncate font-medium">{gig.title}</td>
									<td className="text-sm text-base-content/70">{gig.hirer?.username ?? "—"}</td>
									<td className="text-sm">{gig.category.label}</td>
									<td>
										<span
											className={`badge badge-sm ${
												gig.status === "open" ? "badge-primary" : "badge-ghost"
											}`}
										>
											{gig.status === "open" ? t("gig.open") : t("gig.closed")}
										</span>
									</td>
									<td className="text-sm text-base-content/60">{formatDate(gig.createdAt)}</td>
									<td className="text-right">
										<button
											type="button"
											className="btn btn-ghost btn-sm text-error tooltip"
											data-tip={t("adminGigs.deleteGig")}
											aria-label={t("adminGigs.deleteGig")}
											onClick={() => setPendingDeleteId(gig.id)}
										>
											<Trash2 className="size-4" aria-hidden="true" />
										</button>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

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
