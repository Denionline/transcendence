import { throwError } from "../../lib/http-error.js";
import { GigStatus, Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import {
	publicCategorySelect,
	resolveCategoryId,
	toSlug,
} from "../categories/categories.service.js";

export const publicGigSelect = {
	id: true,
	hirerId: true,
	title: true,
	description: true,
	categoryId: true,
	category: { select: publicCategorySelect },
	location: true,
	rate: true,
	status: true,
	createdAt: true,
	hirer: { select: { username: true, avatarUrl: true } },
} satisfies Prisma.GigSelect;

export async function getGigById(id: string) {
	const gig = await prisma.gig.findUnique({
		where: { id },
		select: publicGigSelect,
	});
	if (!gig) throwError(404, "GIG_NOT_FOUND", "gig not found");
	return gig;
}

export interface ListGigsOptions {
	page: number;
	pageSize: number;
	status?: GigStatus;
	category?: string;
	hirerId?: string;
}

export async function listGigs({ page, pageSize, status, category, hirerId }: ListGigsOptions) {
	const where: Prisma.GigWhereInput = {};
	if (status) where.status = status;
	if (hirerId) where.hirerId = hirerId;

	//	A filter naming a category that does not exist should return nothing,
	//	not fail the request — unlike a write, where an unknown category is an
	//	error the caller has to fix.
	if (category) where.category = { slug: toSlug(category) };

	const [items, total] = await prisma.$transaction([
		prisma.gig.findMany({
			where,
			skip: (page - 1) * pageSize,
			take: pageSize,
			orderBy: { createdAt: "desc" },
			select: publicGigSelect,
		}),
		prisma.gig.count({ where }),
	]);

	return { items, page, pageSize, total };
}

export interface CreateGigInput {
	title?: unknown;
	description?: unknown;
	category?: unknown;
	location?: unknown;
	rate?: unknown;
	status?: unknown;
}

export async function createGig(hirerId: string, input: CreateGigInput) {
	if (typeof input.title !== "string")
		throwError(400, "VALIDATION_ERROR", "title is required and must be a string");
	const title = input.title.trim();
	if (title.length === 0) throwError(400, "VALIDATION_ERROR", "title cannot be empty");

	if (input.category === undefined)
		throwError(400, "VALIDATION_ERROR", "category is required and must be a string");
	const categoryId = await resolveCategoryId(input.category);

	const data: Prisma.GigUncheckedCreateInput = { hirerId, title, categoryId };

	if (input.description !== undefined) {
		if (typeof input.description !== "string")
			throwError(400, "VALIDATION_ERROR", "description must be a string");
		data.description = input.description;
	}

	if (input.location !== undefined) {
		if (typeof input.location !== "string")
			throwError(400, "VALIDATION_ERROR", "location must be a string");
		data.location = input.location;
	}

	if (input.rate !== undefined) {
		if (typeof input.rate !== "number" || !Number.isInteger(input.rate) || input.rate < 0)
			throwError(400, "VALIDATION_ERROR", "rate must be a non-negative integer");
		data.rate = input.rate;
	}

	if (input.status !== undefined) {
		if (!(Object.values(GigStatus) as string[]).includes(input.status as string))
			throwError(400, "VALIDATION_ERROR", "invalid status");
		data.status = input.status as GigStatus;
	}

	return prisma.gig.create({ data, select: publicGigSelect });
}

export interface UpdateGigInput {
	title?: unknown;
	description?: unknown;
	category?: unknown;
	location?: unknown;
	rate?: unknown;
	status?: unknown;
}

export async function updateGig(id: string, input: UpdateGigInput) {
	const data: Prisma.GigUpdateInput = {};

	if (input.title !== undefined) {
		if (typeof input.title !== "string")
			throwError(400, "VALIDATION_ERROR", "title must be a string");
		const title = input.title.trim();
		if (title.length === 0) throwError(400, "VALIDATION_ERROR", "title cannot be empty");
		data.title = title;
	}

	if (input.category !== undefined) {
		data.category = { connect: { id: await resolveCategoryId(input.category) } };
	}

	if (input.description !== undefined) {
		if (typeof input.description !== "string")
			throwError(400, "VALIDATION_ERROR", "description must be a string");
		data.description = input.description;
	}

	if (input.location !== undefined) {
		if (typeof input.location !== "string")
			throwError(400, "VALIDATION_ERROR", "location must be a string");
		data.location = input.location;
	}

	if (input.rate !== undefined) {
		if (typeof input.rate !== "number" || !Number.isInteger(input.rate) || input.rate < 0)
			throwError(400, "VALIDATION_ERROR", "rate must be a non-negative integer");
		data.rate = input.rate;
	}

	if (input.status !== undefined) {
		if (!(Object.values(GigStatus) as string[]).includes(input.status as string))
			throwError(400, "VALIDATION_ERROR", "invalid status");
		data.status = input.status as GigStatus;
	}

	if (Object.keys(data).length === 0)
		throwError(400, "VALIDATION_ERROR", "no valid fields to update");

	try {
		return await prisma.gig.update({ where: { id }, data, select: publicGigSelect });
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025")
			throwError(404, "GIG_NOT_FOUND", "gig not found");
		throw error;
	}
}

export async function deleteGig(id: string) {
	try {
		await prisma.gig.delete({ where: { id } });
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025")
			throwError(404, "GIG_NOT_FOUND", "gig not found");
		throw error;
	}
}
