import { prisma } from "../../lib/prisma.js";
import { throwError } from "../../lib/http-error.js";
import { Prisma } from "../../../generated/prisma/client.js";

interface MessagesQuery {
	callerId: string;
	matchId: string;
	page: number;
	pageSize: number;
}

interface CreateMessageData {
	matchId: string;
	senderId: string;
	content: string;
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
	const idsToMarkRead = items.filter((val) => val.senderId !== data.callerId).map((val) => val.id);
	if (idsToMarkRead.length > 0) {
		await prisma.chatMessage.updateMany({
			where: { id: { in: idsToMarkRead }, isRead: false },
			data: { isRead: true },
		});
	}
	return { items, total };
}

export async function markMessagesAsRead(callerId: string, matchId: string) {
	await prisma.chatMessage.updateMany({
		where: {
			matchId: matchId,
			senderId: { not: callerId },
			isRead: false,
		},
		data: { isRead: true },
	});
}

export async function deleteMessage(messageId: string) {
	try {
		await prisma.chatMessage.delete({ where: { id: messageId } });
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025")
			throwError(404, "MESSAGE_NOT_FOUND", "message not found");
		throw error;
	}
}
