import type { FileDto } from "../files/types";

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

export interface PublicArtistProfileDto {
	role: "artist";
	/** The owner's `public` files — GET /api/profile/:id never lists a private one. */
	portfolio?: FileDto[];
	category: string;
	bio: string | null;
	location: string | null;
	availability: boolean;
	user?: PublicProfileUser | null;
}

export interface PublicHirerProfileDto {
	role: "hirer";
	portfolio?: FileDto[];
	category: string;
	organizationName: string;
	bio: string | null;
	location: string | null;
	availability: boolean;
	user?: PublicProfileUser | null;
}

export type PublicProfileDto = PublicArtistProfileDto | PublicHirerProfileDto;
