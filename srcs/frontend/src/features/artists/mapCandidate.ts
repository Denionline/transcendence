import type { Artist, ArtistCandidateDto } from "./types";

export function mapArtistCandidateToArtist(candidate: ArtistCandidateDto): Artist {
	return {
		id: candidate.id,
		userId: candidate.userId,
		name: candidate.user?.username ?? "Unnamed artist",
		discipline: candidate.categories[0]?.label ?? "Discipline TBD",
		location: candidate.location ?? "Location TBD",
		remoteOk: false,
		availabilityLabel: candidate.availability ? "Available now" : "Unavailable",
		availabilityTone: candidate.availability ? "available" : "soon",
		priceTier: "Rate on request",
		tags: candidate.categories.map((category) => category.label),
		photoUrl: candidate.user?.avatarUrl ?? null,
		bio: candidate.bio ?? "",
	};
}
