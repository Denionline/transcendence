import { fileToMediaItem } from "../files/toMediaItem";
import type { Artist, ArtistCandidateDto, ProfileMediaItem } from "./types";

export function mapArtistCandidateToArtist(candidate: ArtistCandidateDto): Artist {
	const photoUrl = candidate.user?.avatarUrl ?? null;

	// The same gallery the artist sees on their own profile: the avatar first
	// (if set), then every public portfolio file, newest first. Skipped when
	// the avatar is itself one of those portfolio files (a real case — an
	// artist can upload the same photo both as their avatar and into their
	// portfolio) — otherwise that photo would render twice.
	const media: ProfileMediaItem[] = [];
	const avatarAlreadyInPortfolio = candidate.portfolio.some((file) => file.url === photoUrl);
	if (photoUrl && !avatarAlreadyInPortfolio)
		media.push({
			id: `${candidate.id}-avatar`,
			type: "image",
			url: photoUrl,
			label: "Profile photo",
		});
	for (const file of candidate.portfolio) {
		const item = fileToMediaItem(file);
		if (item) media.push(item);
	}

	return {
		id: candidate.id,
		userId: candidate.userId,
		name: candidate.user?.username ?? "Unnamed artist",
		discipline: candidate.categories[0]?.label ?? "Discipline TBD",
		categorySlugs: candidate.categories.map((category) => category.slug),
		location: candidate.location ?? "",
		remoteOk: false,
		availabilityLabel: candidate.availability ? "Available now" : "Unavailable",
		availabilityTone: candidate.availability ? "available" : "soon",
		tags: candidate.categories.map((category) => category.label),
		photoUrl,
		bio: candidate.bio ?? "",
		media,
	};
}
