import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { searchProfiles } from "./search.service.js";

const router = Router();

router.get("/profiles", requireAuth, async (req, res) => {
	const q = typeof req.query.q === "string" ? req.query.q : "";
	const results = await searchProfiles(q);
	res.status(200).json(results);
});

export default router;
