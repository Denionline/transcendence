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
import { categoryIdFor, categoryNamesOf, cleanupCategories } from "./helpers/categories.js";

async function withServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
	const server = app.listen(0);
	const { port } = server.address() as AddressInfo;
	try {
		return await run(`http://localhost:${port}`);
	} finally {
		server.close();
	}
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

after(async () => {
	await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
	await cleanupCategories();
	await prisma.$disconnect();
});

async function makeUser(role: UserRole) {
	const user = await prisma.user.create({
		data: {
			email: `profile-test-${crypto.randomUUID()}@test.local`,
			username: "profile-test",
			role,
		},
	});
	createdUserIds.push(user.id);
	return user;
}

async function uniqueCategory() {
	const label = `profile-test-${crypto.randomUUID()}`;
	await categoryIdFor(label);
	return label;
}

test("PATCH /api/profile/me creates an artist profile on first call (200)", async () => {
	const artist = await makeUser(UserRole.artist);
	const category = await uniqueCategory();

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "PATCH", "/api/profile/me", {
			token: tokenFor(artist),
			body: { categories: [category], bio: "paints walls" },
		});

		assert.equal(status, 200);
		assert.equal(body?.userId, artist.id);
		assert.equal(body?.bio, "paints walls");
		assert.deepEqual(categoryNamesOf(body), [category]);
	});

	assert.equal(await prisma.artistProfile.count({ where: { userId: artist.id } }), 1);
});

test("PATCH /api/profile/me requires a category when an artist profile is created (400)", async () => {
	const artist = await makeUser(UserRole.artist);

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "PATCH", "/api/profile/me", {
			token: tokenFor(artist),
			body: { bio: "no category yet" },
		});

		assert.equal(status, 400);
		assert.equal(body?.error, "VALIDATION_ERROR");
	});

	assert.equal(await prisma.artistProfile.count({ where: { userId: artist.id } }), 0);
});

test("PATCH /api/profile/me updates an existing profile without resending the category", async () => {
	const artist = await makeUser(UserRole.artist);
	const category = await uniqueCategory();

	await withServer(async (baseUrl) => {
		const token = tokenFor(artist);
		const created = await api(baseUrl, "PATCH", "/api/profile/me", {
			token,
			body: { categories: [category], bio: "first" },
		});
		assert.equal(created.status, 200);

		const updated = await api(baseUrl, "PATCH", "/api/profile/me", {
			token,
			body: { bio: "second" },
		});

		assert.equal(updated.status, 200);
		assert.equal(updated.body?.bio, "second");
		assert.deepEqual(categoryNamesOf(updated.body), [category]);
	});
});

test("PATCH /api/profile/me toggles availability (200)", async () => {
	const artist = await makeUser(UserRole.artist);

	await withServer(async (baseUrl) => {
		const token = tokenFor(artist);
		await api(baseUrl, "PATCH", "/api/profile/me", {
			token,
			body: { categories: [await uniqueCategory()] },
		});

		const { status, body } = await api(baseUrl, "PATCH", "/api/profile/me", {
			token,
			body: { availability: false },
		});

		assert.equal(status, 200);
		assert.equal(body?.availability, false);
	});
});

test("PATCH /api/profile/me rejects a non-array categories (400 VALIDATION_ERROR)", async () => {
	const artist = await makeUser(UserRole.artist);

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "PATCH", "/api/profile/me", {
			token: tokenFor(artist),
			body: { categories: "Muralist" },
		});

		assert.equal(status, 400);
		assert.equal(body?.error, "VALIDATION_ERROR");
	});
});

test("PATCH /api/profile/me rejects a non-string entry in categories (400)", async () => {
	const artist = await makeUser(UserRole.artist);

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "PATCH", "/api/profile/me", {
			token: tokenFor(artist),
			body: { categories: [42] },
		});

		assert.equal(status, 400);
		assert.equal(body?.error, "VALIDATION_ERROR");
	});
});

test("PATCH /api/profile/me rejects an empty or whitespace-only category (400)", async () => {
	const artist = await makeUser(UserRole.artist);

	await withServer(async (baseUrl) => {
		const empty = await api(baseUrl, "PATCH", "/api/profile/me", {
			token: tokenFor(artist),
			body: { categories: [] },
		});
		assert.equal(empty.status, 400);
		assert.equal(empty.body?.error, "VALIDATION_ERROR");

		const blank = await api(baseUrl, "PATCH", "/api/profile/me", {
			token: tokenFor(artist),
			body: { categories: ["   "] },
		});
		assert.equal(blank.status, 400);
		assert.equal(blank.body?.error, "VALIDATION_ERROR");
	});
});

