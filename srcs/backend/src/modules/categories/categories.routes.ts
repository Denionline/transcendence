import { Router } from "express";
import { listCategories } from "./categories.service.js";

const router = Router();

//	Deliberately unauthenticated: this is the vocabulary the sign-up and
//	profile forms need before a session exists, and it contains nothing
//	user-specific. It replaces the hardcoded list the frontend used to keep
//	in sync by hand.
router.get("/", async (_req, res) => {
	const categories = await listCategories();
	res.status(200).json({ items: categories });
});

export default router;
