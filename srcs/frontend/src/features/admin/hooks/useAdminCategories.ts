import { useEffect, useState } from "react";
import type { CategoryDto } from "../../categories/types";
import {
	createCategory,
	deleteCategory,
	fetchCategories,
	updateCategory,
	type CategoryInput,
} from "../../categories/api";
import { clearCategoriesCache } from "../../categories/hooks/useCategories";

const byLabel = (a: CategoryDto, b: CategoryDto) => a.label.localeCompare(b.label);

/** Admin-side vocabulary management. Every mutation also clears the app-wide
 *  `useCategories` cache so the sign-up / profile / gig forms pick the change
 *  up on their next mount. */
export function useAdminCategories() {
	const [categories, setCategories] = useState<CategoryDto[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		fetchCategories()
			.then((items) => {
				if (!cancelled) setCategories([...items].sort(byLabel));
			})
			.catch((err: unknown) => {
				if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load categories");
			})
			.finally(() => {
				if (!cancelled) setIsLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	async function create(input: CategoryInput) {
		const created = await createCategory(input);
		clearCategoriesCache();
		setCategories((prev) => [...prev, created].sort(byLabel));
	}

	async function update(id: string, input: Partial<CategoryInput>) {
		const updated = await updateCategory(id, input);
		clearCategoriesCache();
		setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)).sort(byLabel));
	}

	async function remove(id: string) {
		await deleteCategory(id);
		clearCategoriesCache();
		setCategories((prev) => prev.filter((c) => c.id !== id));
	}

	return { categories, isLoading, error, create, update, remove };
}
