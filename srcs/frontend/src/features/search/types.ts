import type { CategoryDto } from "../categories/types";
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

// Mirrors what GET /profile/:id actually returns (profile.service.ts's
// getArtistProfile / getHirerProfile) — there's no `role` field on the wire;
// the two shapes are told apart the same way the rest of the app tells them
// apart, by whether `organizationName` is present.
export interface PublicArtistProfileDto {
	id: string;
	userId: string;
	categories: CategoryDto[];
	bio: string | null;
	location: string | null;
	availability: boolean;
	/** The owner's `public` files — GET /api/profile/:id never lists a private one. */
	portfolio: FileDto[];
	user?: PublicProfileUser | null;
}

export interface PublicHirerProfileDto {
	id: string;
	userId: string;
	categories: CategoryDto[];
	organizationName: string;
	bio: string | null;
	location: string | null;
	availability: boolean;
	portfolio: FileDto[];
	user?: PublicProfileUser | null;
}

export type PublicProfileDto = PublicArtistProfileDto | PublicHirerProfileDto;
