import type { CategoryDto } from "../categories/types";
import type { FileDto } from "../files/types";
import type { FriendshipStatus } from "../friends/types";

export interface SearchProfileResult {
	userId: string;
	username: string;
	avatarUrl: string | null;
	role: "artist" | "hirer";
}

interface PublicProfileUser {
	username: string;
	avatarUrl: string | null;
}

// Mirrors what GET /profile/:id actually returns (profile.service.ts's
// getCallerProfile, which wraps getArtistProfile / getHirerProfile — see
// `role` and `friendshipStatus` there).
export interface PublicArtistProfileDto {
	role: "artist";
	id: string;
	userId: string;
	categories: CategoryDto[];
	bio: string | null;
	location: string | null;
	availability: boolean;
	/** The owner's `public` files — GET /api/profile/:id never lists a private one. */
	portfolio: FileDto[];
	user?: PublicProfileUser | null;
	friendshipStatus?: FriendshipStatus;
}

export interface PublicHirerProfileDto {
	role: "hirer";
	id: string;
	userId: string;
	categories: CategoryDto[];
	organizationName: string;
	bio: string | null;
	location: string | null;
	availability: boolean;
	portfolio: FileDto[];
	user?: PublicProfileUser | null;
	friendshipStatus?: FriendshipStatus;
}

export type PublicProfileDto = PublicArtistProfileDto | PublicHirerProfileDto;
