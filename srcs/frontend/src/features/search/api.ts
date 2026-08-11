import { apiRequest } from "../../lib/apiClient";
import type { PublicProfileDto, SearchProfileResult } from "./types";

const MAX_RESULTS = 5;

interface PaginatedResponse<T> {
	items: T[];
}

interface ArtistSearchItem {
	userId: string;
	user?: { username: string; avatarUrl: string | null } | null;
}

interface GigSearchItem {
	hirerId: string;
	hirer?: { username: string; avatarUrl: string | null } | null;
}

// There is no unified "search profiles" endpoint on the backend — only
// GET /search/artists and GET /search/gigs, each scoped to one profile kind.
// The navbar's quick-search box adapts to that split rather than the other
// way around: a hirer searches the artist pool they'd browse on Discover, an
// artist searches the gig pool they'd browse on Opportunities, and each gig
// result surfaces its hirer, since that's the profile worth opening from a
// gig hit.
async function searchArtistProfiles(query: string): Promise<SearchProfileResult[]> {
	const search = new URLSearchParams({ q: query, pageSize: String(MAX_RESULTS) });
	const res = await apiRequest<PaginatedResponse<ArtistSearchItem>>(
		`/search/artists?${search.toString()}`,
	);
	return res.items
		.filter((item) => item.user)
		.map((item) => ({
			userId: item.userId,
			username: item.user!.username,
			avatarUrl: item.user!.avatarUrl,
			role: "artist" as const,
		}));
}

async function searchGigHirers(query: string): Promise<SearchProfileResult[]> {
	const search = new URLSearchParams({ q: query, pageSize: String(MAX_RESULTS) });
	const res = await apiRequest<PaginatedResponse<GigSearchItem>>(
		`/search/gigs?${search.toString()}`,
	);
	// Several gigs can share a hirer — the same hirer shouldn't show up once
	// per gig in a name-only search box.
	const byHirer = new Map<string, SearchProfileResult>();
	for (const item of res.items) {
		if (!item.hirer || byHirer.has(item.hirerId)) continue;
		byHirer.set(item.hirerId, {
			userId: item.hirerId,
			username: item.hirer.username,
			avatarUrl: item.hirer.avatarUrl,
			role: "hirer" as const,
		});
	}
	return Array.from(byHirer.values()).slice(0, MAX_RESULTS);
}

/** Name-only search backing the navbar's quick-search box. */
export function searchProfiles(
	query: string,
	callerRole: "artist" | "hirer",
): Promise<SearchProfileResult[]> {
	return callerRole === "hirer" ? searchArtistProfiles(query) : searchGigHirers(query);
}

export function fetchPublicProfile(userId: string): Promise<PublicProfileDto> {
	return apiRequest<PublicProfileDto>(`/profile/${userId}`);
}
