import "./setup.js";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";

import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { toSlug } from "../src/modules/categories/categories.service.js";
import { categoryIdFor, cleanupCategories } from "./helpers/categories.js";

async function withServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
	const server = app.listen(0);
	const { port } = server.address() as AddressInfo;
	try {
		return await run(`http://localhost:${port}`);
	} finally {
		server.close();
	}
}

interface Category {
	id: string;
	slug: string;
	label: string;
}

async function getCategories(baseUrl: string) {
	const res = await fetch(`${baseUrl}/api/categories`);
	const body = (await res.json()) as { items: Category[] };
	return { status: res.status, items: body.items };
}

after(async () => {
	await cleanupCategories();
	await prisma.$disconnect();
});

test("GET /api/categories needs no token — the sign-up form reads it before a session exists", async () => {
	await withServer(async (baseUrl) => {
		const { status, items } = await getCategories(baseUrl);

		assert.equal(status, 200);
		assert.ok(Array.isArray(items));
		assert.ok(items.length > 0);
	});
});

test("GET /api/categories returns the vocabulary seeded by the migration", async () => {
	await withServer(async (baseUrl) => {
		const { items } = await getCategories(baseUrl);
		const slugs = items.map((category) => category.slug);

		//	A sample of the 25 the frontend used to hardcode in constants.ts.
		assert.ok(slugs.includes("muralist"));
		assert.ok(slugs.includes("3d-animator"));
		assert.ok(slugs.includes("tattoo-artist"));
	});
});

test("GET /api/categories exposes id, slug and label — and nothing else", async () => {
	await withServer(async (baseUrl) => {
		const { items } = await getCategories(baseUrl);

		assert.deepEqual(Object.keys(items[0]).sort(), ["id", "label", "slug"]);
	});
});

test("GET /api/categories returns labels sorted alphabetically", async () => {
	await withServer(async (baseUrl) => {
		const { items } = await getCategories(baseUrl);
		const labels = items.map((category) => category.label);

		assert.deepEqual(labels, [...labels].sort());
	});
});

test("every slug is unique and is the normalized form of its label", async () => {
	await withServer(async (baseUrl) => {
		const { items } = await getCategories(baseUrl);
		const slugs = items.map((category) => category.slug);

		assert.equal(new Set(slugs).size, slugs.length);
		for (const category of items) {
			assert.equal(category.slug, toSlug(category.slug));
		}
	});
});

test("a newly created category appears in the listing", async () => {
	const label = "categories-test Probe";
	await categoryIdFor(label);

	await withServer(async (baseUrl) => {
		const { items } = await getCategories(baseUrl);
		const found = items.find((category) => category.slug === "categories-test-probe");

		assert.ok(found);
		assert.equal(found?.label, label);
	});
});

test("a category in use cannot be deleted — onDelete: Restrict holds the line", async () => {
	const categoryId = await categoryIdFor("categories-test Restrict");
	const user = await prisma.user.create({
		data: {
			email: `categories-test-${categoryId}@test.local`,
			username: "categories-test",
			role: "hirer",
		},
	});
	const gig = await prisma.gig.create({
		data: { hirerId: user.id, title: "categories-test gig", categoryId },
	});

	await assert.rejects(() => prisma.category.delete({ where: { id: categoryId } }));

	await prisma.gig.delete({ where: { id: gig.id } });
	await prisma.user.delete({ where: { id: user.id } });
});
