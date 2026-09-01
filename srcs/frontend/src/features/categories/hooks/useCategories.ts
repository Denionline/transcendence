import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchCategories } from "../api";
import type { CategoryDto } from "../types";

// The vocabulary is small, server-owned and effectively static for a session,
// so it is fetched once per mount and cached in memory. This replaces the
// hardcoded lists the frontend used to keep in sync with the database by hand.
let cache: CategoryDto[] | null = null;

/** Drop the in-memory vocabulary so the next `useCategories()` mount refetches.
 *  Called after an admin creates, renames or removes a category. */
export function clearCategoriesCache() {
	cache = null;
}

export function useCategories() {
	const { t } = useTranslation();
	const [categories, setCategories] = useState<CategoryDto[]>(cache ?? []);
	const [isLoading, setIsLoading] = useState(cache === null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (cache) return;

		let active = true;
		fetchCategories()
			.then((items) => {
				cache = items;
				if (!active) return;
				setCategories(items);
			})
			.catch(() => {
				if (!active) return;
				setError("categories.couldNotLoad");
			})
			.finally(() => {
				if (!active) return;
				setIsLoading(false);
			});

		return () => {
			active = false;
		};
	}, []);

	return { categories, isLoading, error: error ? t(error) : null };
}
