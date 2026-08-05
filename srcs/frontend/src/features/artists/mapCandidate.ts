import type { Artist, ArtistCandidateDto } from "./types";

export function mapArtistCandidateToArtist(candidate: ArtistCandidateDto): Artist {
	return {
		id: candidate.id,
		userId: candidate.userId,
		name: candidate.user?.username ?? "Unnamed artist",
		discipline: candidate.category,
		location: candidate.location ?? "Location TBD",
		remoteOk: false,
		availabilityLabel: candidate.availability ? "Available now" : "Unavailable",
		availabilityTone: candidate.availability ? "available" : "soon",
		priceTier: "Rate on request",
		tags: [],
		photoUrl: candidate.user?.avatarUrl ?? null,
		bio: candidate.bio ?? "",
	};
}
