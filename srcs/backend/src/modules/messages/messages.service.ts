import { prisma } from "../../lib/prisma.js";

interface MessagesQuery {
	matchId: string;
	page: number;
	pageSize: number;
}

interface CreateMessageData {
	matchId: string;
	senderId: string;
	content: string;
}

export function parseMessageContent(content: unknown) {
	if (typeof content !== "string" || content.length < 1 || content.length > 2000) {
		return false;
	}
	return true;
}

export async function createMessage(data: CreateMessageData) {
	try {
		const message = await prisma.chatMessage.create({
			data: { matchId: data.matchId, senderId: data.senderId, content: data.content },
		});
		return { state: true, message };
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error(`[WebSocket] Failed to save message for ${data.senderId}:`, error);
		return { state: false, message: undefined };
	}
}

export async function getMatchMessages(data: MessagesQuery) {
	const [items, total] = await prisma.$transaction([
		prisma.chatMessage.findMany({
			where: { matchId: data.matchId },
			orderBy: { createdAt: "desc" },
			skip: (data.page - 1) * data.pageSize,
			take: data.pageSize,
		}),
		prisma.chatMessage.count({
			where: { matchId: data.matchId },
		}),
	]);
	return { items, total };
}
