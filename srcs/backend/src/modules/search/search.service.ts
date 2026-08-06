import { GigStatus, Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { buildMeta } from "../../lib/pagination.js";
import { GigSort } from "./search.params.js";

const searchGigSelect = {
	id: true,
	hirerId: true,
	title: true,
	description: true,
	category: true,
	location: true,
	rate: true,
	status: true,
	createdAt: true,
	hirer: { select: { username: true, avatarUrl: true } },
} satisfies Prisma.GigSelect;

export interface SearchGigsOptions {
	page: number;
	pageSize: number;
	q?: string;
	categories?: string[];
	location?: string;
	minRate?: number;
	maxRate?: number;
	status?: GigStatus;
	sort: GigSort;
}

function buildGigWhere(options: SearchGigsOptions): Prisma.GigWhereInput {
	const where: Prisma.GigWhereInput = {};

	if (options.status !== undefined) where.status = options.status;
	if (options.categories !== undefined) where.category = { in: options.categories };
	if (options.location !== undefined) {
		where.location = { contains: options.location, mode: "insensitive" };
	}

	let hasRateBound = false;
	if (options.minRate !== undefined) hasRateBound = true;
	if (options.maxRate !== undefined) hasRateBound = true;
	if (hasRateBound === true) {
		where.rate = { gte: options.minRate, lte: options.maxRate };
	}

	if (options.q !== undefined) {
		where.OR = [
			{ title: { contains: options.q, mode: "insensitive" } },
			{ description: { contains: options.q, mode: "insensitive" } },
		];
	}

	return where;
}

export async function searchGigs(options: SearchGigsOptions) {
	const { page, pageSize } = options;
	const where = buildGigWhere(options);

	const [items, total] = await prisma.$transaction([
		prisma.gig.findMany({
			where,
			skip: (page - 1) * pageSize,
			take: pageSize,
			orderBy: { createdAt: "desc" },
			select: searchGigSelect,
		}),
		prisma.gig.count({ where }),
	]);

	return { items, ...buildMeta(page, pageSize, total) };
}
