import { apiRequest } from "../../lib/apiClient";
import type { FriendshipStatus, FriendSummary } from "./types";

interface PaginatedResponse<T> {
	items: T[];
	hasMore: boolean;
}

export function listFriends(page = 1, pageSize = 30): Promise<PaginatedResponse<FriendSummary>> {
	return apiRequest<PaginatedResponse<FriendSummary>>(`/friends?page=${page}&pageSize=${pageSize}`);
}

//	For a caller that already has a userId but no friendshipStatus of its own
//	— a swipe candidate, e.g., unlike GET /profile/:id's result — without
//	paying for a full profile fetch just to read one field.
export function fetchFriendshipStatus(userId: string): Promise<FriendshipStatus> {
	return apiRequest<{ status: FriendshipStatus }>(`/friends/${userId}`).then((res) => res.status);
}

export function sendFriendRequest(userId: string): Promise<unknown> {
	return apiRequest(`/friends/${userId}`, { method: "POST" });
}

export function respondToRequest(userId: string, accepted: boolean): Promise<unknown> {
	return apiRequest(`/friends/${userId}`, {
		method: "PATCH",
		body: JSON.stringify({ accepted }),
	});
}

export function removeFriend(userId: string): Promise<null> {
	return apiRequest(`/friends/${userId}`, { method: "DELETE" });
}
