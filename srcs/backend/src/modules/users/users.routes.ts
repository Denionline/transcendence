import { Router } from "express";
import { HttpError } from "../../lib/http-error.js";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { UserRole } from "../../../generated/prisma/client.js";
import { getUserById, listUsers } from "./users.service.js";

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
	try {
		const user = await getUserById(req.user!.id);
		res.status(200).json(user);
	} catch (error) {
		if (error instanceof HttpError) res.status(error.status).json({ error: error.message });
		else res.status(500).json({ error: "Internal server error" });
	}
});

router.get("/", requireAuth, requireRole(UserRole.admin), async (_req, res) => {
	try {
		const users = await listUsers();
		res.status(200).json(users);
	} catch {
		res.status(500).json({ error: "Internal server error" });
	}
});

export default router;
