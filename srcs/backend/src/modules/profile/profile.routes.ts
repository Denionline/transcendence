import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
	upsertArtistProfile,
	upsertHirerProfile,
	getCallerProfile,
	deleteProfile,
} from "./profile.service.js";
import { UserRole } from "../../../generated/prisma/enums.js";
import { throwError } from "../../lib/http-error.js";
import { id } from "../../lib/schemas.js";
import { updateProfileBody } from "./profile.schema.js";

const router = Router();

router.patch("/me", requireAuth, async (req, res) => {
	const caller = req.user!;
	const body = updateProfileBody.parse(req.body ?? {});

	if (caller.role !== UserRole.artist && caller.role !== UserRole.hirer)
		throwError(403, "FORBIDDEN", "this role does not have an artist/hirer profile");

	const profile =
		caller.role === UserRole.artist
			? await upsertArtistProfile(caller.id, {
					categories: body.categories,
					bio: body.bio,
					location: body.location,
					availability: body.availability,
				})
			: await upsertHirerProfile(caller.id, {
					categories: body.categories,
					bio: body.bio,
					organizationName: body.organizationName,
					location: body.location,
					availability: body.availability,
				});
	res.status(200).json(profile);
});

router.get("/:id", requireAuth, async (req, res) => {
	const caller = req.user!;
	const targetId = id.parse(req.params.id);

	const result = await getCallerProfile(targetId, caller.id);
	res.status(200).json(result);
});

router.delete("/:id", requireAuth, async (req, res) => {
	const targetId = id.parse(req.params.id);
	const caller = req.user!;

	if (caller.id === targetId || caller.role === UserRole.admin) {
		await deleteProfile(targetId);
		res.status(204).send();
	} else throwError(403, "FORBIDDEN", "you cannot delete this profile");
});

export default router;
