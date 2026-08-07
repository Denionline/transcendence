import { Router, Request } from "express";
import { throwError } from "../../lib/http-error.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { GigStatus, UserRole } from "../../../generated/prisma/client.js";
import { parsePagination } from "../../lib/pagination.js";
import { createGig, deleteGig, getGigById, listGigs, updateGig } from "./gigs.service.js";

const router = Router();

export function parseId(value: unknown): string {
	if (typeof value !== "string") {
		throwError(400, "VALIDATION_ERROR", "invalid id parameter");
	}
	return value;
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

router.get("/", requireAuth, async (req: Request, res) => {
	const { page, pageSize } = parsePagination(req.query);
	const status = parseStatus(req.query.status);
	const category = typeof req.query.category === "string" ? req.query.category : undefined;

	let hirerId: string | undefined;
	let wantsMine = false;
	if (typeof req.query.mine === "string") {
		wantsMine = true;
	}
	if (wantsMine === true) {
		hirerId = req.user!.id;
	}

	const result = await listGigs({ page, pageSize, status, category, hirerId });
	res.status(200).json(result);
});

router.get("/:id", requireAuth, async (req: Request, res) => {
	const gigId = parseId(req.params.id);
	const gig = await getGigById(gigId);
	res.status(200).json(gig);
});

router.put("/:id", requireAuth, async (req: Request, res) => {
	const gigId = parseId(req.params.id);
	const caller = req.user!;

	const gig = await getGigById(gigId);

	let callerIsAdmin = false;
	if (caller.role === UserRole.admin) {
		callerIsAdmin = true;
	}
	let callerOwnsGig = false;
	if (gig.hirerId === caller.id) {
		callerOwnsGig = true;
	}
	if (callerIsAdmin === false && callerOwnsGig === false) {
		throwError(403, "FORBIDDEN", "you cannot update this gig");
	}

	const body = req.body ?? {};
	const updated = await updateGig(gigId, {
		title: body.title,
		description: body.description,
		category: body.category,
		location: body.location,
		rate: body.rate,
		status: body.status,
	});
	res.status(200).json(updated);
});

router.delete("/:id", requireAuth, async (req: Request, res) => {
	const gigId = parseId(req.params.id);
	const caller = req.user!;

	const gig = await getGigById(gigId);

	let callerIsAdmin = false;
	if (caller.role === UserRole.admin) {
		callerIsAdmin = true;
	}
	let callerOwnsGig = false;
	if (gig.hirerId === caller.id) {
		callerOwnsGig = true;
	}
	if (callerIsAdmin === false && callerOwnsGig === false) {
		throwError(403, "FORBIDDEN", "you cannot delete this gig");
	}

	await deleteGig(gigId);
	res.status(204).send();
});

export default router;
