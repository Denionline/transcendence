import { Router, Request } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { parsePagination } from "../../lib/pagination.js";
import {
	GIG_SORTS,
	parseCategories,
	parseGigStatus,
	parseLocation,
	parseQ,
	parseRateRange,
	parseSort,
} from "./search.params.js";
import { searchGigs } from "./search.service.js";

const router = Router();

router.get("/gigs", requireAuth, async (req: Request, res) => {
	const { page, pageSize } = parsePagination(req.query);
	const { minRate, maxRate } = parseRateRange(req.query.minRate, req.query.maxRate);

	const result = await searchGigs({
		page,
		pageSize,
		q: parseQ(req.query.q),
		categories: parseCategories(req.query.category),
		location: parseLocation(req.query.location),
		minRate,
		maxRate,
		status: parseGigStatus(req.query.status),
		sort: parseSort(req.query.sort, GIG_SORTS),
	});
	res.status(200).json(result);
});

export default router;
