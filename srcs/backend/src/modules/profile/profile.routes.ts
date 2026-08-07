import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
	upsertArtistProfile,
	upsertHirerProfile,
	getCallerProfile,
	getPublicProfileByUserId,
} from "./profile.service.js";
import { UserRole } from "../../../generated/prisma/enums.js";
import { throwError } from "../../lib/http-error.js";
import { parseId } from "../gigs/gigs.routes.js";

const router = Router();

router.patch("/me", requireAuth, async (req, res) => {
	const caller = req.user!;
	const body = req.body ?? {};

	if (caller.role !== UserRole.artist && caller.role !== UserRole.hirer)
		throwError(403, "FORBIDDEN", "this role does not have an artist/hirer profile");

	const profile =
		caller.role === UserRole.artist
			? await upsertArtistProfile(caller.id, {
					category: body.category,
					bio: body.bio,
					location: body.location,
					availability: body.availability,
				})
			: await upsertHirerProfile(caller.id, {
					category: body.category,
					bio: body.bio,
					organizationName: body.organizationName,
					location: body.location,
					availability: body.availability,
				});
	res.status(200).json(profile);
});

router.get("/me", requireAuth, async (req, res) => {
	const caller = req.user!;

	if (caller.role !== UserRole.artist && caller.role !== UserRole.hirer)
		throwError(403, "FORBIDDEN", "this role does not have an artist/hirer profile");
	const result = await getCallerProfile(caller.id, caller.role);
	res.status(200).json(result);
});

// Registered after the literal "/me" routes above so a request for "/me"
// still matches those, not this param route. Reading someone else's public
// profile needs no ownership check — just proof of who's asking.
router.get("/:userId", requireAuth, async (req, res) => {
	const userId = parseId(req.params.userId);
	const result = await getPublicProfileByUserId(userId);
	res.status(200).json(result);
});

export default router;
