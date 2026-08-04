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

// There is no backend endpoint for artist/hirer profile fields yet (that's a
// separate backend issue). This mirrors updatePasswordRequest in
// features/auth/api.ts: a real form calls it, the user sees a clear "not
// available yet" message, and this is the only place to update once the
// backend exists.
export async function saveMyProfile(updates: Partial<ProfileFields>): Promise<ProfileFields> {
	void updates;
	throw new Error("Saving your artist/hirer profile details is not available yet");
}
