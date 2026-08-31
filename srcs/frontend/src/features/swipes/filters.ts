// Client-side matching against candidates pulled from GET /swipes/next. The
// endpoint itself only knows how to hand back the next not-yet-seen,
// category-matched candidate — it has no query params for discipline,
// location, or rate — so the "real" filtering promised by the left-side
// sidebar happens here, on whatever the backend streams back.

// An artist can carry several categories (see the multi-category migration),
// so the Discover sidebar's discipline facet is a real multi-select: a
// candidate passes if *any* of their categories is checked. An empty
// selection means "no restriction" — nothing is checked, so nothing is
// filtered out.
export function matchesDisciplineFilter(
	itemCategorySlugs: string[],
	selected: Set<string>,
): boolean {
	return selected.size === 0 || itemCategorySlugs.some((slug) => selected.has(slug));
}

/** `null` selection means "no restriction" — every availability passes. */
export function matchesAvailabilityFilter(
	itemTone: "available" | "soon",
	selected: "available" | "soon" | null,
): boolean {
	return selected === null || selected === itemTone;
}

// An empty location is what mapGig.ts/mapCandidate.ts substitute in for a gig or
// artist that never had a location set (both `null` and `""` collapse to it).
// That's the same "nothing to filter against" case as an empty query, on the
// other side of the match — excluding it would silently drop every
// location-less item the moment the *other* side's location filter (which,
// for both Discover and Opportunities, is locked to the caller's own locked
// profile/gig location, not freely typed) is non-empty.
/** Case-insensitive substring match; an empty query, or an unset item location, means "no restriction". */
export function matchesLocationFilter(itemLocation: string, query: string): boolean {
	const q = query.trim().toLowerCase();
	if (q === "") return true;
	const item = itemLocation.trim();
	if (item === "") return true;
	return item.toLowerCase().includes(q);
}

/** `null` floor means "no restriction"; a gig with no listed rate never clears a floor. */
export function matchesMinRateFilter(itemRate: number | null, minRate: number | null): boolean {
	if (minRate === null) return true;
	return itemRate !== null && itemRate >= minRate;
}
