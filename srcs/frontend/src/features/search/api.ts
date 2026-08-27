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

interface HirerSearchItem {
	userId: string;
	user?: { username: string; avatarUrl: string | null } | null;
}

// The navbar's quick-search box is name-only and searches both pools
// regardless of the caller's own role — a hirer can find another hirer as
// well as an artist, and vice versa. Each pool hits its own endpoint
// directly (GET /search/artists, GET /search/hirers) rather than going
// through GET /search/gigs, which would only surface hirers who have
// already posted a gig — a 0-gig hirer, like a freshly signed-up one, would
// never show up that way.
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

async function searchHirerProfiles(query: string): Promise<SearchProfileResult[]> {
	const search = new URLSearchParams({ q: query, pageSize: String(MAX_RESULTS) });
	const res = await apiRequest<PaginatedResponse<HirerSearchItem>>(
		`/search/hirers?${search.toString()}`,
	);
	return res.items
		.filter((item) => item.user)
		.map((item) => ({
			userId: item.userId,
			username: item.user!.username,
			avatarUrl: item.user!.avatarUrl,
			role: "hirer" as const,
		}));
}

//	Alternates so neither pool crowds the other out of the capped list — an
//	unbroken run of one role (e.g. 5 artists) would otherwise hide every
//	hirer match even when one exists.
function interleave<T>(a: T[], b: T[]): T[] {
	const merged: T[] = [];
	const longest = Math.max(a.length, b.length);
	for (let i = 0; i < longest; i++) {
		if (i < a.length) merged.push(a[i]);
		if (i < b.length) merged.push(b[i]);
	}
	return merged;
}

/**
 * Name-only search backing the navbar's quick-search box. Searches both the
 * artist and hirer pools regardless of the caller's own role, so a hirer can
 * find another hirer (or an artist) and vice versa. One pool failing to load
 * doesn't blank out the other.
 */
export async function searchProfiles(query: string): Promise<SearchProfileResult[]> {
	const [artists, hirers] = await Promise.all([
		searchArtistProfiles(query).catch(() => [] as SearchProfileResult[]),
		searchHirerProfiles(query).catch(() => [] as SearchProfileResult[]),
	]);
	return interleave(artists, hirers).slice(0, MAX_RESULTS);
}

export function fetchPublicProfile(userId: string): Promise<PublicProfileDto> {
	return apiRequest<PublicProfileDto>(`/profile/${userId}`);
}
