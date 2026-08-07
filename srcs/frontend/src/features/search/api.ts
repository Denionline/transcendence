import { apiRequest } from "../../lib/apiClient";
import type { PublicProfileDto, SearchProfileResult } from "./types";

/** Name-only search across artist and hirer profiles. */
export function searchProfiles(query: string): Promise<SearchProfileResult[]> {
	const search = new URLSearchParams({ q: query });
	return apiRequest<SearchProfileResult[]>(`/search/profiles?${search.toString()}`);
}

export function fetchPublicProfile(userId: string): Promise<PublicProfileDto> {
	return apiRequest<PublicProfileDto>(`/profile/${userId}`);
}
