import { throwError } from "../../lib/http-error.js";
import { assertPasswordPolicy, hashPassword } from "../../lib/password.js";
import type { UpdateUserBody } from "./users.schema.js";
import { Prisma, UserRole } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { deleteLocations, locationsOwnedBy } from "../files/files.service.js";

const publicUserSelect = {
	id: true,
	email: true,
	username: true,
	role: true,
	avatarUrl: true,
	createdAt: true,
} satisfies Prisma.UserSelect;

export async function getUserById(id: string) {
	const user = await prisma.user.findUnique({ where: { id }, select: publicUserSelect });
	if (!user) throwError(404, "USER_NOT_FOUND", "user not found");
	return user;
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

export async function updateUser(targetId: string, input: UpdateUserBody) {
	const data: Prisma.UserUpdateInput = {};

	if (input.email !== undefined) data.email = input.email;
	if (input.username !== undefined) data.username = input.username;
	if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl;
	if (input.role !== undefined) data.role = input.role;

	if (input.password !== undefined) {
		const owner = await prisma.user.findUnique({
			where: { id: targetId },
			select: { email: true, username: true },
		});
		if (!owner) throwError(404, "USER_NOT_FOUND", "user not found");

		assertPasswordPolicy(input.password, {
			email: input.email ?? owner.email,
			username: input.username ?? owner.username,
		});
		data.passwordHash = await hashPassword(input.password);
	}

	if (Object.keys(data).length === 0)
		throwError(400, "VALIDATION_ERROR", "no valid fields to update");

	try {
		return await prisma.user.update({
			where: { id: targetId },
			data,
			select: publicUserSelect,
		});
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === "P2002") throwError(409, "EMAIL_EXISTS", "email already registered");
			if (error.code === "P2025") throwError(404, "USER_NOT_FOUND", "user not found");
		}
		throw error;
	}
}

export async function deleteUser(targetId: string) {
	const locations = await locationsOwnedBy(targetId);

	try {
		await prisma.user.delete({ where: { id: targetId } });
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025")
			throwError(404, "USER_NOT_FOUND", "user not found");
		throw error;
	}

	await deleteLocations(locations);
}
