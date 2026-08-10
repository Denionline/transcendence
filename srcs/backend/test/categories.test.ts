import "./setup.js";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";

import app from "../src/app.js";
import { SECRET } from "../src/lib/env.js";
import { prisma } from "../src/lib/prisma.js";
import { UserRole } from "../generated/prisma/client.js";
import { MAX_CATEGORY_LABEL, toSlug } from "../src/modules/categories/categories.service.js";
import { categoryIdFor, cleanupCategories, trackCategory } from "./helpers/categories.js";

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

function tokenFor(user: { id: string; role: UserRole }): string {
	return jwt.sign({ userId: user.id, role: user.role }, SECRET, {
		algorithm: "HS256",
		expiresIn: "15m",
	});
}

async function api(
	baseUrl: string,
	method: string,
	path: string,
	options: { token?: string; body?: unknown } = {},
) {
	const headers: Record<string, string> = { "Content-Type": "application/json" };
	if (options.token) headers.Authorization = `Bearer ${options.token}`;

	const res = await fetch(`${baseUrl}${path}`, {
		method,
		headers,
		body: options.body === undefined ? undefined : JSON.stringify(options.body),
	});

	const text = await res.text();
	const json = text ? (JSON.parse(text) as Record<string, unknown>) : null;
	return { status: res.status, body: json };
}

const createdUserIds: string[] = [];

async function makeUser(role: UserRole) {
	const user = await prisma.user.create({
		data: {
			email: `categories-test-${crypto.randomUUID()}@test.local`,
			username: "categories-test",
			role,
		},
	});
	createdUserIds.push(user.id);
	return user;
}

//	Every category the write tests create goes through the API, so hand the
//	ids back to the cleanup seam rather than leaking rows into the vocabulary.
function trackCreated(body: Record<string, unknown> | null) {
	if (body && typeof body.id === "string") trackCategory(body.id);
	return body as unknown as Category;
}

