import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
	handleSwipe,
	handleNext,
	handleSwipeHistory,
	getPendingInterests,
} from "./swipe.service.js";
import { id } from "../../lib/schemas.js";
import { UserRole } from "../../../generated/prisma/enums.js";
import { parsePagination } from "../../lib/pagination.js";
import { SwipeHistoryOptions } from "./swipe.service.js";
import { createSwipeBody, nextQuery, swipeHistoryQuery } from "./swipe.schema.js";

const router = Router();

function parseExcludeIds(value: unknown): string[] {
	if (typeof value !== "string" || value.trim() === "") return [];
	return value
		.split(",")
		.map((id) => id.trim())
		.filter((id) => id.length > 0);
}

function parseCategorySlugs(value: unknown): string[] {
	if (typeof value !== "string" || value.trim() === "") return [];
	return value
		.split(",")
		.map((slug) => slug.trim())
		.filter((slug) => slug.length > 0);
}

router.post("/", requireAuth, async (req, res) => {
	const swiper = req.user!;
	const { gigId, liked, targetUserId } = createSwipeBody.parse(req.body ?? {});

	const result = await handleSwipe(swiper, gigId, liked, targetUserId);
	res.status(201).json(result);
});

router.get("/next", requireAuth, async (req, res) => {
	const user = req.user!;
	const query = nextQuery.parse(req.query);
	const gigId = user.role === UserRole.hirer ? id.parse(query.gigId) : undefined;
	const excludeIds = parseExcludeIds(query.excludeIds);
	const categorySlugs = parseCategorySlugs(query.categories);

	const result = await handleNext(user, gigId, excludeIds, categorySlugs);
	res.status(200).json(result);
});

router.get("/interests", requireAuth, async (req, res) => {
	const user = req.user!;
	const items = await getPendingInterests(user);
	res.status(200).json({ items });
});

router.get("/", requireAuth, async (req, res) => {
	const user = req.user!;
	const { page, pageSize } = parsePagination(req.query);
	const { liked, gigId } = swipeHistoryQuery.parse(req.query);

	const data: SwipeHistoryOptions = {
		page,
		pageSize,
		liked: liked === undefined ? undefined : liked === "true",
		gigId,
	};

	const result = await handleSwipeHistory(user, data);
	res.status(200).json(result);
});

export default router;
