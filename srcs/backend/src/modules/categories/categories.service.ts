import { prisma } from "../../lib/prisma.js";
import { throwError } from "../../lib/http-error.js";
import { Prisma } from "../../../generated/prisma/client.js";

//	A profile may hold several categories, but not the whole vocabulary — an
//	artist listing everything would surface in every feed.
export const MAX_PROFILE_CATEGORIES = 10;

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
