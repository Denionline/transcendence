import { GigStatus, Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { buildMeta } from "../../lib/pagination.js";
import { GigSort } from "./search.params.js";
import { fetchBucketPage } from "./search.relevance.js";

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

const RELEVANCE_ORDER: Prisma.GigOrderByWithRelationInput[] = [
	{ createdAt: "desc" },
	{ id: "asc" },
];

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

function buildGigFilters(options: SearchGigsOptions): Prisma.GigWhereInput {
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

	return where;
}

function titleMatches(q: string): Prisma.GigWhereInput {
	return { title: { contains: q, mode: "insensitive" } };
}

function descriptionMatches(q: string): Prisma.GigWhereInput {
	return { description: { contains: q, mode: "insensitive" } };
}

function withTextSearch(filters: Prisma.GigWhereInput, q?: string): Prisma.GigWhereInput {
	if (q === undefined) return filters;
	return { AND: [filters, { OR: [titleMatches(q), descriptionMatches(q)] }] };
}

function buildGigOrderBy(sort: GigSort): Prisma.GigOrderByWithRelationInput[] {
	if (sort === "oldest") return [{ createdAt: "asc" }, { id: "asc" }];
	if (sort === "rate_desc") {
		return [{ rate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }, { id: "asc" }];
	}
	if (sort === "rate_asc") {
		return [{ rate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }, { id: "asc" }];
	}
	if (sort === "popular") {
		return [{ swipes: { _count: "desc" } }, { createdAt: "desc" }, { id: "asc" }];
	}
	return [{ createdAt: "desc" }, { id: "asc" }];
}

function gigBucket(where: Prisma.GigWhereInput) {
	return (skip: number, take: number) =>
		prisma.gig.findMany({
			where,
			skip,
			take,
			orderBy: RELEVANCE_ORDER,
			select: searchGigSelect,
		});
}

async function searchGigsByRelevance(
	filters: Prisma.GigWhereInput,
	q: string,
	page: number,
	pageSize: number,
) {
	const whereA: Prisma.GigWhereInput = { AND: [filters, titleMatches(q)] };
	const whereB: Prisma.GigWhereInput = {
		AND: [filters, { NOT: titleMatches(q) }, descriptionMatches(q)],
	};

	const [countA, countB] = await prisma.$transaction([
		prisma.gig.count({ where: whereA }),
		prisma.gig.count({ where: whereB }),
	]);

	const items = await fetchBucketPage(page, pageSize, countA, gigBucket(whereA), gigBucket(whereB));

	return { items, ...buildMeta(page, pageSize, countA + countB) };
}

export async function searchGigs(options: SearchGigsOptions) {
	const { page, pageSize } = options;
	const filters = buildGigFilters(options);

	if (options.sort === "relevance" && options.q !== undefined) {
		return searchGigsByRelevance(filters, options.q, page, pageSize);
	}

	const where = withTextSearch(filters, options.q);
	const [items, total] = await prisma.$transaction([
		prisma.gig.findMany({
			where,
			skip: (page - 1) * pageSize,
			take: pageSize,
			orderBy: buildGigOrderBy(options.sort),
			select: searchGigSelect,
		}),
		prisma.gig.count({ where }),
	]);

	return { items, ...buildMeta(page, pageSize, total) };
}
