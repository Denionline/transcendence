import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { handleSwipe } from "./swipe.service.js";

const router = Router();

router.post("/", requireAuth, async (req, res) => {
	const swiper = req.user!;
	const { gigId, liked, targetUserId } = req.body;

	const result = await handleSwipe(swiper, gigId, liked, targetUserId);
	res.status(201).json({ result });
});

// router.get("/next", requireAuth, async (req, res) => {});

export default router;
