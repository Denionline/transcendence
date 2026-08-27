import { Router, Request } from "express";
import { throwError } from "../../lib/http-error.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { UserRole } from "../../../generated/prisma/client.js";
import { parsePagination } from "../../lib/pagination.js";
import { createGig, deleteGig, getGigById, listGigs, updateGig } from "./gigs.service.js";
import { createGigBody, gigIdParams, listGigsQuery, updateGigBody } from "./gigs.schema.js";

const router = Router();

router.post("/", requireAuth, async (req: Request, res) => {
	const caller = req.user!;

	let callerIsHirer = false;
	if (caller.role === UserRole.hirer) {
		callerIsHirer = true;
	}
	if (callerIsHirer === false) {
		throwError(403, "FORBIDDEN", "only hirers can create gigs");
	}

	const gig = await createGig(caller.id, createGigBody.parse(req.body ?? {}));
	res.status(201).json(gig);
});

router.get("/", requireAuth, async (req: Request, res) => {
	const { page, pageSize } = parsePagination(req.query);
	const { status, category, mine } = listGigsQuery.parse(req.query);

	let hirerId: string | undefined;
	if (mine !== undefined) {
		hirerId = req.user!.id;
	}

	const result = await listGigs({ page, pageSize, status, category, hirerId });
	res.status(200).json(result);
});

// Reading a gig needs no ownership check — gigs are browsable by any logged-in
// user. Just prove who you are.
router.get("/:id", requireAuth, async (req: Request, res) => {
	const { id: gigId } = gigIdParams.parse(req.params);
	const gig = await getGigById(gigId);
	res.status(200).json(gig);
});

router.put("/:id", requireAuth, async (req: Request, res) => {
	const { id: gigId } = gigIdParams.parse(req.params);
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

	const updated = await updateGig(gigId, updateGigBody.parse(req.body ?? {}));
	res.status(200).json(updated);
});

router.delete("/:id", requireAuth, async (req: Request, res) => {
	const { id: gigId } = gigIdParams.parse(req.params);
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
