import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { parseId } from "../gigs/gigs.routes.js";
import { throwError } from "../../lib/http-error.js";
import { NotificationType, UserRole } from "../../../generated/prisma/enums.js";
import { sendInvite, updateStatus, deleteFriend, getFriendsList } from "./friends.service.js";
import { authEvents } from "../../lib/auth-events.js";
import { prisma } from "../../lib/prisma.js";
import { parsePagination } from "../../lib/pagination.js";
import { createNotification } from "../notifications/notifications.service.js";

const router = Router();

async function validateTargetId(targetId: string) {
	const user = await prisma.user.findUnique({
		where: { id: targetId },
	});
	if (!user) throwError(404, "USER_NOT_FOUND", "user not found");
}

router.get("/", requireAuth, async (req, res) => {
	const caller = req.user!;
	const { page, pageSize } = parsePagination(req.query);

	const items = await getFriendsList(caller.id, page, pageSize);
	res.status(200).json(items);
});

router.post("/:id", requireAuth, async (req, res) => {
	const caller = req.user!;
	const friendId = parseId(req.params.id);

	if (caller.role === UserRole.admin) throwError(403, "FORBIDDEN", "admins do not have friends");
	if (caller.id === friendId) throwError(400, "VALIDATION_ERROR", "you cannot friend yourself");
	await validateTargetId(friendId);

	const invite = await sendInvite(caller.id, friendId);
	await createNotification({
		userId: friendId,
		actorId: caller.id,
		type: NotificationType.new_invite,
		data: {},
	});
	authEvents.emit("new_notification", { targetId: friendId });
	res.status(201).json(invite);
});

router.patch("/:id", requireAuth, async (req, res) => {
	const caller = req.user!;
	const requestedId = parseId(req.params.id);
	const accepted = req.body.accepted;

	if (caller.role === UserRole.admin) throwError(403, "FORBIDDEN", "admins do not have friends");
	if (typeof accepted !== "boolean")
		throwError(400, "VALIDATION_ERROR", "accepted must be a boolean");
	const updated = await updateStatus(caller.id, requestedId, accepted);
	if (accepted) {
		await createNotification({
			userId: requestedId,
			actorId: caller.id,
			type: NotificationType.invite_accepted,
			data: {},
		});
		authEvents.emit("new_notification", { targetId: requestedId });
	}
	res.status(200).json(updated);
});

router.delete("/:id", requireAuth, async (req, res) => {
	const caller = req.user!;
	const friendId = parseId(req.params.id);

	if (caller.role === UserRole.admin) throwError(403, "FORBIDDEN", "admins do not have friends");
	await deleteFriend(caller.id, friendId);
	res.status(204).send();
});

export default router;
