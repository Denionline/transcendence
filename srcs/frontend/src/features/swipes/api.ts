import { ApiError, apiRequest } from "../../lib/apiClient";
import type { GigDto } from "../gigs/types";
import type { ArtistCandidateDto } from "../artists/types";
import type { InterestedArtistDto, SwipeInput, SwipeResult } from "./types";

function buildNextQuery(params: { gigId?: string; excludeIds?: string[] }): string {
	const search = new URLSearchParams();
	if (params.gigId) search.set("gigId", params.gigId);
	if (params.excludeIds && params.excludeIds.length > 0) {
		search.set("excludeIds", params.excludeIds.join(","));
	}
	const qs = search.toString();
	return qs ? `?${qs}` : "";
}

async function fetchNext<T>(query: string): Promise<T | null> {
	try {
		return await apiRequest<T>(`/swipes/next${query}`);
	} catch (err) {
		if (err instanceof ApiError && err.code === "NO_MORE_CANDIDATES") return null;
		throw err;
	}
}

/**
 * Artist mode: next open gig the caller hasn't swiped yet. Pass `excludeIds`
 * (ids already held in an on-screen deck) so each slot gets a distinct gig
 * instead of repeating whichever one is still first in line.
 */
export function getNextGig(excludeIds?: string[]): Promise<GigDto | null> {
	return fetchNext<GigDto>(buildNextQuery({ excludeIds }));
}

/** Hirer mode: next artist candidate for one of the caller's own gigs. */
export function getNextArtistCandidate(
	gigId: string,
	excludeIds?: string[],
): Promise<ArtistCandidateDto | null> {
	return fetchNext<ArtistCandidateDto>(buildNextQuery({ gigId, excludeIds }));
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

/**
 * Hirer mode: artists who swiped "interested" on one of the caller's gigs.
 * Pass `gigId` to narrow to a single opportunity; omit it to see interest
 * across every gig the hirer owns.
 */
export function listInterestedArtists(gigId?: string): Promise<InterestedArtistDto[]> {
	const search = new URLSearchParams();
	if (gigId) search.set("gigId", gigId);
	const qs = search.toString();
	return apiRequest<InterestedArtistDto[]>(`/swipes/interested${qs ? `?${qs}` : ""}`);
}
