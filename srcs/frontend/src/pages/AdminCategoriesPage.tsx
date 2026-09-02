import { useEffect, useMemo, useRef, useState } from "react";
import { PlusIcon, SearchIcon } from "lucide-react";
import { useAdminCategories } from "../features/admin/hooks/useAdminCategories";
import CategoriesTable from "../features/admin/components/CategoriesTable";
import CategoryFormDialog from "../features/admin/components/CategoryFormDialog";
import { useToast } from "../features/toast/hooks/useToast";
import type { CategoryDto } from "../features/categories/types";
import type { CategoryInput } from "../features/categories/api";
import { useTranslation } from "react-i18next";

type FormTarget = CategoryDto | "new" | null;

export default function AdminCategoriesPage() {
	const { t } = useTranslation();
	const toast = useToast();
	const { categories, isLoading, error, create, update, remove } = useAdminCategories();

	const [search, setSearch] = useState("");
	const [formTarget, setFormTarget] = useState<FormTarget>(null);
	const [pendingDelete, setPendingDelete] = useState<CategoryDto | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const deleteDialogRef = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		if (pendingDelete) deleteDialogRef.current?.showModal();
		else deleteDialogRef.current?.close();
	}, [pendingDelete]);

	const filtered = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) return categories;
		return categories.filter((c) =>
			[c.label, c.slug].some((field) => field.toLowerCase().includes(query)),
		);
	}, [categories, search]);

	async function submitForm(input: Partial<CategoryInput>) {
		if (formTarget === "new") {
			await create({ label: input.label ?? "", slug: input.slug });
			toast.success(t("adminCategories.created"));
		} else if (formTarget) {
			await update(formTarget.id, input);
			toast.success(t("adminCategories.updated"));
		}
	}

	async function confirmDelete() {
		if (!pendingDelete) return;
		setIsDeleting(true);
		try {
			await remove(pendingDelete.id);
			toast.success(t("adminCategories.deleted"));
			setPendingDelete(null);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t("adminCategories.deleteFailed"));
		} finally {
			setIsDeleting(false);
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="text-xl font-bold">{t("adminCategories.title")}</h1>
				<div className="flex flex-wrap items-center gap-2">
					<label className="input">
						<SearchIcon className="text-base-content opacity-50" aria-hidden="true" />
						<input
							type="search"
							placeholder={t("adminCategories.search")}
							aria-label={t("adminCategories.search")}
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							maxLength={80}
						/>
					</label>
					<button type="button" className="btn btn-primary" onClick={() => setFormTarget("new")}>
						<PlusIcon className="size-4" aria-hidden="true" />
						{t("adminCategories.add")}
					</button>
				</div>
			</div>

			<p className="text-sm text-base-content/60">{t("adminCategories.hint")}</p>

			{error && (
				<div className="alert alert-error">
					<span>{error}</span>
				</div>
			)}

			<div className="overflow-x-auto rounded-box border border-base-content/10 bg-base-100">
				<CategoriesTable
					categories={filtered}
					isLoading={isLoading}
					onEdit={setFormTarget}
					onDelete={setPendingDelete}
				/>
			</div>

			{!isLoading && categories.length > 0 && (
				<span className="text-sm text-base-content/60">
					{t("adminCategories.count", { count: filtered.length })}
				</span>
			)}

			<CategoryFormDialog
				target={formTarget}
				onClose={() => setFormTarget(null)}
				onSubmit={submitForm}
			/>

			<dialog ref={deleteDialogRef} className="modal" onClose={() => setPendingDelete(null)}>
				<div className="modal-box">
					<h3 className="text-lg font-bold">{t("adminCategories.deleteTitle")}</h3>
					<p className="py-4 text-base-content/70">
						{t("adminCategories.deleteBody", { label: pendingDelete?.label ?? "" })}
					</p>
					<div className="modal-action">
						<button className="btn" onClick={() => setPendingDelete(null)}>
							{t("adminCategories.cancel")}
						</button>
						<button className="btn btn-error" onClick={confirmDelete} disabled={isDeleting}>
							{isDeleting && <span className="loading loading-spinner loading-xs" />}
							{t("adminCategories.delete")}
						</button>
					</div>
				</div>
				<form method="dialog" className="modal-backdrop">
					<button>{t("adminCategories.close")}</button>
				</form>
			</dialog>
		</div>
	);
}
