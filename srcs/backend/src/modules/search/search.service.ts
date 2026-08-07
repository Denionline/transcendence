import { prisma } from "../../lib/prisma.js";
import { UserRole } from "../../../generated/prisma/enums.js";

export interface ProfileSearchResult {
	userId: string;
	username: string;
	avatarUrl: string | null;
	role: UserRole;
}

const MAX_RESULTS = 5;
// Cast a slightly wider net than MAX_RESULTS before ranking, so a prefix
// match further down the alphabet still gets a chance to outrank a
// mid-string match that happens to sort earlier.
const CANDIDATE_POOL_SIZE = 25;

/**
 * Name-only search across artist and hirer profiles. Accounts without a
 * completed profile yet (no ArtistProfile/HirerProfile row — see the
 * mandatory onboarding flow) are excluded: there's nothing to show for them.
 */
export async function searchProfiles(query: string): Promise<ProfileSearchResult[]> {
	const q = query.trim();
	if (q === "") return [];

	const candidates = await prisma.user.findMany({
		where: {
			username: { contains: q, mode: "insensitive" },
			OR: [
				{ role: UserRole.artist, artistProfile: { isNot: null } },
				{ role: UserRole.hirer, hirerProfile: { isNot: null } },
			],
		},
		select: { id: true, username: true, avatarUrl: true, role: true },
		take: CANDIDATE_POOL_SIZE,
	});

	// A name that starts with the query reads as a better match than one that
	// merely contains it somewhere in the middle — rank those first, then
	// alphabetically within each group.
	const lowerQ = q.toLowerCase();
	candidates.sort((a, b) => {
		const aIsPrefix = a.username.toLowerCase().startsWith(lowerQ) ? 0 : 1;
		const bIsPrefix = b.username.toLowerCase().startsWith(lowerQ) ? 0 : 1;
		if (aIsPrefix !== bIsPrefix) return aIsPrefix - bIsPrefix;
		return a.username.localeCompare(b.username);
	});

	return candidates.slice(0, MAX_RESULTS).map((user) => ({
		userId: user.id,
		username: user.username,
		avatarUrl: user.avatarUrl,
		role: user.role,
	}));
}