test("PATCH /api/profile/me rejects a category outside the vocabulary (400 CATEGORY_NOT_FOUND)", async () => {
	const artist = await makeUser(UserRole.artist);

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "PATCH", "/api/profile/me", {
			token: tokenFor(artist),
			body: { categories: ["Definitely Not A Real Category"] },
		});

		assert.equal(status, 400);
		assert.equal(body?.error, "CATEGORY_NOT_FOUND");
	});

	assert.equal(await prisma.artistProfile.count({ where: { userId: artist.id } }), 0);
});

test("PATCH /api/profile/me stores several categories for one artist", async () => {
	const artist = await makeUser(UserRole.artist);
	const first = await uniqueCategory();
	const second = await uniqueCategory();

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "PATCH", "/api/profile/me", {
			token: tokenFor(artist),
			body: { categories: [first, second] },
		});

		assert.equal(status, 200);
		assert.deepEqual(categoryNamesOf(body).sort(), [first, second].sort());
	});
});

test("PATCH /api/profile/me replaces the category set rather than appending", async () => {
	const artist = await makeUser(UserRole.artist);
	const first = await uniqueCategory();
	const second = await uniqueCategory();

	await withServer(async (baseUrl) => {
		const token = tokenFor(artist);
		await api(baseUrl, "PATCH", "/api/profile/me", { token, body: { categories: [first] } });

		const { body } = await api(baseUrl, "PATCH", "/api/profile/me", {
			token,
			body: { categories: [second] },
		});

		assert.deepEqual(categoryNamesOf(body), [second]);
	});
});

test("PATCH /api/profile/me matches a category case-insensitively and deduplicates", async () => {
	const artist = await makeUser(UserRole.artist);
	const category = await uniqueCategory();

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "PATCH", "/api/profile/me", {
			token: tokenFor(artist),
			body: { categories: [category, category.toUpperCase(), `  ${category}  `] },
		});

		assert.equal(status, 200);
		assert.deepEqual(categoryNamesOf(body), [category]);
	});
});

test("PATCH /api/profile/me rejects a non-boolean availability (400 VALIDATION_ERROR)", async () => {
	const artist = await makeUser(UserRole.artist);

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "PATCH", "/api/profile/me", {
			token: tokenFor(artist),
			body: { categories: [await uniqueCategory()], availability: "yes" },
		});

		assert.equal(status, 400);
		assert.equal(body?.error, "VALIDATION_ERROR");
	});
});

test("PATCH /api/profile/me creates a hirer profile with an organizationName (200)", async () => {
	const hirer = await makeUser(UserRole.hirer);
	const category = await uniqueCategory();

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "PATCH", "/api/profile/me", {
			token: tokenFor(hirer),
			body: { categories: [category], organizationName: "Galeria Norte" },
		});

		assert.equal(status, 200);
		assert.equal(body?.organizationName, "Galeria Norte");
		assert.deepEqual(categoryNamesOf(body), [category]);
	});
});

test("PATCH /api/profile/me requires organizationName when a hirer profile is created (400)", async () => {
	const hirer = await makeUser(UserRole.hirer);

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "PATCH", "/api/profile/me", {
			token: tokenFor(hirer),
			body: { categories: [await uniqueCategory()] },
		});

		assert.equal(status, 400);
		assert.equal(body?.error, "VALIDATION_ERROR");
	});

	assert.equal(await prisma.hirerProfile.count({ where: { userId: hirer.id } }), 0);
});

test("PATCH /api/profile/me forbids an admin (403 FORBIDDEN)", async () => {
	const admin = await makeUser(UserRole.admin);

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "PATCH", "/api/profile/me", {
			token: tokenFor(admin),
			body: { categories: [await uniqueCategory()] },
		});

		assert.equal(status, 403);
		assert.equal(body?.error, "FORBIDDEN");
	});
});

test("PATCH /api/profile/me requires authentication (401 without a token)", async () => {
	await withServer(async (baseUrl) => {
		const { status } = await api(baseUrl, "PATCH", "/api/profile/me", {
			body: { categories: ["whatever"] },
		});
		assert.equal(status, 401);
	});
});

