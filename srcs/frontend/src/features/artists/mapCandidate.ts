import type { Artist, ArtistCandidateDto } from "./types";

export function mapArtistCandidateToArtist(candidate: ArtistCandidateDto): Artist {
	return {
		id: candidate.id,
		userId: candidate.userId,
		name: candidate.user?.username ?? "Unnamed artist",
		discipline: candidate.category,
		// `??` alone misses an explicitly empty string (as opposed to a genuinely
		// unset/null location) — both mean "nothing was specified" and should
		// fall back the same way.
		location: candidate.location?.trim() ? candidate.location : "Location TBD",
		remoteOk: false,
		availabilityLabel: candidate.availability ? "Available now" : "Unavailable",
		availabilityTone: candidate.availability ? "available" : "soon",
		priceTier: "Rate on request",
		tags: [],
		photoUrl: candidate.user?.avatarUrl ?? null,
		bio: candidate.bio ?? "",
	};
}
