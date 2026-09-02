import { Pencil, Trash2 } from "lucide-react";
import type { CategoryDto } from "../../categories/types";
import { useTranslation } from "react-i18next";

interface CategoryRowProps {
	category: CategoryDto;
	onEdit: () => void;
	onDelete: () => void;
}

export default function CategoryRow({ category, onEdit, onDelete }: CategoryRowProps) {
	const { t } = useTranslation();

	return (
		<tr>
			<td>
				<div className="min-w-0">
					<div className="truncate font-bold">{category.label}</div>
					<div className="truncate font-mono text-xs opacity-50">{category.slug}</div>
				</div>
			</td>
			<td>
				<div className="flex justify-end gap-1">
					<button
						type="button"
						className="btn btn-ghost btn-xs tooltip"
						data-tip={t("adminCategories.edit")}
						aria-label={t("adminCategories.editNamed", { label: category.label })}
						onClick={onEdit}
					>
						<Pencil className="size-4" aria-hidden="true" />
					</button>
					<button
						type="button"
						className="btn btn-ghost btn-xs text-error tooltip tooltip-left"
						data-tip={t("adminCategories.delete")}
						aria-label={t("adminCategories.deleteNamed", { label: category.label })}
						onClick={onDelete}
					>
						<Trash2 className="size-4" aria-hidden="true" />
					</button>
				</div>
			</td>
		</tr>
	);
}
