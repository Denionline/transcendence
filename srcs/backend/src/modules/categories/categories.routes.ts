import { Router, Request } from "express";
import { throwError } from "../../lib/http-error.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { UserRole } from "../../../generated/prisma/client.js";
import {
	createCategory,
	deleteCategory,
	listCategories,
	updateCategory,
} from "./categories.service.js";

const router = Router();

function parseId(value: unknown): string {
	if (typeof value !== "string") {
		throwError(400, "VALIDATION_ERROR", "invalid id parameter");
	}
	return value;
}

//	Deliberately unauthenticated: this is the vocabulary the sign-up and
//	profile forms need before a session exists, and it contains nothing
//	user-specific. It replaces the hardcoded list the frontend used to keep
//	in sync by hand.
router.get("/", async (_req, res) => {
	const categories = await listCategories();
	res.status(200).json({ items: categories });
});

//	Writes are admin-only. The vocabulary is shared by every profile and gig,
//	so a category any user could add would reintroduce exactly the drift the
//	lookup table exists to prevent.
router.post("/", requireAuth, async (req: Request, res) => {
	const caller = req.user!;

	let callerIsAdmin = false;
	if (caller.role === UserRole.admin) {
		callerIsAdmin = true;
	}
	if (callerIsAdmin === false) {
		throwError(403, "FORBIDDEN", "only an admin can create categories");
	}

	const body = req.body ?? {};
	const category = await createCategory({ label: body.label, slug: body.slug });
	res.status(201).json(category);
});

router.patch("/:id", requireAuth, async (req: Request, res) => {
	const categoryId = parseId(req.params.id);
	const caller = req.user!;

	let callerIsAdmin = false;
	if (caller.role === UserRole.admin) {
		callerIsAdmin = true;
	}
	if (callerIsAdmin === false) {
		throwError(403, "FORBIDDEN", "only an admin can update categories");
	}

	const body = req.body ?? {};
	const category = await updateCategory(categoryId, { label: body.label, slug: body.slug });
	res.status(200).json(category);
});

router.delete("/:id", requireAuth, async (req: Request, res) => {
	const categoryId = parseId(req.params.id);
	const caller = req.user!;

	let callerIsAdmin = false;
	if (caller.role === UserRole.admin) {
		callerIsAdmin = true;
	}
	if (callerIsAdmin === false) {
		throwError(403, "FORBIDDEN", "only an admin can delete categories");
	}

	await deleteCategory(categoryId);
	res.status(204).send();
});

export default router;
