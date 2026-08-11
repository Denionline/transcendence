export interface SwipeInput {
	gigId: string;
	liked: boolean;
	/** Required when a hirer swipes on an artist candidate. */
	targetUserId?: string;
}

export interface SwipeResult {
	matchId?: string;
}
