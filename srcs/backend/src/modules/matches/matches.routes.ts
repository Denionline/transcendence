import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { getMatchesForUser } from "./matches.service.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
	const caller = req.user!;
	const matches = await getMatchesForUser(caller.id, caller.role);
	res.status(200).json({ items: matches });
});

export default router;
