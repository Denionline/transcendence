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

export interface PublicArtistProfileDto {
	role: "artist";
	portfolio?: FileDto[];
	category: string;
	bio: string | null;
	location: string | null;
	availability: boolean;
	user?: PublicProfileUser | null;
	friendshipStatus?: FriendshipStatus;
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
	friendshipStatus?: FriendshipStatus;
}

export type PublicProfileDto = PublicArtistProfileDto | PublicHirerProfileDto;
