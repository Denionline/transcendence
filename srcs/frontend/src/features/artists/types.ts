import type { CategoryDto } from "../categories/types";

/**
 * One item in a profile's media gallery — today these are synthesized client-side
 * (see mockProfileMedia.ts) since the backend doesn't yet persist a media list per
 * profile, only the single `User.avatarUrl`. The shape is deliberately what a real
 * `GET /profiles/:id` media array would look like, so swapping the mock builder for
 * real API data later is a one-file change.
 */
export interface ProfileMediaItem {
	id: string;
	type: "image" | "video" | "audio";
	url: string;
	/** Poster frame shown before a video plays / while it loads. */
	posterUrl?: string;
	/** Short caption shown in the thumbnail strip's accessible label. */
	label?: string;
}

export interface Artist {
	id: string;
	userId: string;
	name: string;
	discipline: string;
	/** Normalized matching keys for every category the artist carries — used by the discipline filter. */
	categorySlugs: string[];
	location: string;
	remoteOk: boolean;
	availabilityLabel: string;
	availabilityTone: "available" | "soon";
	tags: string[];
	verified?: boolean;
	photoUrl?: string | null;
	bio: string;
	/** Gallery shown in the profile pop-up — always has at least a fallback entry. */
	media: ProfileMediaItem[];
}

/** Shape returned by GET /swipes/next for a hirer (an artist candidate for one of their gigs). */
export interface ArtistCandidateDto {
	id: string;
	userId: string;
	categories: CategoryDto[];
	bio: string | null;
	location: string | null;
	availability: boolean;
	user?: {
		username: string;
		avatarUrl: string | null;
	} | null;
}
