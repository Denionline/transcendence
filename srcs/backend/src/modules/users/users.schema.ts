import { z } from "zod";
import { UserRole } from "../../../generated/prisma/enums.js";
import {
	LIMITS,
	avatarUrl,
	email,
	enumOf,
	id,
	optionalText,
	password,
	username,
} from "../../lib/schemas.js";

export const userIdParams = z.object({ id });

export const listUsersQuery = z.object({
	role: enumOf(UserRole, "role").optional(),
	search: optionalText("search", LIMITS.shortText).optional(),
});

export const updateUserBody = z.object({
	email: email.optional(),
	username: username.optional(),
	avatarUrl: avatarUrl.nullable().optional(),
	password: password.optional(),
	role: enumOf(UserRole, "role").optional(),
});

export type UpdateUserBody = z.infer<typeof updateUserBody>;
