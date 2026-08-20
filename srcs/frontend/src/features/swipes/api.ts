import { ApiError, apiRequest } from "../../lib/apiClient";
import type { GigDto } from "../gigs/types";
import type { ArtistCandidateDto } from "../artists/types";
import type { SwipeInput, SwipeResult } from "./types";

function buildNextQuery(params: {
	gigId?: string;
	excludeIds?: string[];
	categorySlugs?: string[];
}): string {
	const search = new URLSearchParams();
	if (params.gigId) search.set("gigId", params.gigId);
	if (params.excludeIds && params.excludeIds.length > 0) {
		search.set("excludeIds", params.excludeIds.join(","));
	}
	if (params.categorySlugs && params.categorySlugs.length > 0) {
		search.set("categories", params.categorySlugs.join(","));
	}
	const qs = search.toString();
	return qs ? `?${qs}` : "";
}

// The backend answers "nothing left" with 200 + null, not a 404 — an empty
// feed is a valid result, not a failure, so there's no error path to catch.
function fetchNext<T>(query: string): Promise<T | null> {
	return apiRequest<T | null>(`/swipes/next${query}`);
}

/**
 * Artist mode: next open gig the caller hasn't swiped yet. Pass `excludeIds`
 * (ids already held in an on-screen deck) so each slot gets a distinct gig
 * instead of repeating whichever one is still first in line.
 */
export function getNextGig(excludeIds?: string[]): Promise<GigDto | null> {
	return fetchNext<GigDto>(buildNextQuery({ excludeIds }));
}

/**
 * Hirer mode: next artist candidate for one of the caller's own gigs.
 * `categorySlugs` lets the caller browse beyond the gig's own category for
 * this fetch — see getNextCandidateForHirer on the backend. It's a browsing
 * widener only, not persisted to the gig: liking a candidate outside the
 * gig's real category still fails CATEGORY_MISMATCH.
 */
export function getNextArtistCandidate(
	gigId: string,
	excludeIds?: string[],
	categorySlugs?: string[],
): Promise<ArtistCandidateDto | null> {
	return fetchNext<ArtistCandidateDto>(buildNextQuery({ gigId, excludeIds, categorySlugs }));
}

export async function postSwipe(input: SwipeInput): Promise<SwipeResult> {
	try {
		return await apiRequest<SwipeResult>("/swipes", {
			method: "POST",
			body: JSON.stringify(input),
		});
	} catch (err) {
		// Defensive: treat a re-swipe on an already-recorded target as a no-op
		// rather than surfacing an error.
		if (err instanceof ApiError && err.code === "SWIPE_EXISTS") return {};
		throw err;
	}
}
