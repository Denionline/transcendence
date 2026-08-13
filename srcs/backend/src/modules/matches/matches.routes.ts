import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { parseId } from "../gigs/gigs.routes.js";
import { getMatchById, deleteMatch } from "./matches.service.js";
import { getMatchesForUser } from "./matches.service.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
	const caller = req.user!;
	const matches = await getMatchesForUser(caller.id, caller.role);
	res.status(200).json({ items: matches });
});

router.get("/:id", requireAuth, async (req, res) => {
	const user = req.user!;
	const matchId = parseId(req.params.id);

	const match = await getMatchById(user, matchId);
	res.status(200).json(match);
});

router.delete("/:id", requireAuth, async (req, res) => {
	const user = req.user!;
	const matchId = parseId(req.params.id);

	await deleteMatch(user, matchId);
	res.status(204).send();
});

export default router;
