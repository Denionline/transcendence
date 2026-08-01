import { apiRequest } from "../../lib/apiClient";
import type { PaginatedResponse, ProfileDto } from "./types";

interface ListProfilesParams {
	kind?: "artist" | "hirer";
	page?: number;
	pageSize?: number;
}

export async function listProfiles(
	params: ListProfilesParams = {},
): Promise<PaginatedResponse<ProfileDto>> {
	const search = new URLSearchParams();
	if (params.kind) search.set("kind", params.kind);
	if (params.page) search.set("page", String(params.page));
	if (params.pageSize) search.set("pageSize", String(params.pageSize));
	const qs = search.toString();
	return apiRequest<PaginatedResponse<ProfileDto>>(`/profiles${qs ? `?${qs}` : ""}`);
}
