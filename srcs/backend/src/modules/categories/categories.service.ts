import { prisma } from "../../lib/prisma.js";
import { throwError } from "../../lib/http-error.js";
import { Prisma } from "../../../generated/prisma/client.js";

//	A profile may hold several categories, but not the whole vocabulary — an
//	artist listing everything would surface in every feed.
export const MAX_PROFILE_CATEGORIES = 10;

//	Labels are display strings in a <select>, not prose.
export const MAX_CATEGORY_LABEL = 60;

export const publicCategorySelect = {
	id: true,
	slug: true,
	label: true,
} satisfies Prisma.CategorySelect;

const WHITESPACE = /\s+/g;

//	Callers may send either the label ("Street artist") or the slug
//	("street-artist"); both key the same row, which is what makes matching
//	insensitive to the case and spacing a user happened to type.
export function toSlug(value: string): string {
	return value.trim().toLowerCase().replace(WHITESPACE, "-");
}

export async function listCategories() {
	return await prisma.category.findMany({
		orderBy: { label: "asc" },
		select: publicCategorySelect,
	});
}

function parseSlug(value: unknown, field: string): string {
	if (typeof value !== "string") {
		throwError(400, "VALIDATION_ERROR", `${field} must be a string`);
	}
	const slug = toSlug(value);
	if (slug.length === 0) throwError(400, "VALIDATION_ERROR", `${field} cannot be empty`);
	return slug;
}

export async function resolveCategoryId(value: unknown, field = "category"): Promise<string> {
	const slug = parseSlug(value, field);
	const category = await prisma.category.findUnique({
		where: { slug },
		select: { id: true },
	});
	if (!category) throwError(400, "CATEGORY_NOT_FOUND", `unknown ${field}: ${slug}`);
	return category.id;
}

function parseSlugList(value: unknown, field: string): string[] {
	if (Array.isArray(value) === false) {
		throwError(400, "VALIDATION_ERROR", `${field} must be an array of strings`);
	}

	const slugs: string[] = [];
	for (const entry of value as unknown[]) {
		const slug = parseSlug(entry, field);
		if (slugs.includes(slug) === false) slugs.push(slug);
	}

	if (slugs.length === 0) throwError(400, "VALIDATION_ERROR", `${field} cannot be empty`);
	if (slugs.length > MAX_PROFILE_CATEGORIES) {
		throwError(400, "VALIDATION_ERROR", `no more than ${MAX_PROFILE_CATEGORIES} categories`);
	}
	return slugs;
}

export async function resolveCategoryIds(value: unknown, field = "categories"): Promise<string[]> {
	const slugs = parseSlugList(value, field);
	const found = await prisma.category.findMany({
		where: { slug: { in: slugs } },
		select: { id: true, slug: true },
	});

	if (found.length !== slugs.length) {
		const known = found.map((category) => category.slug);
		const unknown = slugs.filter((slug) => known.includes(slug) === false);
		throwError(400, "CATEGORY_NOT_FOUND", `unknown categories: ${unknown.join(", ")}`);
	}
	return found.map((category) => category.id);
}

export interface CategoryInput {
	label?: unknown;
	slug?: unknown;
}

function parseLabel(value: unknown): string {
	if (typeof value !== "string") {
		throwError(400, "VALIDATION_ERROR", "label must be a string");
	}
	const label = value.trim();
	if (label.length === 0) throwError(400, "VALIDATION_ERROR", "label cannot be empty");
	if (label.length > MAX_CATEGORY_LABEL) {
		throwError(400, "VALIDATION_ERROR", `label cannot exceed ${MAX_CATEGORY_LABEL} characters`);
	}
	return label;
}

export async function createCategory(input: CategoryInput) {
	const label = parseLabel(input.label);
	//	The slug defaults to the normalized label, which is what keeps the two
	//	in step for the common case. An explicit slug is allowed so a long
	//	display name can still key off a short one.
	const slug = input.slug === undefined ? toSlug(label) : parseSlug(input.slug, "slug");

	try {
		return await prisma.category.create({ data: { slug, label }, select: publicCategorySelect });
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			throwError(409, "CATEGORY_EXISTS", `a category with slug "${slug}" already exists`);
		}
		throw error;
	}
}

export async function updateCategory(id: string, input: CategoryInput) {
	const data: Prisma.CategoryUpdateInput = {};

	//	Changing the label deliberately leaves the slug alone. The slug is the
	//	stable key that every profile and gig write resolves against, so a
	//	display-only rename must not invalidate callers; re-slugging is a
	//	separate, explicit act. Existing matches survive either way — they hold
	//	the category id, not its text.
	if (input.label !== undefined) data.label = parseLabel(input.label);
	if (input.slug !== undefined) data.slug = parseSlug(input.slug, "slug");

	let hasChanges = false;
	if (Object.keys(data).length > 0) hasChanges = true;
	if (hasChanges === false) throwError(400, "VALIDATION_ERROR", "nothing to update");

	try {
		return await prisma.category.update({ where: { id }, data, select: publicCategorySelect });
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === "P2002") throwError(409, "CATEGORY_EXISTS", "slug already in use");
			if (error.code === "P2025") throwError(404, "CATEGORY_NOT_FOUND", "category not found");
		}
		throw error;
	}
}

//	The vocabulary is referenced by artist profiles, hirer profiles and gigs
//	with `onDelete: Restrict`, so a plain delete of an in-use row throws at the
//	database. Check first and answer with a clear 409 instead of a 500 — a
//	category can only be removed once nothing points at it.
export async function deleteCategory(id: string) {
	const [artistUses, hirerUses, gigUses] = await prisma.$transaction([
		prisma.artistCategory.count({ where: { categoryId: id } }),
		prisma.hirerCategory.count({ where: { categoryId: id } }),
		prisma.gig.count({ where: { categoryId: id } }),
	]);
	const inUse = artistUses + hirerUses + gigUses;
	if (inUse > 0) {
		throwError(
			409,
			"CATEGORY_IN_USE",
			`category is used by ${inUse} profile(s) or gig(s) and cannot be deleted`,
		);
	}

	try {
		await prisma.category.delete({ where: { id } });
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
			throwError(404, "CATEGORY_NOT_FOUND", "category not found");
		}
		throw error;
	}
}

//	Search accepts a filter over categories that may legitimately name rows
//	that do not exist; an unknown filter value should narrow the result set,
//	not fail the request. Unknown slugs are therefore dropped here.
export async function findCategoryIdsBySlug(slugs: string[]): Promise<string[]> {
	const found = await prisma.category.findMany({
		where: { slug: { in: slugs.map(toSlug) } },
		select: { id: true },
	});
	return found.map((category) => category.id);
}
