export interface MatchDto {
	matchId: string;
	otherUser: {
		id: string;
		displayName: string;
		avatarUrl: string | null;
		online: boolean;
	};
	gig: { id: string; title: string };
	unreadCount: number;
}
