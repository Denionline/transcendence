import type { CategoryDto } from "../categories/types";
import type { FileDto } from "../files/types";

/**
 * One item in a profile's media gallery — built from the artist's real
 * `File` rows via `fileToMediaItem` (see files/toMediaItem.ts). Kept as its
 * own shape, rather than reusing `FileDto` directly, because `ArtistCard`'s
 * viewer (`ProfileMediaGallery`) also wants a `posterUrl` slides can supply
 * that has no equivalent on a stored file.
 */
export interface ProfileMediaItem {
	id: string;
	type: "image" | "video" | "audio";
	url: string;
	/** Poster frame shown before a video plays / while it loads. */
	posterUrl?: string;
	/** Short caption shown in the thumbnail strip's accessible label. */
	label?: string;
}

export interface Artist {
	id: string;
	userId: string;
	name: string;
	discipline: string;
	/** Normalized matching keys for every category the artist carries — used by the discipline filter. */
	categorySlugs: string[];
	location: string;
	remoteOk: boolean;
	availabilityLabel: string;
	availabilityTone: "available" | "soon";
	tags: string[];
	verified?: boolean;
	photoUrl?: string | null;
	bio: string;
	/** Gallery shown in the profile pop-up — always has at least a fallback entry. */
	media: ProfileMediaItem[];
}

/** Shape returned by GET /swipes/next for a hirer (an artist candidate for one of their gigs). */
export interface ArtistCandidateDto {
	id: string;
	userId: string;
	categories: CategoryDto[];
	bio: string | null;
	location: string | null;
	availability: boolean;
	user?: {
		username: string;
		avatarUrl: string | null;
	} | null;
	/** The same public files `GET /profile/:id` calls `portfolio` — real uploads, not mock media. */
	portfolio: FileDto[];
}
