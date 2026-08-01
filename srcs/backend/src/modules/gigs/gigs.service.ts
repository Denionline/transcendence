import { throwError } from "../../lib/http-error.js";
import { GigStatus, Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";

const publicGigSelect = {
	id: true,
	hirerId: true,
	title: true,
	description: true,
	category: true,
	location: true,
	rate: true,
	status: true,
	createdAt: true,
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
	if (category) where.category = category;
	if (hirerId) where.hirerId = hirerId;

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

	if (typeof input.category !== "string")
		throwError(400, "VALIDATION_ERROR", "category is required and must be a string");
	const category = input.category.trim();
	if (category.length === 0) throwError(400, "VALIDATION_ERROR", "category cannot be empty");

	const data: Prisma.GigUncheckedCreateInput = { hirerId, title, category };

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
