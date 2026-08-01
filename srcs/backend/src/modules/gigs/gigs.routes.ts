import { Router, Request } from "express";
import { throwError } from "../../lib/http-error.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { getGigById } from "./gigs.service.js";

const router = Router();

function parseId(value: string | string[] | undefined): string {
	if (typeof value !== "string") {
		throwError(400, "VALIDATION_ERROR", "invalid id parameter");
	}
	return value;
}

// Reading a gig needs no ownership check — gigs are browsable by any logged-in
// user. Just prove who you are.
router.get("/:id", requireAuth, async (req: Request, res) => {
	const gigId = parseId(req.params.id);
	const gig = await getGigById(gigId);
	res.status(200).json(gig);
});

export default router;
