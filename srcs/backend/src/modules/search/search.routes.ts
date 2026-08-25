import { Router, Request } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { rateLimit } from "../../middlewares/rate.limit.middleware.js";
import { parsePagination } from "../../lib/pagination.js";
import {
	GIG_SORTS,
	parseArtistSort,
	parseAvailability,
	parseCategories,
	parseGigStatus,
	parseHirerSort,
	parseLocation,
	parseQ,
	parseRateRange,
	parseSort,
} from "./search.params.js";
import { searchGigs } from "./search.gigs.service.js";
import { searchArtists } from "./search.artists.service.js";
import { searchHirers } from "./search.hirers.service.js";

const router = Router();

//	Text filters compile to ILIKE '%...%', which no index serves. Keyed by user,
//	not IP, and mounted after requireAuth so req.user is always set.
const searchLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 120,
	message: "too many search requests, try again in a moment",
	keyOf: (req) => req.user!.id,
});

router.get("/gigs", requireAuth, searchLimiter, async (req: Request, res) => {
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

router.get("/artists", requireAuth, searchLimiter, async (req: Request, res) => {
	const { page, pageSize } = parsePagination(req.query);
	const caller = req.user!;

	const result = await searchArtists({
		callerId: caller.id,
		page,
		pageSize,
		q: parseQ(req.query.q),
		categories: parseCategories(req.query.category),
		location: parseLocation(req.query.location),
		availability: parseAvailability(req.query.availability),
		sort: parseArtistSort(req.query.sort),
	});
	res.status(200).json(result);
});

router.get("/hirers", requireAuth, searchLimiter, async (req: Request, res) => {
	const { page, pageSize } = parsePagination(req.query);
	const caller = req.user!;

	const result = await searchHirers({
		callerId: caller.id,
		page,
		pageSize,
		q: parseQ(req.query.q),
		categories: parseCategories(req.query.category),
		location: parseLocation(req.query.location),
		availability: parseAvailability(req.query.availability),
		sort: parseHirerSort(req.query.sort),
	});
	res.status(200).json(result);
});

export default router;
