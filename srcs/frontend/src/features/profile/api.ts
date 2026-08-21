import { apiRequest } from "../../lib/apiClient";
import type { CategoryDto } from "../categories/types";
import type { FileDto } from "../files/types";

// Reads return whole Category rows; writes send slugs. The two differ on
// purpose: the server owns the vocabulary, so the client names a category
// rather than describing one.
export interface ArtistProfileFields {
	categories: CategoryDto[];
	bio: string | null;
	location: string | null;
	availability: boolean;
	// The caller's public files — an artist's portfolio is simply their public
	// uploads, no separate relation. See listPublicFilesFor on the backend.
	portfolio: FileDto[];
}

export interface HirerProfileFields {
	categories: CategoryDto[];
	organizationName: string;
	bio: string | null;
	location: string | null;
	availability: boolean;
	portfolio: FileDto[];
}

export interface ProfileUpdate {
	categories?: string[];
	organizationName?: string;
	bio?: string | null;
	location?: string | null;
	availability?: boolean;
}

export type ProfileFields = ArtistProfileFields | HirerProfileFields;

export async function saveMyProfile(updates: ProfileUpdate): Promise<ProfileFields> {
	return await apiRequest("/profile/me", {
		method: "PATCH",
		body: JSON.stringify(updates),
	});
}

export async function fetchMyProfile(userId: string): Promise<ProfileFields> {
	return apiRequest(`/profile/${userId}`);
}
