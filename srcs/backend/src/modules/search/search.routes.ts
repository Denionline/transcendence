import { Router, Request } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { rateLimit } from "../../middlewares/rate-limit.middleware.js";
import { throwError } from "../../lib/http-error.js";
import { parsePagination } from "../../lib/pagination.js";
import {
	GIG_SORTS,
	parseArtistSort,
	parseAvailability,
	parseCategories,
	parseGigStatus,
	parseLocation,
	parseQ,
	parseRateRange,
	parseSort,
} from "./search.params.js";
import { searchGigs } from "./search.gigs.service.js";
import { searchArtists } from "./search.artists.service.js";
import { searchProfiles } from "./search.profiles.service.js";

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

//	Backs the navbar's name-only search box, which searches both artist and
//	hirer accounts at once rather than one profile kind at a time like
//	/gigs and /artists above.
router.get("/profiles", requireAuth, searchLimiter, async (req: Request, res) => {
	const q = parseQ(req.query.q);
	if (q === undefined) throwError(400, "VALIDATION_ERROR", "q is required");
	const caller = req.user!;

	const result = await searchProfiles({ callerId: caller.id, q });
	res.status(200).json(result);
});

export default router;
