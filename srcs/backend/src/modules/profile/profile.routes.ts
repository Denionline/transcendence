import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { upsertArtistProfile, upsertHirerProfile, getCallerProfile } from "./profile.service.js";
import { UserRole } from "../../../generated/prisma/enums.js";
import { throwError } from "../../lib/http-error.js";

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

export default router;
