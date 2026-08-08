import type { ProfileDto } from "../profiles/types";
import type { Artist } from "./types";

export function mapProfileToArtist(profile: ProfileDto): Artist {
	return {
		id: profile.id,
		userId: profile.userId,
		name: profile.user?.username ?? "Unnamed artist",
		discipline: profile.category,
		location: profile.location ?? "Location TBD",
		remoteOk: false,
		availabilityLabel: profile.availability ? "Free" : "Unavailable",
		availabilityTone: profile.availability ? "available" : "soon",
		priceTier: profile.rate != null ? `€${profile.rate}` : "Rate TBD",
		tags: [],
		photoUrl: profile.user?.avatarUrl ?? null,
		bio: profile.bio ?? "",
	};
}
