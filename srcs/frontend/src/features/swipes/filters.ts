// Client-side matching against candidates pulled from GET /swipes/next. The
// endpoint itself only knows how to hand back the next not-yet-seen,
// category-matched candidate — it has no query params for discipline,
// location, or rate — so the "real" filtering promised by the left-side
// sidebar happens here, on whatever the backend streams back.

/** Empty selection means "no restriction" — every category passes. */
export function matchesCategoryFilter(itemCategory: string, selected: Set<string>): boolean {
	return selected.size === 0 || selected.has(itemCategory);
}

/** Case-insensitive substring match; an empty query means "no restriction". */
export function matchesLocationFilter(itemLocation: string, query: string): boolean {
	const q = query.trim().toLowerCase();
	return q === "" || itemLocation.toLowerCase().includes(q);
}

/** `null` floor means "no restriction"; a gig with no listed rate never clears a floor. */
export function matchesMinRateFilter(itemRate: number | null, minRate: number | null): boolean {
	if (minRate === null) return true;
	return itemRate !== null && itemRate >= minRate;
}
