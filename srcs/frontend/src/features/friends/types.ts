export type FriendshipStatus = "none" | "pending_sent" | "pending_received" | "accepted";

export interface FriendSummary {
	id: string;
	displayName: string;
	avatarUrl: string | null;
	status: "accepted";
	role: "artist" | "hirer";
	location: string | null;
}
