import { apiRequest } from "../../lib/apiClient";
import type { ChatMessageDto, MessagesPageDto, SendMessageResult } from "./types";
import { getSocket } from "../../lib/socket";

/**
 * One page of a match's chat history — newest first (see messages.service.ts),
 * reverse it when rendering top-to-bottom.
 */
export function listMessages(matchId: string, page = 1, pageSize = 30): Promise<MessagesPageDto> {
	return apiRequest<MessagesPageDto>(
		`/matches/${matchId}/messages?page=${page}&pageSize=${pageSize}`,
	);
}

export function markMessagesRead(matchId: string): Promise<void> {
	return apiRequest<void>(`/matches/${matchId}/messages/read`, {
		method: "PATCH",
	});
}

export function sendMessage(
	matchId: string,
	content: string,
	senderId: string,
): Promise<SendMessageResult> {
	return new Promise((resolve, reject) => {
		const socket = getSocket();

		function handleMessageError(payload: { reason: string }) {
			socket.off("message_error", handleMessageError);
			reject(new Error(payload.reason));
		}
		socket.once("message_error", handleMessageError);

		socket
			.timeout(5000)
			.emit(
				"send_message",
				{ matchId, content },
				(err: Error | null, response?: { chatMessageId: string }) => {
					socket.off("message_error", handleMessageError);
					if (err || !response) {
						reject(err ?? new Error("No response from server"));
						return;
					}
					resolve({ chatMessageId: response.chatMessageId, content, matchId, senderId });
				},
			);
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
