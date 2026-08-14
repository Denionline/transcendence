export interface PendingInterestDto {
	gigId: string;
	gig: { id: string; title: string };
	otherUser: {
		id: string;
		displayName: string;
		avatarUrl: string | null;
	};
	createdAt: string;
}
