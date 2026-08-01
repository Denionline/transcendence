export interface InterestDto {
	id: string;
	status: "pending" | "accepted" | "declined";
	otherUser: {
		id: string;
		displayName: string;
		avatarUrl: string | null;
		kind: "artist" | "hirer";
	};
}
