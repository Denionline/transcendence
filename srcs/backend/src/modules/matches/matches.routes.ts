import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { parsePagination } from "../../lib/pagination.js";
import { id } from "../../lib/schemas.js";
import { listMatches, getMatchById, deleteMatch } from "./matches.service.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
	const user = req.user!;
	const { page, pageSize } = parsePagination(req.query);
	const gigId = typeof req.query.gigId === "string" ? req.query.gigId : undefined;

	const result = await listMatches(user, { page, pageSize, gigId });
	res.status(200).json(result);
});

router.get("/:id", requireAuth, async (req, res) => {
	const user = req.user!;
	const matchId = id.parse(req.params.id);

	const match = await getMatchById(user, matchId);
	res.status(200).json(match);
});

router.delete("/:id", requireAuth, async (req, res) => {
	const user = req.user!;
	const matchId = id.parse(req.params.id);

	await deleteMatch(user, matchId);
	res.status(204).send();
});

export default router;
