import { useEffect, useState } from "react";
import type { GigDto } from "../../gigs/types";
import { deleteGig, listAllGigs } from "../../gigs/api";

/** Mirrors useUsers: loads every gig once, and removes one from the list
 *  optimistically after the delete resolves. */
export function useAdminGigs() {
	const [gigs, setGigs] = useState<GigDto[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function load() {
			try {
				const data = await listAllGigs();
				if (!cancelled) setGigs(data);
			} catch (err) {
				if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load gigs");
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		}

		load();

		return () => {
			cancelled = true;
		};
	}, []);

	async function remove(id: string) {
		await deleteGig(id);
		setGigs((prev) => prev.filter((gig) => gig.id !== id));
	}

	return { gigs, isLoading, error, remove };
}
