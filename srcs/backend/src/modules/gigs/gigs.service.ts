import { throwError } from "../../lib/http-error.js";
import type { CreateGigBody, UpdateGigBody } from "./gigs.schema.js";
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

export async function createGig(hirerId: string, input: CreateGigBody) {
	const categoryId = await resolveCategoryId(input.category);

	const data: Prisma.GigUncheckedCreateInput = {
		hirerId,
		title: input.title,
		categoryId,
	};
	if (input.description !== undefined) data.description = input.description;
	if (input.location !== undefined) data.location = input.location;
	if (input.rate !== undefined) data.rate = input.rate;
	if (input.status !== undefined) data.status = input.status;

	return prisma.gig.create({ data, select: publicGigSelect });
}

export async function updateGig(id: string, input: UpdateGigBody) {
	const data: Prisma.GigUpdateInput = {};

	if (input.title !== undefined) data.title = input.title;
	if (input.description !== undefined) data.description = input.description;
	if (input.location !== undefined) data.location = input.location;
	if (input.rate !== undefined) data.rate = input.rate;
	if (input.status !== undefined) data.status = input.status;
	if (input.category !== undefined) {
		data.category = { connect: { id: await resolveCategoryId(input.category) } };
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
