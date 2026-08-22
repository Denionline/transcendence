import { apiRequest } from "../../lib/apiClient";
import type { FriendSummary } from "./types";

interface PaginatedResponse<T> {
	items: T[];
	hasMore: boolean;
}

export function listFriends(page = 1, pageSize = 30): Promise<PaginatedResponse<FriendSummary>> {
	return apiRequest<PaginatedResponse<FriendSummary>>(`/friends?page=${page}&pageSize=${pageSize}`);
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
