import { request } from "../auth/api";
import type { CategoryDto } from "../categories/types";

// Reads return whole Category rows; writes send slugs. The two differ on
// purpose: the server owns the vocabulary, so the client names a category
// rather than describing one.
export interface ArtistProfileFields {
	categories: CategoryDto[];
	bio: string | null;
	location: string | null;
	rate: number | null;
	availability: boolean;
}

export interface HirerProfileFields {
	categories: CategoryDto[];
	organizationName: string;
	bio: string | null;
	location: string | null;
	availability: boolean;
}

export interface ProfileUpdate {
	categories?: string[];
	organizationName?: string;
	bio?: string | null;
	location?: string | null;
	rate?: number | null;
	availability?: boolean;
}

export type ProfileFields = ArtistProfileFields | HirerProfileFields;

export async function saveMyProfile(updates: ProfileUpdate): Promise<ProfileFields> {
	return await request("/profile/me", {
		method: "PATCH",
		body: JSON.stringify(updates),
	});
}

export async function fetchMyProfile(userId: string): Promise<ProfileFields> {
	return request(`/profile/${userId}`);
}