test("GET /api/profile/:id returns another user's artist profile to any logged-in user", async () => {
	const artist = await makeUser(UserRole.artist);
	const viewer = await makeUser(UserRole.hirer);
	const category = await uniqueCategory();

	await withServer(async (baseUrl) => {
		await api(baseUrl, "PATCH", "/api/profile/me", {
			token: tokenFor(artist),
			body: { categories: [category], bio: "visible" },
		});

		const { status, body } = await api(baseUrl, "GET", `/api/profile/${artist.id}`, {
			token: tokenFor(viewer),
		});

		assert.equal(status, 200);
		assert.equal(body?.userId, artist.id);
		assert.equal(body?.bio, "visible");
		assert.deepEqual(categoryNamesOf(body), [category]);
	});
});

test("GET /api/profile/:id returns 404 USER_NOT_FOUND for an unknown id", async () => {
	const viewer = await makeUser(UserRole.artist);

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "GET", `/api/profile/${crypto.randomUUID()}`, {
			token: tokenFor(viewer),
		});

		assert.equal(status, 404);
		assert.equal(body?.error, "USER_NOT_FOUND");
	});
});

test("GET /api/profile/:id returns 404 PROFILE_NOT_FOUND when the user has no profile yet", async () => {
	const artist = await makeUser(UserRole.artist);
	const viewer = await makeUser(UserRole.hirer);

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "GET", `/api/profile/${artist.id}`, {
			token: tokenFor(viewer),
		});

		assert.equal(status, 404);
		assert.equal(body?.error, "PROFILE_NOT_FOUND");
	});
});

test("GET /api/profile/:id returns 404 PROFILE_NOT_FOUND for an admin account", async () => {
	const admin = await makeUser(UserRole.admin);
	const viewer = await makeUser(UserRole.artist);

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "GET", `/api/profile/${admin.id}`, {
			token: tokenFor(viewer),
		});

		assert.equal(status, 404);
		assert.equal(body?.error, "PROFILE_NOT_FOUND");
	});
});

test("DELETE /api/profile/:id lets a user delete their own profile (204)", async () => {
	const artist = await makeUser(UserRole.artist);

	await withServer(async (baseUrl) => {
		const token = tokenFor(artist);
		await api(baseUrl, "PATCH", "/api/profile/me", {
			token,
			body: { categories: [await uniqueCategory()] },
		});

		const del = await api(baseUrl, "DELETE", `/api/profile/${artist.id}`, { token });
		assert.equal(del.status, 204);

		const read = await api(baseUrl, "GET", `/api/profile/${artist.id}`, { token });
		assert.equal(read.status, 404);
	});

	assert.equal(await prisma.artistProfile.count({ where: { userId: artist.id } }), 0);
});

test("DELETE /api/profile/:id lets an admin delete anyone's profile (204)", async () => {
	const artist = await makeUser(UserRole.artist);
	const admin = await makeUser(UserRole.admin);

	await withServer(async (baseUrl) => {
		await api(baseUrl, "PATCH", "/api/profile/me", {
			token: tokenFor(artist),
			body: { categories: [await uniqueCategory()] },
		});

		const del = await api(baseUrl, "DELETE", `/api/profile/${artist.id}`, {
			token: tokenFor(admin),
		});
		assert.equal(del.status, 204);
	});
});

test("DELETE /api/profile/:id forbids deleting someone else's profile (403 FORBIDDEN)", async () => {
	const artist = await makeUser(UserRole.artist);
	const stranger = await makeUser(UserRole.hirer);

	await withServer(async (baseUrl) => {
		await api(baseUrl, "PATCH", "/api/profile/me", {
			token: tokenFor(artist),
			body: { categories: [await uniqueCategory()] },
		});

		const { status, body } = await api(baseUrl, "DELETE", `/api/profile/${artist.id}`, {
			token: tokenFor(stranger),
		});

		assert.equal(status, 403);
		assert.equal(body?.error, "FORBIDDEN");
	});
});

test("DELETE /api/profile/:id returns 404 PROFILE_NOT_FOUND when there is nothing to delete", async () => {
	const artist = await makeUser(UserRole.artist);

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "DELETE", `/api/profile/${artist.id}`, {
			token: tokenFor(artist),
		});

		assert.equal(status, 404);
		assert.equal(body?.error, "PROFILE_NOT_FOUND");
	});
});
