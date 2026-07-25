import { Router, Request } from "express";
import { HttpError } from "../../lib/http-error.js";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { UserRole } from "../../../generated/prisma/client.js";
import { getUserById, listUsers } from "./users.service.js";

const router = Router();

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function parsePagination(query: Request["query"]): { page: number; pageSize: number } {
	const rawPage = query.page;
	let page: number;
	if (typeof rawPage !== "string") {
		page = DEFAULT_PAGE;
	} else {
		const parsed = parseInt(rawPage, 10);

		if (Number.isNaN(parsed)) {
			page = DEFAULT_PAGE;
		} else if (parsed < 1) {
			page = DEFAULT_PAGE;
		} else {
			page = parsed;
		}
	}

	const rawPageSize = query.pageSize;
	let pageSize: number;
	if (typeof rawPageSize !== "string") {
		pageSize = DEFAULT_PAGE_SIZE;
	} else {
		const parsed = parseInt(rawPageSize, 10);

		if (Number.isNaN(parsed)) {
			pageSize = DEFAULT_PAGE_SIZE;
		} else if (parsed < 1) {
			pageSize = DEFAULT_PAGE_SIZE;
		} else if (parsed > MAX_PAGE_SIZE) {
			pageSize = MAX_PAGE_SIZE;
		} else {
			pageSize = parsed;
		}
	}

	return { page, pageSize };
}

function parseRole(value: unknown): UserRole | undefined {
	return typeof value === "string" && (Object.values(UserRole) as string[]).includes(value)
		? (value as UserRole)
		: undefined;
}

router.get("/me", requireAuth, async (req, res) => {
	try {
		const user = await getUserById(req.user!.id);
		res.status(200).json(user);
	} catch (error) {
		if (error instanceof HttpError) res.status(error.status).json({ error: error.message });
		else res.status(500).json({ error: "Internal server error" });
	}
});

router.get("/", requireAuth, requireRole(UserRole.admin), async (req, res) => {
	const { page, pageSize } = parsePagination(req.query);
	const role = parseRole(req.query.role);
	const search = typeof req.query.search === "string" ? req.query.search : undefined;

	const result = await listUsers({ page, pageSize, role, search });
	res.status(200).json(result);
});

export default router;
