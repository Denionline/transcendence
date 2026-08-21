import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import { throwError } from "../lib/http-error.js";
import { UserRole } from "../../generated/prisma/enums.js";

export async function requireMatchParticipant(req: Request, _res: Response, next: NextFunction) {
	const matchId = req.params.matchId;
	const caller = req.user!;

	if (typeof matchId !== "string") {
		throwError(400, "INVALID_MATCH_ID", "matchId must be a single value");
	}
	if (caller.role === UserRole.admin) throwError(403, "FORBIDDEN", "admins do not have matches");

	const result =
		caller.role === UserRole.artist
			? await prisma.match.findUnique({
					where: {
						id: matchId,
						artistId: caller.id,
					},
				})
			: await prisma.match.findUnique({
					where: {
						id: matchId,
						gig: {
							hirerId: caller.id,
						},
					},
				});
	if (!result) throwError(404, "MATCH_NOT_FOUND", "match not found");
	next();
}

export async function requireMessageOwnerOrAdmin(req: Request, _res: Response, next: NextFunction) {
	const messageId = req.params.messageId;
	const caller = req.user!;

	if (typeof messageId !== "string")
		throwError(400, "INVALID_MESSAGE_ID", "messageId must be a single value");

	const result = await prisma.chatMessage.findUnique({
		where: {
			id: messageId,
			senderId: caller.id,
		},
	});
	if (caller.role !== UserRole.admin && !result)
		throwError(403, "FORBIDDEN", "only the sender or a admin can delete this message");
	next();
}
