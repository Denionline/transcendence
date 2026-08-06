import type { ArtistCandidateDto } from "../artists/types";

export interface SwipeInput {
	gigId: string;
	liked: boolean;
	/** Required when a hirer swipes on an artist candidate. */
	targetUserId?: string;
}

export interface SwipeResult {
	matchId?: string;
}

/** Shape returned by GET /swipes/interested: one artist's "interested" swipe on one of the caller's gigs. */
export interface InterestedArtistDto {
	swipeId: string;
	createdAt: string;
	gig: { id: string; title: string; status: "open" | "closed" };
	artist: ArtistCandidateDto;
}
