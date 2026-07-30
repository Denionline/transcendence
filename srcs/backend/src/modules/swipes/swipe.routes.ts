import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { throwError } from "../../lib/http-error.js";
import { handleSwipe } from "./swipe.service.js";

const router = Router();

router.post("/", requireAuth, async (req, res) => {
	const swiper = req.user!;
	const { gigId, liked, targetUserId } = req.body;

	if (typeof gigId !== "string") throwError(400, "VALIDATION_ERROR", "gigId must be a string");
	if (typeof liked !== "boolean") throwError(400, "VALIDATION_ERROR", "liked must be a boolean");
	if (targetUserId !== undefined && typeof targetUserId !== "string")
		throwError(400, "VALIDATION_ERROR", "targetUserId must be a string");

	const result = await handleSwipe(swiper, gigId, liked, targetUserId);
	res.status(201).json({ result });
});

// router.get("/next", requireAuth, async (req, res) => {});

export default router;
