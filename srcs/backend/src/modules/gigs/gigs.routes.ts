import { Router, Request } from "express";
import { throwError } from "../../lib/http-error.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { GigStatus, UserRole } from "../../../generated/prisma/client.js";
import { createGig, getGigById, listGigs } from "./gigs.service.js";

const router = Router();

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function parseId(value: string | string[] | undefined): string {
	if (typeof value !== "string") {
		throwError(400, "VALIDATION_ERROR", "invalid id parameter");
	}
	return value;
}

function parsePagination(query: Request["query"]): { page: number; pageSize: number } {
	const rawPage = query.page;
	let page: number;
	if (typeof rawPage !== "string") {
		page = DEFAULT_PAGE;
	} else {
		const parsed = parseInt(rawPage, 10);
		if (Number.isNaN(parsed)) {
			page = DEFAULT_PAGE;
		} else if (parsed < 1) {
			page = DEFAULT_PAGE;
		} else {
			page = parsed;
		}
	}

	const rawPageSize = query.pageSize;
	let pageSize: number;
	if (typeof rawPageSize !== "string") {
		pageSize = DEFAULT_PAGE_SIZE;
	} else {
		const parsed = parseInt(rawPageSize, 10);
		if (Number.isNaN(parsed)) {
			pageSize = DEFAULT_PAGE_SIZE;
		} else if (parsed < 1) {
			pageSize = DEFAULT_PAGE_SIZE;
		} else if (parsed > MAX_PAGE_SIZE) {
			pageSize = MAX_PAGE_SIZE;
		} else {
			pageSize = parsed;
		}
	}

	return { page, pageSize };
}

function parseStatus(value: unknown): GigStatus | undefined {
	return typeof value === "string" && (Object.values(GigStatus) as string[]).includes(value)
		? (value as GigStatus)
		: undefined;
}

router.post("/", requireAuth, async (req: Request, res) => {
	const caller = req.user!;

	let callerIsHirer = false;
	if (caller.role === UserRole.hirer) {
		callerIsHirer = true;
	}
	if (callerIsHirer === false) {
		throwError(403, "FORBIDDEN", "only hirers can create gigs");
	}

	const body = req.body ?? {};
	const gig = await createGig(caller.id, {
		title: body.title,
		description: body.description,
		category: body.category,
		location: body.location,
		rate: body.rate,
		status: body.status,
	});
	res.status(201).json(gig);
});

router.get("/:id", requireAuth, async (req: Request, res) => {
	const gigId = parseId(req.params.id);
	const gig = await getGigById(gigId);
	res.status(200).json(gig);
});

export default router;
