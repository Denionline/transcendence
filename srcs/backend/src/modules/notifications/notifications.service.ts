import { prisma } from "../../lib/prisma.js";
import { NotificationType } from "../../../generated/prisma/enums.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { buildMeta } from "../../lib/pagination.js";

interface CreateNotificationData {
	userId: string;
	actorId?: string;
	type: NotificationType;
	data: Prisma.InputJsonValue;
}

const notificationSelect = {
	id: true,
	type: true,
	isRead: true,
	createdAt: true,
	data: true,
	actor: {
		select: {
			id: true,
			username: true,
			avatarUrl: true,
		},
	},
};

// The raw shape coming back from Prisma (matches `notificationSelect`).
interface NotificationRow {
	id: string;
	type: NotificationType;
	isRead: boolean;
	createdAt: Date;
	data: Prisma.JsonValue;
	actor: { id: string; username: string; avatarUrl: string | null } | null;
}

// The DTO shape sent to the frontend, once `data` has been unpacked per type.
interface NotificationSummary {
	id: string;
	type: NotificationType;
	isRead: boolean;
	createdAt: Date;
	actor?: {
		id: string;
		displayName: string;
		avatarUrl: string | null;
	};
	matchId?: string;
	gigId?: string;
	gigTitle?: string;
	preview?: string;
}

function toSummary(n: NotificationRow): NotificationSummary {
	return {
		id: n.id,
		type: n.type,
		isRead: n.isRead,
		createdAt: n.createdAt,
		gigId: (n.data as { gigId?: string } | null)?.gigId,
		gigTitle: (n.data as { gigTitle?: string } | null)?.gigTitle,
		actor: n.actor
			? {
					id: n.actor.id,
					displayName: n.actor.username,
					avatarUrl: n.actor.avatarUrl,
				}
			: undefined,
		matchId: (n.data as { matchId?: string } | null)?.matchId,
		preview: (n.data as { preview?: string } | null)?.preview,
	};
}

export async function createNotification(
	data: CreateNotificationData,
	client: Prisma.TransactionClient = prisma,
) {
	return client.notification.create({
		data: {
			userId: data.userId,
			actorId: data.actorId,
			type: data.type,
			data: data.data,
		},
	});
}

export async function getAllNotifications(callerId: string, page: number, pageSize: number) {
	const [items, total] = await prisma.$transaction([
		prisma.notification.findMany({
			where: { userId: callerId },
			skip: (page - 1) * pageSize,
			take: pageSize,
			orderBy: { createdAt: "desc" },
			select: notificationSelect,
		}),
		prisma.notification.count({ where: { userId: callerId } }),
	]);

	return {
		items: items.map((n) => toSummary(n)),
		...buildMeta(page, pageSize, total),
	};
}

export async function markAllNotificationsRead(callerId: string) {
	return prisma.notification.updateMany({
		where: { userId: callerId, isRead: false },
		data: { isRead: true },
	});
}

export async function markNotificationRead(callerId: string, notificationId: string) {
	return prisma.notification.update({
		where: { id: notificationId, userId: callerId },
		data: { isRead: true },
	});
}
