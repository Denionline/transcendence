import { apiRequest } from "../../lib/apiClient";
import type { ChatMessageDto, MessagesPageDto, SendMessageResult } from "./types";

/**
 * One page of a match's chat history — newest first (see messages.service.ts),
 * reverse it when rendering top-to-bottom.
 */
export function listMessages(matchId: string, page = 1, pageSize = 30): Promise<MessagesPageDto> {
	return apiRequest<MessagesPageDto>(
		`/matches/${matchId}/messages?page=${page}&pageSize=${pageSize}`,
	);
}

export function sendMessage(matchId: string, content: string): Promise<SendMessageResult> {
	return apiRequest<SendMessageResult>(`/matches/${matchId}/messages`, {
		method: "POST",
		body: JSON.stringify({ content }),
	});
}

/** Turns a just-sent POST result into a displayable message, stamped with the local send time. */
export function toOptimisticMessage(result: SendMessageResult): ChatMessageDto {
	return {
		id: result.chatMessageId,
		matchId: result.matchId,
		senderId: result.senderId,
		content: result.content,
		createdAt: new Date().toISOString(),
	};
}
