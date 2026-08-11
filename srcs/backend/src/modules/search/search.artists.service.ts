import { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { buildMeta } from "../../lib/pagination.js";
import { ArtistSort } from "./search.params.js";
import { fetchBucketPage } from "./search.relevance.js";
import { publicCategorySelect, toSlug } from "../categories/categories.service.js";
import { flattenCategories } from "../profile/profile.service.js";

const searchArtistSelect = {
	id: true,
	userId: true,
	bio: true,
	location: true,
	availability: true,
	createdAt: true,
	categories: { select: { category: { select: publicCategorySelect } } },
	user: { select: { username: true, avatarUrl: true } },
} satisfies Prisma.ArtistProfileSelect;

const NEWEST_ORDER: Prisma.ArtistProfileOrderByWithRelationInput[] = [
	{ createdAt: "desc" },
	{ id: "asc" },
];

export interface SearchArtistsOptions {
	callerId: string;
	page: number;
	pageSize: number;
	q?: string;
	categories?: string[];
	location?: string;
	availability?: boolean;
	sort: ArtistSort;
}

function buildArtistFilters(options: SearchArtistsOptions): Prisma.ArtistProfileWhereInput {
	//	Searching artists must never surface the caller themselves.
	const where: Prisma.ArtistProfileWhereInput = { NOT: { userId: options.callerId } };

	if (options.categories !== undefined) {
		where.categories = { some: { category: { slug: { in: options.categories.map(toSlug) } } } };
	}
	if (options.location !== undefined) {
		where.location = { contains: options.location, mode: "insensitive" };
	}
	if (options.availability !== undefined) where.availability = options.availability;

	return where;
}

function usernameMatches(q: string): Prisma.ArtistProfileWhereInput {
	return { user: { username: { contains: q, mode: "insensitive" } } };
}

function bioMatches(q: string): Prisma.ArtistProfileWhereInput {
	return { bio: { contains: q, mode: "insensitive" } };
}

function withTextSearch(
	filters: Prisma.ArtistProfileWhereInput,
	q?: string,
): Prisma.ArtistProfileWhereInput {
	if (q === undefined) return filters;
	return { AND: [filters, { OR: [usernameMatches(q), bioMatches(q)] }] };
}

function buildArtistOrderBy(sort: ArtistSort): Prisma.ArtistProfileOrderByWithRelationInput[] {
	if (sort === "oldest") return [{ createdAt: "asc" }, { id: "asc" }];
	return NEWEST_ORDER;
}

function artistBucket(where: Prisma.ArtistProfileWhereInput) {
	return (skip: number, take: number) =>
		prisma.artistProfile.findMany({
			where,
			skip,
			take,
			orderBy: NEWEST_ORDER,
			select: searchArtistSelect,
		});
}

async function searchArtistsByRelevance(
	filters: Prisma.ArtistProfileWhereInput,
	q: string,
	page: number,
	pageSize: number,
) {
	//	AND composition, never a spread: filters already carries its own NOT.
	const whereA: Prisma.ArtistProfileWhereInput = { AND: [filters, usernameMatches(q)] };
	const whereB: Prisma.ArtistProfileWhereInput = {
		AND: [filters, { NOT: usernameMatches(q) }, bioMatches(q)],
	};

	const [countA, countB] = await prisma.$transaction([
		prisma.artistProfile.count({ where: whereA }),
		prisma.artistProfile.count({ where: whereB }),
	]);

	const items = await fetchBucketPage(
		page,
		pageSize,
		countA,
		artistBucket(whereA),
		artistBucket(whereB),
	);

	return { items: items.map(flattenCategories), ...buildMeta(page, pageSize, countA + countB) };
}

export async function searchArtists(options: SearchArtistsOptions) {
	const { page, pageSize } = options;
	const filters = buildArtistFilters(options);

	if (options.sort === "relevance" && options.q !== undefined) {
		return searchArtistsByRelevance(filters, options.q, page, pageSize);
	}

	const where = withTextSearch(filters, options.q);
	const [items, total] = await prisma.$transaction([
		prisma.artistProfile.findMany({
			where,
			skip: (page - 1) * pageSize,
			take: pageSize,
			orderBy: buildArtistOrderBy(options.sort),
			select: searchArtistSelect,
		}),
		prisma.artistProfile.count({ where }),
	]);

	return { items: items.map(flattenCategories), ...buildMeta(page, pageSize, total) };
}
