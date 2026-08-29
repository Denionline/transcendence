import type { PublicArtistProfileDto } from "../search/types";
import { fileToMediaItem } from "../files/toMediaItem";
import type { Artist, ProfileMediaItem } from "./types";

/**
 * Maps another artist's public profile (GET /profile/:id, opened from a
 * search result) into the same `Artist` shape the swipe deck uses — so a
 * search hit renders through the exact same ArtistDetailsModal a hirer sees
 * when they open an ArtistCard, real portfolio included.
 */
export function mapPublicProfileToArtist(profile: PublicArtistProfileDto): Artist {
	const photoUrl = profile.user?.avatarUrl ?? null;
	return {
		id: profile.id,
		userId: profile.userId,
		name: profile.user?.username ?? "Unnamed artist",
		discipline: profile.categories[0]?.label ?? "Discipline TBD",
		categorySlugs: profile.categories.map((category) => category.slug),
		location: profile.location ?? "",
		remoteOk: false,
		availabilityLabel: profile.availability ? "Available" : "Unavailable",
		availabilityTone: profile.availability ? "available" : "soon",
		tags: profile.categories.map((category) => category.label),
		photoUrl,
		bio: profile.bio ?? "",
		media: profile.portfolio
			.map(fileToMediaItem)
			.filter((item): item is ProfileMediaItem => item !== null),
	};
}
