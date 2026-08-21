import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
	requireMatchParticipant,
	requireMessageOwnerOrAdmin,
} from "../../middlewares/messages.middleware.js";
import { buildMeta, parsePagination } from "../../lib/pagination.js";
import { getMatchMessages, markMessagesAsRead, deleteMessage } from "./messages.service.js";
import { authEvents } from "../../lib/auth-events.js";
import { parseMessageContent } from "./messages.service.js";
import { throwError } from "../../lib/http-error.js";
import { createMessage } from "./messages.service.js";

const router = Router({ mergeParams: true });

router.get("/", requireAuth, requireMatchParticipant, async (req, res) => {
	const { page, pageSize } = parsePagination(req.query);
	const matchId = req.params.matchId as string;
	const caller = req.user!;
	const { items, total } = await getMatchMessages({ callerId: caller.id, matchId, page, pageSize });
	res.status(200).json({ items, ...buildMeta(page, pageSize, total) });
});

router.post("/", requireAuth, requireMatchParticipant, async (req, res) => {
	const caller = req.user!;
	const matchId = req.params.matchId;
	const content = req.body.content;

	if (!parseMessageContent(content)) {
		throwError(400, "INVALID_CONTENT", "content must be 1-2000 characters");
	}
	const result = await createMessage({
		matchId: matchId as string,
		senderId: caller.id,
		content,
	});
	if (result.state === false) throwError(500, "MESSAGE_FAILED", "failed to save message");
	res
		.status(201)
		.json({ chatMessageId: result.message!.id, content, matchId, senderId: caller.id });
	authEvents.emit("send_message", {
		senderId: caller.id,
		content,
		matchId,
		chatMessageId: result.message!.id,
	});
});

router.patch("/read", requireAuth, requireMatchParticipant, async (req, res) => {
	const matchId = req.params.matchId as string;
	const caller = req.user!;

	await markMessagesAsRead(caller.id, matchId);
	res.status(204).send();
});

router.delete("/:messageId", requireAuth, requireMessageOwnerOrAdmin, async (req, res) => {
	const messageId = req.params.messageId;

	await deleteMessage(messageId as string);
	res.status(204).send();
});

export default router;
