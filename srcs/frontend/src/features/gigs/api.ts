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

/** Hard-deletes a gig. The backend allows this for the gig's owner or an admin
 *  (see gigs.routes.ts); the app only surfaces it from the admin area. */
export function deleteGig(id: string): Promise<null> {
	return apiRequest<null>(`/gigs/${id}`, { method: "DELETE" });
}

/** Every gig on the platform, paged out in full — admin-only listing. */
export async function listAllGigs(): Promise<GigDto[]> {
	const pageSize = 100;
	const first = await apiRequest<GigListResponse>(`/gigs?page=1&pageSize=${pageSize}`);
	const gigs = [...first.items];
	const totalPages = Math.ceil(first.total / first.pageSize);
	for (let page = 2; page <= totalPages; page++) {
		const next = await apiRequest<GigListResponse>(`/gigs?page=${page}&pageSize=${pageSize}`);
		gigs.push(...next.items);
	}
	return gigs;
}
