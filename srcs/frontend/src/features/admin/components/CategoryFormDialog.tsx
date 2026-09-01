import { type FormEvent, useEffect, useRef, useState } from "react";
import FieldError from "../../../components/FieldError";
import { fieldErrorsFromApi } from "../../../lib/formValidation";
import type { CategoryDto } from "../../categories/types";
import type { CategoryInput } from "../../categories/api";
import { useTranslation } from "react-i18next";

type Target = CategoryDto | "new" | null;

interface CategoryFormDialogProps {
	target: Target;
	onClose: () => void;
	onSubmit: (input: Partial<CategoryInput>) => Promise<void>;
}

export default function CategoryFormDialog({ target, onClose, onSubmit }: CategoryFormDialogProps) {
	const { t } = useTranslation();
	const dialogRef = useRef<HTMLDialogElement>(null);

	const [label, setLabel] = useState("");
	const [slug, setSlug] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<{ label?: string; slug?: string }>({});
	const [isSaving, setIsSaving] = useState(false);

	//	Reset the form whenever a new target is handed in (create vs a given row).
	const [seen, setSeen] = useState<Target>(null);
	if (target !== seen) {
		setSeen(target);
		setLabel(target && target !== "new" ? target.label : "");
		setSlug(target && target !== "new" ? target.slug : "");
		setError(null);
		setFieldErrors({});
	}

	useEffect(() => {
		if (target) dialogRef.current?.showModal();
		else dialogRef.current?.close();
	}, [target]);

	const isEdit = target !== null && target !== "new";

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!target) return;

		const trimmedLabel = label.trim();
		if (!trimmedLabel) {
			setFieldErrors({ label: t("adminCategories.labelRequired") });
			return;
		}

		//	On create, an empty slug means "derive it from the label" — omit it.
		//	On edit, only send what changed so a blank slug never clears the key.
		const input: Partial<CategoryInput> = { label: trimmedLabel };
		const trimmedSlug = slug.trim();
		if (trimmedSlug) input.slug = trimmedSlug;

		setError(null);
		setFieldErrors({});
		setIsSaving(true);
		try {
			await onSubmit(input);
			onClose();
		} catch (err) {
			const fromServer = fieldErrorsFromApi<{ label?: string; slug?: string }>(err);
			if (fromServer) setFieldErrors(fromServer);
			else setError(err instanceof Error ? err.message : t("adminCategories.saveFailed"));
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<dialog ref={dialogRef} className="modal" onClose={onClose}>
			<div className="modal-box">
				<h3 className="text-lg font-bold">
					{isEdit ? t("adminCategories.editTitle") : t("adminCategories.newTitle")}
				</h3>

				<form className="flex flex-col gap-4 pt-4" onSubmit={handleSubmit}>
					{error && (
						<div className="alert alert-error">
							<span>{error}</span>
						</div>
					)}

					<label className="fieldset-label flex-col items-start gap-1">
						<span className="text-sm font-medium">{t("adminCategories.label")}</span>
						<input
							type="text"
							className="input w-full"
							value={label}
							maxLength={60}
							onChange={(e) => setLabel(e.target.value)}
							aria-invalid={fieldErrors.label ? "true" : undefined}
						/>
						<FieldError message={fieldErrors.label} />
					</label>

					<label className="fieldset-label flex-col items-start gap-1">
						<span className="text-sm font-medium">
							{t("adminCategories.slug")}{" "}
							<span className="font-normal text-base-content/50">
								{isEdit ? t("adminCategories.slugEditHint") : t("adminCategories.slugNewHint")}
							</span>
						</span>
						<input
							type="text"
							className="input w-full font-mono text-sm"
							value={slug}
							maxLength={60}
							placeholder={label.trim().toLowerCase().replace(/\s+/g, "-")}
							onChange={(e) => setSlug(e.target.value)}
							aria-invalid={fieldErrors.slug ? "true" : undefined}
						/>
						<FieldError message={fieldErrors.slug} />
					</label>

					<div className="modal-action">
						<button type="button" className="btn" onClick={onClose} disabled={isSaving}>
							{t("adminCategories.cancel")}
						</button>
						<button type="submit" className="btn btn-primary" disabled={isSaving}>
							{isSaving && <span className="loading loading-spinner loading-xs" />}
							{isEdit ? t("adminCategories.save") : t("adminCategories.create")}
						</button>
					</div>
				</form>
			</div>
			<form method="dialog" className="modal-backdrop">
				<button>{t("adminCategories.close")}</button>
			</form>
		</dialog>
	);
}
