import { request } from "../auth/api";

export interface ArtistProfileFields {
	category: string;
	bio: string | null;
	location: string | null;
	rate: number | null;
	availability: boolean;
}

export interface HirerProfileFields {
	category: string;
	organizationName: string;
	bio: string | null;
	location: string | null;
	availability: boolean;
}

export type ProfileFields = ArtistProfileFields | HirerProfileFields;

export async function saveMyProfile(updates: Partial<ProfileFields>): Promise<ProfileFields> {
	return await request("/profile/me", {
		method: "PATCH",
		body: JSON.stringify(updates),
	});
}

export async function fetchMyProfile(userId: string): Promise<ProfileFields> {
	return request(`/profile/${userId}`);
}
