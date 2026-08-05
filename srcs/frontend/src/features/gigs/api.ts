import { apiRequest } from "../../lib/apiClient";
import type { GigDto, GigListResponse } from "./types";

/** The caller's own open gigs, used by hirers to pick which gig they're reviewing candidates for. */
export async function listMyOpenGigs(): Promise<GigDto[]> {
	const res = await apiRequest<GigListResponse>("/gigs?mine=true&status=open&pageSize=100");
	return res.items;
}
