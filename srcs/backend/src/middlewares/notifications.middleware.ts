import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import { throwError } from "../lib/http-error.js";
import { UserRole } from "../../generated/prisma/enums.js";

export async function requireNotificationMatch(req: Request, _res: Response, next: NextFunction) {
	const notificationId = req.params.id;
	const caller = req.user!;

	if (typeof notificationId !== "string") {
		throwError(400, "INVALID_NO_ID", "matchId must be a single value");
	}
	if (caller.role === UserRole.admin)
		throwError(403, "FORBIDDEN", "admins do not have notifications");

	const result = await prisma.notification.findUnique({
		where: {
			id: notificationId,
			userId: caller.id,
		},
	});
	if (!result) throwError(404, "NOTIFICATION_NOT_FOUND", "notification not found");
	next();
}
