import { throwError } from "../../lib/http-error.js";
import { Prisma, UserRole } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";

const publicUserSelect = {
	id: true,
	email: true,
	username: true,
	role: true,
	createdAt: true,
} satisfies Prisma.UserSelect;

export async function getUserById(id: string) {
	const user = await prisma.user.findUnique({ where: { id } });
	if (!user) throwError(404, "USER_NOT_FOUND", "user not found");
	return {
		id: user.id,
		email: user.email,
		username: user.username,
		role: user.role,
	};
}

export interface ListUsersOptions {
	page: number;
	pageSize: number;
	role?: UserRole;
	search?: string;
}

export async function listUsers({ page, pageSize, role, search }: ListUsersOptions) {
	const where: Prisma.UserWhereInput = {};
	if (role) where.role = role;
	if (search) {
		where.OR = [
			{ email: { contains: search, mode: "insensitive" } },
			{ username: { contains: search, mode: "insensitive" } },
		];
	}

	const [items, total] = await prisma.$transaction([
		prisma.user.findMany({
			where,
			skip: (page - 1) * pageSize,
			take: pageSize,
			orderBy: { createdAt: "desc" },
			select: publicUserSelect,
		}),
		prisma.user.count({ where }),
	]);

	return { items, page, pageSize, total };
}
