import type { ProfileDto } from "../profiles/types";
import { buildMockProfileMedia } from "./mockProfileMedia";
import type { Artist } from "./types";

export function mapProfileToArtist(profile: ProfileDto): Artist {
	const photoUrl = profile.user?.avatarUrl ?? null;
	return {
		id: profile.id,
		userId: profile.userId,
		name: profile.user?.username ?? "Unnamed artist",
		discipline: profile.categories[0]?.label ?? "Discipline TBD",
		categorySlugs: profile.categories.map((category) => category.slug),
		location: profile.location ?? "Location TBD",
		remoteOk: false,
		availabilityLabel: profile.availability ? "Free" : "Unavailable",
		availabilityTone: profile.availability ? "available" : "soon",
		//	Every category the artist holds, not just the headline one.
		tags: profile.categories.map((category) => category.label),
		photoUrl,
		bio: profile.bio ?? "",
		media: buildMockProfileMedia(profile.id, photoUrl),
	};
}
