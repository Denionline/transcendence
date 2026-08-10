import { prisma } from "../../src/lib/prisma.js";
import { toSlug } from "../../src/modules/categories/categories.service.js";

//	The one seam in the test suite that knows how categories are stored.
//	Tests name categories as plain strings and assert on behaviour (status
//	codes, match ids, which gig came back) — never on the storage shape — so
//	moving categories to a lookup table only rewrote this file.

const createdCategoryIds: string[] = [];

//	Categories are a controlled vocabulary now, so a test that wants an
//	arbitrary one has to create it first. Idempotent: suites share names.
export async function categoryIdFor(name: string): Promise<string> {
	const slug = toSlug(name);
	const category = await prisma.category.upsert({
		where: { slug },
		update: {},
		create: { slug, label: name.trim() },
		select: { id: true },
	});
	if (createdCategoryIds.includes(category.id) === false) {
		createdCategoryIds.push(category.id);
	}
	return category.id;
}

//	Categories created through the API rather than through this helper still
//	have to be cleaned up, so let a suite hand their ids back to the seam.
export function trackCategory(id: string): string {
	if (createdCategoryIds.includes(id) === false) createdCategoryIds.push(id);
	return id;
}

export async function categoryIdsFor(names: string[]): Promise<string[]> {
	const ids: string[] = [];
	for (const name of names) {
		ids.push(await categoryIdFor(name));
	}
	return ids;
}

export async function artistCategories(names: string[]) {
	const ids = await categoryIdsFor(names);
	return { categories: { create: ids.map((categoryId) => ({ categoryId })) } };
}

export async function gigCategory(name: string) {
	return { categoryId: await categoryIdFor(name) };
}

//	`onDelete: Restrict` on the category side means a category still referenced
//	by a profile or gig cannot be dropped — so this must run after the rows
//	that point at it are gone. Categories the suite did not create (the 25
//	seeded by the migration) are left alone.
export async function cleanupCategories() {
	await prisma.category.deleteMany({
		where: {
			id: { in: createdCategoryIds },
			gigs: { none: {} },
			artists: { none: {} },
			hirers: { none: {} },
		},
	});
}

//	Reading side of the same seam: pull the category names out of a profile or
//	gig payload without the caller caring how they are nested.
export function categoryNamesOf(body: Record<string, unknown> | null): string[] {
	if (!body) return [];
	if (Array.isArray(body.categories)) {
		return (body.categories as { label: string }[]).map((category) => category.label);
	}
	const category = body.category as { label?: string } | undefined;
	if (category?.label) return [category.label];
	return [];
}
