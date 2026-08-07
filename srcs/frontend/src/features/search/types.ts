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
	category: string;
	bio: string | null;
	location: string | null;
	availability: boolean;
	user?: PublicProfileUser | null;
}

export interface PublicHirerProfileDto {
	role: "hirer";
	category: string;
	organizationName: string;
	bio: string | null;
	location: string | null;
	availability: boolean;
	user?: PublicProfileUser | null;
}

export type PublicProfileDto = PublicArtistProfileDto | PublicHirerProfileDto;
