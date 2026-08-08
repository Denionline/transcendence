import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { throwError } from "../../lib/http-error.js";
import { handleSwipe, handleNext, handleSwipeHistory } from "./swipe.service.js";
import { parseId } from "../gigs/gigs.routes.js";
import { UserRole } from "../../../generated/prisma/enums.js";

const router = Router();

// Comma-separated ids the caller already has in hand (e.g. cards already
// pulled into an on-screen deck) so /next can skip straight past them instead
// of handing back the same not-yet-swiped candidate every call.
function parseExcludeIds(value: unknown): string[] {
	if (typeof value !== "string" || value.trim() === "") return [];
	return value
		.split(",")
		.map((id) => id.trim())
		.filter((id) => id.length > 0);
}

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
	const excludeIds = parseExcludeIds(req.query.excludeIds);

	const result = await handleNext(user, gigId, excludeIds);
	res.status(200).json(result);
});

function parseLiked(value: unknown): boolean | undefined {
	if (value === "true") return true;
	if (value === "false") return false;
	return undefined;
}

router.get("/", requireAuth, async (req, res) => {
	const user = req.user!;

	const liked = parseLiked(req.query.liked);
	const gigId = typeof req.query.gigId === "string" ? req.query.gigId : undefined;
	const result = await handleSwipeHistory(user, liked, gigId);
	res.status(200).json(result);
});

export default router;
