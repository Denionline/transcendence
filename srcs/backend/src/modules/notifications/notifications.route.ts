import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { parsePagination } from "../../lib/pagination.js";
import { getAllNotifications } from "./notifications.service.js";
import { markAllNotificationsRead } from "./notifications.service.js";
import { requireNotificationMatch } from "../../middlewares/notifications.middleware.js";
import { markNotificationRead } from "./notifications.service.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
	const caller = req.user!;
	const { page, pageSize } = parsePagination(req.query);

	const result = await getAllNotifications(caller.id, page, pageSize);
	res.status(200).json(result);
});

router.patch("/read-all", requireAuth, async (req, res) => {
	const caller = req.user!;
	await markAllNotificationsRead(caller.id);
	res.status(204).send();
});

router.patch("/:id/read", requireAuth, requireNotificationMatch, async (req, res) => {
	const caller = req.user!;
	await markNotificationRead(caller.id, req.params.id as string);
	res.status(204).send();
});

export default router;
