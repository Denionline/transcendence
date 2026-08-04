import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { throwError } from "../../lib/http-error.js";
import { handleSwipe, handleNext } from "./swipe.service.js";
import { parseId } from "../gigs/gigs.routes.js";
import { UserRole } from "../../../generated/prisma/enums.js";

const router = Router();

router.post("/", requireAuth, async (req, res) => {
	const swiper = req.user!;
	const { gigId, liked, targetUserId } = req.body;

	if (typeof gigId !== "string") throwError(400, "VALIDATION_ERROR", "gigId must be a string");
	if (typeof liked !== "boolean") throwError(400, "VALIDATION_ERROR", "liked must be a boolean");
	if (targetUserId !== undefined && typeof targetUserId !== "string")
		throwError(400, "VALIDATION_ERROR", "targetUserId must be a string");

	const result = await handleSwipe(swiper, gigId, liked, targetUserId);
	res.status(201).json(result);
});

router.get("/next", requireAuth, async (req, res) => {
	const user = req.user!;
	const gigId = user.role === UserRole.hirer ? parseId(req.query.gigId) : undefined;

	const result = await handleNext(user, gigId);
	res.status(200).json(result);
});

export default router;
