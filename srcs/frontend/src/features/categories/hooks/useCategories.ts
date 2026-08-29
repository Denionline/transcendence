import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchCategories } from "../api";
import type { CategoryDto } from "../types";

// The vocabulary is small, server-owned and effectively static for a session,
// so it is fetched once per mount and cached in memory. This replaces the
// hardcoded lists the frontend used to keep in sync with the database by hand.
let cache: CategoryDto[] | null = null;

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

	const translated = useMemo(
		() =>
			categories.map((category) => ({
				...category,
				label: t(`categories.${category.slug}`, { defaultValue: category.label }),
			})),
		[categories, t],
	);

	return { categories: translated, isLoading, error: error ? t(error) : null };
}
