import { ApiError, apiRequest } from "../../lib/apiClient";
import type { GigDto } from "../gigs/types";
import type { ArtistCandidateDto } from "../artists/types";
import type { SwipeInput, SwipeResult } from "./types";

async function fetchNext<T>(query: string): Promise<T | null> {
	try {
		return await apiRequest<T>(`/swipes/next${query}`);
	} catch (err) {
		if (err instanceof ApiError && err.code === "NO_MORE_CANDIDATES") return null;
		throw err;
	}
}

/** Artist mode: next open gig the caller hasn't swiped yet. */
export function getNextGig(): Promise<GigDto | null> {
	return fetchNext<GigDto>("");
}

/**
 * Hirer mode: next artist candidate. With a gigId, scoped to that gig's
 * category and swipe history; without one, browses every available artist.
 */
export function getNextArtistCandidate(gigId?: string): Promise<ArtistCandidateDto | null> {
	return fetchNext<ArtistCandidateDto>(gigId ? `?gigId=${encodeURIComponent(gigId)}` : "");
}

export async function postSwipe(input: SwipeInput): Promise<SwipeResult> {
	try {
		return await apiRequest<SwipeResult>("/swipes", {
			method: "POST",
			body: JSON.stringify(input),
		});
	} catch (err) {
		// The candidate pool can briefly hand out the same target more than once
		// (each stack slot is filled by its own /next call); treat a re-swipe as a no-op.
		if (err instanceof ApiError && err.code === "SWIPE_EXISTS") return {};
		throw err;
	}
}