after(async () => {
	await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
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

//	The vocabulary persists between runs, so every write test needs a label
//	nothing else has claimed.
function uniqueLabel(): string {
	return `categories-test ${crypto.randomUUID().slice(0, 8)}`;
}

test("an admin can create a category, and its slug is derived from the label", async () => {
	const admin = await makeUser(UserRole.admin);
	const label = uniqueLabel();

	await withServer(async (baseUrl) => {
		const res = await api(baseUrl, "POST", "/api/categories", {
			token: tokenFor(admin),
			body: { label },
		});
		trackCreated(res.body);

		assert.equal(res.status, 201);
		assert.equal(res.body?.label, label);
		assert.equal(res.body?.slug, toSlug(label));
	});
});

test("an admin can give a category an explicit slug", async () => {
	const admin = await makeUser(UserRole.admin);
	const slug = toSlug(uniqueLabel());

	await withServer(async (baseUrl) => {
		const res = await api(baseUrl, "POST", "/api/categories", {
			token: tokenFor(admin),
			body: { label: "Categories Test Explicit Slug", slug },
		});
		trackCreated(res.body);

		assert.equal(res.status, 201);
		assert.equal(res.body?.slug, slug);
		assert.equal(res.body?.label, "Categories Test Explicit Slug");
	});
});

test("creating a category whose slug exists is a 409, case and spacing included", async () => {
	const admin = await makeUser(UserRole.admin);
	const label = uniqueLabel();

	await withServer(async (baseUrl) => {
		const first = await api(baseUrl, "POST", "/api/categories", {
			token: tokenFor(admin),
			body: { label },
		});
		trackCreated(first.body);
		assert.equal(first.status, 201);

		//	Same category, typed carelessly — the normalization is the whole
		//	point of the slug, so this must collide rather than create a twin.
		const second = await api(baseUrl, "POST", "/api/categories", {
			token: tokenFor(admin),
			body: { label: `  ${label.toUpperCase()}  ` },
		});

		assert.equal(second.status, 409);
		assert.equal(second.body?.error, "CATEGORY_EXISTS");
	});
});

test("a non-admin cannot create a category", async () => {
	const hirer = await makeUser(UserRole.hirer);

	await withServer(async (baseUrl) => {
		const res = await api(baseUrl, "POST", "/api/categories", {
			token: tokenFor(hirer),
			body: { label: uniqueLabel() },
		});

		assert.equal(res.status, 403);
		assert.equal(res.body?.error, "FORBIDDEN");
	});
});

test("creating a category without a token is a 401", async () => {
	await withServer(async (baseUrl) => {
		const res = await api(baseUrl, "POST", "/api/categories", {
			body: { label: uniqueLabel() },
		});

		assert.equal(res.status, 401);
	});
});

test("a category label must be a non-empty string within the length cap", async () => {
	const admin = await makeUser(UserRole.admin);

	await withServer(async (baseUrl) => {
		const token = tokenFor(admin);
		const missing = await api(baseUrl, "POST", "/api/categories", { token, body: {} });
		const blank = await api(baseUrl, "POST", "/api/categories", { token, body: { label: "   " } });
		const tooLong = await api(baseUrl, "POST", "/api/categories", {
			token,
			body: { label: "x".repeat(MAX_CATEGORY_LABEL + 1) },
		});

		assert.equal(missing.status, 400);
		assert.equal(missing.body?.error, "VALIDATION_ERROR");
		assert.equal(blank.status, 400);
		assert.equal(tooLong.status, 400);
	});
});

test("renaming a label leaves the slug — and every row pointing at it — intact", async () => {
	const admin = await makeUser(UserRole.admin);
	const hirer = await makeUser(UserRole.hirer);
	const categoryId = await categoryIdFor(uniqueLabel());
	const originalSlug = (await prisma.category.findUniqueOrThrow({ where: { id: categoryId } }))
		.slug;
	const gig = await prisma.gig.create({
		data: { hirerId: hirer.id, title: "categories-test rename", categoryId },
	});

	await withServer(async (baseUrl) => {
		const res = await api(baseUrl, "PATCH", `/api/categories/${categoryId}`, {
			token: tokenFor(admin),
			body: { label: "Categories Test Renamed" },
		});

		assert.equal(res.status, 200);
		assert.equal(res.body?.label, "Categories Test Renamed");
		//	The slug is the stable key: a display rename must not orphan the
		//	callers that resolve categories by slug.
		assert.equal(res.body?.slug, originalSlug);
		assert.equal(res.body?.id, categoryId);
	});

	//	The gig still points at the same category and now reads the new label.
	const reread = await prisma.gig.findUniqueOrThrow({
		where: { id: gig.id },
		select: { categoryId: true, category: { select: { label: true } } },
	});
	assert.equal(reread.categoryId, categoryId);
	assert.equal(reread.category.label, "Categories Test Renamed");

	await prisma.gig.delete({ where: { id: gig.id } });
});

test("an admin can re-slug a category explicitly", async () => {
	const admin = await makeUser(UserRole.admin);
	const categoryId = await categoryIdFor(uniqueLabel());
	const newSlug = toSlug(uniqueLabel());

	await withServer(async (baseUrl) => {
		const res = await api(baseUrl, "PATCH", `/api/categories/${categoryId}`, {
			token: tokenFor(admin),
			body: { slug: newSlug },
		});

		assert.equal(res.status, 200);
		assert.equal(res.body?.slug, newSlug);
	});
});

test("re-slugging onto a slug another category owns is a 409", async () => {
	const admin = await makeUser(UserRole.admin);
	const takenLabel = uniqueLabel();
	await categoryIdFor(takenLabel);
	const categoryId = await categoryIdFor(uniqueLabel());

	await withServer(async (baseUrl) => {
		const res = await api(baseUrl, "PATCH", `/api/categories/${categoryId}`, {
			token: tokenFor(admin),
			body: { slug: toSlug(takenLabel) },
		});

		assert.equal(res.status, 409);
		assert.equal(res.body?.error, "CATEGORY_EXISTS");
	});
});

test("updating an unknown category id is a 404", async () => {
	const admin = await makeUser(UserRole.admin);

	await withServer(async (baseUrl) => {
		const res = await api(baseUrl, "PATCH", `/api/categories/${crypto.randomUUID()}`, {
			token: tokenFor(admin),
			body: { label: "Categories Test Ghost" },
		});

		assert.equal(res.status, 404);
		assert.equal(res.body?.error, "CATEGORY_NOT_FOUND");
	});
});

test("an update that changes nothing is a 400 rather than a silent no-op", async () => {
	const admin = await makeUser(UserRole.admin);
	const categoryId = await categoryIdFor(uniqueLabel());

	await withServer(async (baseUrl) => {
		const res = await api(baseUrl, "PATCH", `/api/categories/${categoryId}`, {
			token: tokenFor(admin),
			body: {},
		});

		assert.equal(res.status, 400);
		assert.equal(res.body?.error, "VALIDATION_ERROR");
	});
});

test("a non-admin cannot update a category", async () => {
	const artist = await makeUser(UserRole.artist);
	const categoryId = await categoryIdFor(uniqueLabel());

	await withServer(async (baseUrl) => {
		const res = await api(baseUrl, "PATCH", `/api/categories/${categoryId}`, {
			token: tokenFor(artist),
			body: { label: "Categories Test Nope" },
		});

		assert.equal(res.status, 403);
		assert.equal(res.body?.error, "FORBIDDEN");
	});
});

test("a category created through the API is immediately usable on a gig", async () => {
	const admin = await makeUser(UserRole.admin);
	const hirer = await makeUser(UserRole.hirer);
	const label = uniqueLabel();

	await withServer(async (baseUrl) => {
		const created = await api(baseUrl, "POST", "/api/categories", {
			token: tokenFor(admin),
			body: { label },
		});
		trackCreated(created.body);
		assert.equal(created.status, 201);

		//	The payoff of a runtime-managed vocabulary: no migration, no
		//	redeploy — the new value resolves on the very next gig write.
		const gig = await api(baseUrl, "POST", "/api/gigs", {
			token: tokenFor(hirer),
			body: { title: "categories-test new vocabulary", category: label },
		});

		assert.equal(gig.status, 201);
		assert.equal((gig.body?.category as Category).slug, toSlug(label));

		await prisma.gig.delete({ where: { id: gig.body?.id as string } });
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
