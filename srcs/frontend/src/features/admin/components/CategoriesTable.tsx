import type { CategoryDto } from "../../categories/types";
import CategoryRow from "./CategoryRow";
import { useTranslation } from "react-i18next";

interface CategoriesTableProps {
	categories: CategoryDto[];
	isLoading: boolean;
	onEdit: (category: CategoryDto) => void;
	onDelete: (category: CategoryDto) => void;
}

export default function CategoriesTable({
	categories,
	isLoading,
	onEdit,
	onDelete,
}: CategoriesTableProps) {
	const { t } = useTranslation();

	return (
		<table className="table">
			<thead>
				<tr>
					<th>{t("adminCategories.label")}</th>
					<th className="text-right">{t("adminCategories.actions")}</th>
				</tr>
			</thead>
			<tbody>
				{isLoading && (
					<tr>
						<td colSpan={2} className="py-10 text-center">
							<span className="loading loading-spinner loading-md" />
						</td>
					</tr>
				)}

				{!isLoading && categories.length === 0 && (
					<tr>
						<td colSpan={2} className="py-10 text-center text-sm text-base-content/60">
							{t("adminCategories.none")}
						</td>
					</tr>
				)}

				{!isLoading &&
					categories.map((category) => (
						<CategoryRow
							key={category.id}
							category={category}
							onEdit={() => onEdit(category)}
							onDelete={() => onDelete(category)}
						/>
					))}
			</tbody>
		</table>
	);
}
