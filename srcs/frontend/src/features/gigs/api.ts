import { apiRequest } from "../../lib/apiClient";
import type { CreateGigInput, GigDto, GigListResponse } from "./types";

/** The caller's own gigs (hirer only), optionally narrowed by status. */
export async function listMyGigs(params: { status?: "open" | "closed" } = {}): Promise<GigDto[]> {
	const search = new URLSearchParams({ mine: "true", pageSize: "100" });
	if (params.status) search.set("status", params.status);
	const res = await apiRequest<GigListResponse>(`/gigs?${search.toString()}`);
	return res.items;
}

export function getGig(id: string): Promise<GigDto> {
	return apiRequest<GigDto>(`/gigs/${id}`);
}

export function createGig(input: CreateGigInput): Promise<GigDto> {
	return apiRequest<GigDto>("/gigs", {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export function updateGigStatus(id: string, status: "open" | "closed"): Promise<GigDto> {
	return apiRequest<GigDto>(`/gigs/${id}`, {
		method: "PUT",
		body: JSON.stringify({ status }),
	});
}
