/** One chat message, as returned by GET /matches/:matchId/messages. */
export interface ChatMessageDto {
	id: string;
	matchId: string;
	senderId: string;
	content: string;
	createdAt: string;
}

export interface MessagesPageDto {
	items: ChatMessageDto[];
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
	hasMore: boolean;
}

/** Shape returned by POST /matches/:matchId/messages — no createdAt, the caller stamps its own. */
export interface SendMessageResult {
	chatMessageId: string;
	content: string;
	matchId: string;
	senderId: string;
}
