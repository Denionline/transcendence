import { Router, Request } from "express";
import { throwError } from "../../lib/http-error.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { UserRole } from "../../../generated/prisma/client.js";
import { createGig, getGigById } from "./gigs.service.js";

const router = Router();

function parseId(value: string | string[] | undefined): string {
	if (typeof value !== "string") {
		throwError(400, "VALIDATION_ERROR", "invalid id parameter");
	}
	return value;
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
