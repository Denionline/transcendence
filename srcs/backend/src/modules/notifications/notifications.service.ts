import { prisma } from "../../lib/prisma.js";
import { NotificationType } from "../../../generated/prisma/enums.js";
import { Prisma } from "../../../generated/prisma/client.js";

interface CreateNotificationData {
	userId: string;
	type: NotificationType;
	data: Prisma.InputJsonValue;
}

export async function createNotification(
	data: CreateNotificationData,
	client: Prisma.TransactionClient = prisma,
) {
	return client.notification.create({
		data: {
			userId: data.userId,
			type: data.type,
			data: data.data,
		},
	});
}
