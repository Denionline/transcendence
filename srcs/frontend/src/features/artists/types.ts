import type { CategoryDto } from "../categories/types";

export interface Artist {
	id: string;
	userId: string;
	name: string;
	discipline: string;
	location: string;
	remoteOk: boolean;
	availabilityLabel: string;
	availabilityTone: "available" | "soon";
	priceTier: string;
	tags: string[];
	verified?: boolean;
	photoUrl?: string | null;
	bio: string;
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
