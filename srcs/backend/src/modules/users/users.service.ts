import bcrypt from "bcrypt";
import { throwError } from "../../lib/http-error.js";
import { Prisma, UserRole } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { deleteLocations, locationsOwnedBy } from "../files/files.service.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export interface UpdateUserInput {
	email?: unknown;
	username?: unknown;
	avatarUrl?: unknown;
	password?: unknown;
	role?: unknown;
}

//	References:
//		Prisma update:        https://www.prisma.io/docs/orm/prisma-client/queries/crud#update-a-record
//		Prisma error codes:   https://www.prisma.io/docs/orm/reference/error-reference
//		bcrypt hashing usage: https://github.com/kelektiv/node.bcrypt.js#usage
export async function updateUser(targetId: string, input: UpdateUserInput) {
	const data: Prisma.UserUpdateInput = {};

	if (input.email !== undefined) {
		if (typeof input.email !== "string")
			throwError(400, "VALIDATION_ERROR", "email must be a string");
		const email = input.email.trim().toLowerCase();
		if (!EMAIL_REGEX.test(email)) throwError(400, "VALIDATION_ERROR", "invalid email format");
		data.email = email;
	}

	if (input.username !== undefined) {
		if (typeof input.username !== "string")
			throwError(400, "VALIDATION_ERROR", "username must be a string");
		const username = input.username.trim();
		if (username.length === 0) throwError(400, "VALIDATION_ERROR", "username cannot be empty");
		data.username = username;
	}

	if (input.avatarUrl !== undefined) {
		if (typeof input.avatarUrl !== "string")
			throwError(400, "VALIDATION_ERROR", "avatarUrl must be a string");
		data.avatarUrl = input.avatarUrl;
	}

	if (input.password !== undefined) {
		if (typeof input.password !== "string")
			throwError(400, "VALIDATION_ERROR", "password must be a string");
		if (input.password.length < 8 || input.password.length > 72)
			throwError(400, "VALIDATION_ERROR", "password must be between 8 and 72 characters");
		data.passwordHash = await bcrypt.hash(input.password, 10);
	}

	if (input.role !== undefined) {
		if (!(Object.values(UserRole) as string[]).includes(input.role as string))
			throwError(400, "VALIDATION_ERROR", "invalid role");
		data.role = input.role as UserRole;
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
	//	`onDelete: Cascade` removes this user's File rows but leaves their bytes
	//	on disk forever, so read the locations while the rows still exist. Same
	//	order as deleting one file: rows first, bytes after — a failed unlink
	//	leaves an invisible orphan rather than a row pointing at nothing.
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
