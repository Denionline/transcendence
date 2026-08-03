import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { upsertArtistProfile } from "./profile.service.js";
import { upsertHirerProfile } from "./profile.service.js";
import { UserRole } from "../../../generated/prisma/enums.js";

const router = Router();

router.patch("/me", requireAuth, async (req, res) => {
	const caller = req.user!;
	const body = req.body ?? {};

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

export default router;
