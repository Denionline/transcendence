import { Router, Request } from "express";
import { HttpError, throwError } from "../../lib/http-error.js";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { UserRole } from "../../../generated/prisma/client.js";
import { getUserById, listUsers, updateUser } from "./users.service.js";

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

router.get("/:id", requireAuth, async (req, res) => {
	const requestedUserId = req.params.id;
	const caller = req.user!;

	let isViewingOwnRecord = false;
	if (caller.id === requestedUserId) {
		isViewingOwnRecord = true;
	}
	let isAdmin = false;
	if (caller.role === UserRole.admin) {
		isAdmin = true;
	}
	let isAllowed = false;
	if (isViewingOwnRecord === true) {
		isAllowed = true;
	}
	if (isAdmin === true) {
		isAllowed = true;
	}
	if (isAllowed === false) {
		throwError(403, "FORBIDDEN", "you are not allowed to view this user");
	}
	
	const user = await getUserById(requestedUserId);
	res.status(200).json(user);
});

// PUT /api/users/:id — update a user. The service (updateUser) validates and
// writes the fields; THIS handler decides who is allowed to do it.
router.put("/:id", requireAuth, async (req, res) => {
	const targetUserId = req.params.id;
	const caller = req.user!; // { id, role } — set by requireAuth
	const body = req.body ?? {};

	// TODO(human): enforce the update authorization rules, THEN call updateUser.
	//   1. A non-admin may only update THEIR OWN record.
	//        → if caller is not admin AND caller.id !== targetUserId:
	//            throwError(403, "FORBIDDEN", "you cannot update this user");
	//   2. Only an admin may change `role`.
	//        → if body.role is present AND caller is not admin:
	//            throwError(403, "FORBIDDEN", "only an admin can change roles");
	//   3. An admin must not demote THEMSELVES out of admin (avoids locking
	//      everyone out).
	//        → if caller is admin AND caller.id === targetUserId
	//            AND body.role is present AND body.role !== UserRole.admin:
	//            throwError(409, "SELF_DEMOTE", "an admin cannot demote themselves");
	//
	// Reference — an equivalent "self vs admin" guard, fully written, is the
	// GET /:id handler just above (isViewingOwnRecord / isAdmin / isAllowed).
	// Mirror that style here.

	const updated = await updateUser(targetUserId, {
		email: body.email,
		username: body.username,
		avatarUrl: body.avatarUrl,
		password: body.password,
		role: body.role,
	});
	res.status(200).json(updated);
});

export default router;
