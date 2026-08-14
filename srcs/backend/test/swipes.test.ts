import "./setup.js";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";

import app from "../src/app.js";
import { SECRET } from "../src/lib/env.js";
import { prisma } from "../src/lib/prisma.js";
import { GigStatus, UserRole } from "../generated/prisma/client.js";
import { artistCategories, cleanupCategories, gigCategory } from "./helpers/categories.js";

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

//	Every Swipe/Match/Gig/Profile row hangs off a User by a cascading relation
//	(see 20260725134217_user_delete_cascade), so deleting the users is enough.
after(async () => {
	await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
	await cleanupCategories();
	await prisma.$disconnect();
});

async function makeUser(role: UserRole) {
	const user = await prisma.user.create({
		data: {
			email: `swipes-test-${crypto.randomUUID()}@test.local`,
			username: "swipes-test",
			role,
		},
	});
	createdUserIds.push(user.id);
	return user;
}

async function makeArtist(categories: string[], availability = true) {
	const user = await makeUser(UserRole.artist);
	await prisma.artistProfile.create({
		data: {
			userId: user.id,
			availability,
			...(await artistCategories(categories)),
		},
	});
	return user;
}

async function makeHirer() {
	return await makeUser(UserRole.hirer);
}

async function makeGig(
	hirer: { id: string },
	category: string,
	status: GigStatus = GigStatus.open,
) {
	return await prisma.gig.create({
		data: {
			hirerId: hirer.id,
			title: "swipes-test gig",
			status,
			...(await gigCategory(category)),
		},
	});
}

//	A category nobody else in the suite uses, so /next can never pick up a
//	stray row from another test and make an assertion flaky.
function uniqueCategory() {
	return `swipes-test-${crypto.randomUUID()}`;
}

test("POST /api/swipes records an artist's like on a category-matched gig (201, no match yet)", async () => {
	const category = uniqueCategory();
	const artist = await makeArtist([category]);
	const hirer = await makeHirer();
	const gig = await makeGig(hirer, category);

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "POST", "/api/swipes", {
			token: tokenFor(artist),
			body: { gigId: gig.id, liked: true },
		});

		assert.equal(status, 201);
		assert.equal(body?.matchId, undefined);
	});

	assert.equal(await prisma.swipe.count({ where: { gigId: gig.id, swiperId: artist.id } }), 1);
});

test("POST /api/swipes rejects a gig outside the artist's categories (400 CATEGORY_MISMATCH)", async () => {
	const artist = await makeArtist([uniqueCategory()]);
	const hirer = await makeHirer();
	const gig = await makeGig(hirer, uniqueCategory());

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "POST", "/api/swipes", {
			token: tokenFor(artist),
			body: { gigId: gig.id, liked: true },
		});

		assert.equal(status, 400);
		assert.equal(body?.error, "CATEGORY_MISMATCH");
	});
});

test("POST /api/swipes creates a Match on a mutual like and closes the gig", async () => {
	const category = uniqueCategory();
	const artist = await makeArtist([category]);
	const hirer = await makeHirer();
	const gig = await makeGig(hirer, category);

	await withServer(async (baseUrl) => {
		const hirerSwipe = await api(baseUrl, "POST", "/api/swipes", {
			token: tokenFor(hirer),
			body: { gigId: gig.id, liked: true, targetUserId: artist.id },
		});
		assert.equal(hirerSwipe.status, 201);
		assert.equal(hirerSwipe.body?.matchId, undefined);

		const artistSwipe = await api(baseUrl, "POST", "/api/swipes", {
			token: tokenFor(artist),
			body: { gigId: gig.id, liked: true },
		});
		assert.equal(artistSwipe.status, 201);
		assert.equal(typeof artistSwipe.body?.matchId, "string");
	});

	assert.equal(await prisma.match.count({ where: { gigId: gig.id, artistId: artist.id } }), 1);

	const closed = await prisma.gig.findUnique({ where: { id: gig.id } });
	assert.equal(closed?.status, GigStatus.closed);
});

test("POST /api/swipes creates no Match when one side passed", async () => {
	const category = uniqueCategory();
	const artist = await makeArtist([category]);
	const hirer = await makeHirer();
	const gig = await makeGig(hirer, category);

	await withServer(async (baseUrl) => {
		await api(baseUrl, "POST", "/api/swipes", {
			token: tokenFor(hirer),
			body: { gigId: gig.id, liked: false, targetUserId: artist.id },
		});

		const { status, body } = await api(baseUrl, "POST", "/api/swipes", {
			token: tokenFor(artist),
			body: { gigId: gig.id, liked: true },
		});

		assert.equal(status, 201);
		assert.equal(body?.matchId, undefined);
	});

	assert.equal(await prisma.match.count({ where: { gigId: gig.id } }), 0);
});

test("POST /api/swipes rejects swiping the same gig twice (409 SWIPE_EXISTS)", async () => {
	const category = uniqueCategory();
	const artist = await makeArtist([category]);
	const hirer = await makeHirer();
	const gig = await makeGig(hirer, category);

	await withServer(async (baseUrl) => {
		const first = await api(baseUrl, "POST", "/api/swipes", {
			token: tokenFor(artist),
			body: { gigId: gig.id, liked: true },
		});
		assert.equal(first.status, 201);

		const second = await api(baseUrl, "POST", "/api/swipes", {
			token: tokenFor(artist),
			body: { gigId: gig.id, liked: false },
		});
		assert.equal(second.status, 409);
		assert.equal(second.body?.error, "SWIPE_EXISTS");
	});
});

test("POST /api/swipes rejects a closed gig (409 GIG_CLOSED)", async () => {
	const category = uniqueCategory();
	const artist = await makeArtist([category]);
	const hirer = await makeHirer();
	const gig = await makeGig(hirer, category, GigStatus.closed);

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "POST", "/api/swipes", {
			token: tokenFor(artist),
			body: { gigId: gig.id, liked: true },
		});

		assert.equal(status, 409);
		assert.equal(body?.error, "GIG_CLOSED");
	});
});

test("POST /api/swipes rejects an artist with no profile (404 PROFILE_NOT_FOUND)", async () => {
	const artist = await makeUser(UserRole.artist);
	const hirer = await makeHirer();
	const gig = await makeGig(hirer, uniqueCategory());

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "POST", "/api/swipes", {
			token: tokenFor(artist),
			body: { gigId: gig.id, liked: true },
		});

		assert.equal(status, 404);
		assert.equal(body?.error, "PROFILE_NOT_FOUND");
	});
});

test("POST /api/swipes forbids an admin from swiping (403 FORBIDDEN)", async () => {
	const admin = await makeUser(UserRole.admin);
	const hirer = await makeHirer();
	const gig = await makeGig(hirer, uniqueCategory());

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "POST", "/api/swipes", {
			token: tokenFor(admin),
			body: { gigId: gig.id, liked: true },
		});

		assert.equal(status, 403);
		assert.equal(body?.error, "FORBIDDEN");
	});
});

test("POST /api/swipes requires targetUserId when a hirer swipes (400 VALIDATION_ERROR)", async () => {
	const hirer = await makeHirer();
	const gig = await makeGig(hirer, uniqueCategory());

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "POST", "/api/swipes", {
			token: tokenFor(hirer),
			body: { gigId: gig.id, liked: true },
		});

		assert.equal(status, 400);
		assert.equal(body?.error, "VALIDATION_ERROR");
	});
});

test("POST /api/swipes forbids a hirer from swiping on someone else's gig (403 FORBIDDEN)", async () => {
	const category = uniqueCategory();
	const owner = await makeHirer();
	const otherHirer = await makeHirer();
	const artist = await makeArtist([category]);
	const gig = await makeGig(owner, category);

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "POST", "/api/swipes", {
			token: tokenFor(otherHirer),
			body: { gigId: gig.id, liked: true, targetUserId: artist.id },
		});

		assert.equal(status, 403);
		assert.equal(body?.error, "FORBIDDEN");
	});
});

test("POST /api/swipes rejects a hirer's swipe on an unavailable artist (409 ARTIST_UNAVAILABLE)", async () => {
	const category = uniqueCategory();
	const artist = await makeArtist([category], false);
	const hirer = await makeHirer();
	const gig = await makeGig(hirer, category);

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "POST", "/api/swipes", {
			token: tokenFor(hirer),
			body: { gigId: gig.id, liked: true, targetUserId: artist.id },
		});

		assert.equal(status, 409);
		assert.equal(body?.error, "ARTIST_UNAVAILABLE");
	});
});

test("GET /api/swipes/next hands an artist an open gig in their category", async () => {
	const category = uniqueCategory();
	const artist = await makeArtist([category]);
	const hirer = await makeHirer();
	const gig = await makeGig(hirer, category);

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "GET", "/api/swipes/next", {
			token: tokenFor(artist),
		});

		assert.equal(status, 200);
		assert.equal(body?.id, gig.id);
	});
});

test("GET /api/swipes/next serves gigs from every category an artist holds", async () => {
	const first = uniqueCategory();
	const second = uniqueCategory();
	const artist = await makeArtist([first, second]);
	const hirer = await makeHirer();
	const firstGig = await makeGig(hirer, first);
	const secondGig = await makeGig(hirer, second);

	await withServer(async (baseUrl) => {
		const token = tokenFor(artist);

		const one = await api(baseUrl, "GET", "/api/swipes/next", { token });
		assert.equal(one.status, 200);

		//	Exclude whichever card came back first; the other category must supply
		//	the next one. On the old single-string column this returned 404.
		const two = await api(baseUrl, "GET", `/api/swipes/next?excludeIds=${one.body?.id}`, {
			token,
		});
		assert.equal(two.status, 200);

		const served = [one.body?.id, two.body?.id].sort();
		assert.deepEqual(served, [firstGig.id, secondGig.id].sort());
	});
});

test("GET /api/swipes/next skips gigs the artist already swiped (404 NO_MORE_CANDIDATES)", async () => {
	const category = uniqueCategory();
	const artist = await makeArtist([category]);
	const hirer = await makeHirer();
	const gig = await makeGig(hirer, category);

	await withServer(async (baseUrl) => {
		const swiped = await api(baseUrl, "POST", "/api/swipes", {
			token: tokenFor(artist),
			body: { gigId: gig.id, liked: false },
		});
		assert.equal(swiped.status, 201);

		const { status, body } = await api(baseUrl, "GET", "/api/swipes/next", {
			token: tokenFor(artist),
		});
		assert.equal(status, 404);
		assert.equal(body?.error, "NO_MORE_CANDIDATES");
	});
});

test("GET /api/swipes/next hands a hirer an available artist matching their gig", async () => {
	const category = uniqueCategory();
	const artist = await makeArtist([category]);
	const hirer = await makeHirer();
	const gig = await makeGig(hirer, category);

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "GET", `/api/swipes/next?gigId=${gig.id}`, {
			token: tokenFor(hirer),
		});

		assert.equal(status, 200);
		assert.equal(body?.userId, artist.id);
	});
});

test("GET /api/swipes/next never offers a hirer an unavailable artist (404 NO_MORE_CANDIDATES)", async () => {
	const category = uniqueCategory();
	await makeArtist([category], false);
	const hirer = await makeHirer();
	const gig = await makeGig(hirer, category);

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "GET", `/api/swipes/next?gigId=${gig.id}`, {
			token: tokenFor(hirer),
		});

		assert.equal(status, 404);
		assert.equal(body?.error, "NO_MORE_CANDIDATES");
	});
});

test("GET /api/swipes/next requires a gigId when the caller is a hirer (400 VALIDATION_ERROR)", async () => {
	const hirer = await makeHirer();

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "GET", "/api/swipes/next", {
			token: tokenFor(hirer),
		});

		assert.equal(status, 400);
		assert.equal(body?.error, "VALIDATION_ERROR");
	});
});

test("GET /api/swipes returns the caller's history in the paginated envelope", async () => {
	const category = uniqueCategory();
	const artist = await makeArtist([category]);
	const hirer = await makeHirer();
	const liked = await makeGig(hirer, category);
	const passed = await makeGig(hirer, category);

	await withServer(async (baseUrl) => {
		const token = tokenFor(artist);
		await api(baseUrl, "POST", "/api/swipes", { token, body: { gigId: liked.id, liked: true } });
		await api(baseUrl, "POST", "/api/swipes", { token, body: { gigId: passed.id, liked: false } });

		const all = await api(baseUrl, "GET", "/api/swipes", { token });
		assert.equal(all.status, 200);
		assert.equal(all.body?.total, 2);
		assert.ok(Array.isArray(all.body?.items));

		const onlyLiked = await api(baseUrl, "GET", "/api/swipes?liked=true", { token });
		assert.equal(onlyLiked.body?.total, 1);
		const items = onlyLiked.body?.items as Array<Record<string, unknown>>;
		assert.equal(items[0]?.liked, true);
	});
});

test("GET /api/swipes requires authentication (401 without a token)", async () => {
	await withServer(async (baseUrl) => {
		const { status } = await api(baseUrl, "GET", "/api/swipes");
		assert.equal(status, 401);
	});
});

test("GET /api/swipes/interests requires authentication (401 without a token)", async () => {
	await withServer(async (baseUrl) => {
		const { status } = await api(baseUrl, "GET", "/api/swipes/interests");
		assert.equal(status, 401);
	});
});

test("GET /api/swipes/interests lists a hirer's gig liked by an artist who hasn't been answered", async () => {
	const category = uniqueCategory();
	const artist = await makeArtist([category]);
	const hirer = await makeHirer();
	const gig = await makeGig(hirer, category);

	await withServer(async (baseUrl) => {
		await api(baseUrl, "POST", "/api/swipes", {
			token: tokenFor(artist),
			body: { gigId: gig.id, liked: true },
		});

		const { status, body } = await api(baseUrl, "GET", "/api/swipes/interests", {
			token: tokenFor(hirer),
		});

		assert.equal(status, 200);
		const items = body?.items as Array<Record<string, unknown>>;
		assert.equal(items.length, 1);
		assert.equal(items[0]?.gigId, gig.id);
		assert.equal((items[0]?.otherUser as Record<string, unknown>)?.id, artist.id);
	});
});

test("GET /api/swipes/interests lists an artist's hirer who liked them, keyed by displayName", async () => {
	const category = uniqueCategory();
	const artist = await makeArtist([category]);
	const hirer = await makeHirer();
	await prisma.hirerProfile.create({
		data: { userId: hirer.id, organizationName: "Interests Test Org" },
	});
	const gig = await makeGig(hirer, category);

	await withServer(async (baseUrl) => {
		await api(baseUrl, "POST", "/api/swipes", {
			token: tokenFor(hirer),
			body: { gigId: gig.id, liked: true, targetUserId: artist.id },
		});

		const { status, body } = await api(baseUrl, "GET", "/api/swipes/interests", {
			token: tokenFor(artist),
		});

		assert.equal(status, 200);
		const items = body?.items as Array<Record<string, unknown>>;
		assert.equal(items.length, 1);
		assert.equal(items[0]?.gigId, gig.id);
		const otherUser = items[0]?.otherUser as Record<string, unknown>;
		assert.equal(otherUser?.id, hirer.id);
		assert.equal(otherUser?.displayName, "Interests Test Org");
	});
});

test("GET /api/swipes/interests drops an item once the caller has swiped back (match or decline)", async () => {
	const category = uniqueCategory();
	const artist = await makeArtist([category]);
	const hirer = await makeHirer();
	const gig = await makeGig(hirer, category);

	await withServer(async (baseUrl) => {
		await api(baseUrl, "POST", "/api/swipes", {
			token: tokenFor(hirer),
			body: { gigId: gig.id, liked: true, targetUserId: artist.id },
		});

		// Artist declines: their own swipe row should make the item disappear
		// from their "received" list too, not just the hirer's.
		await api(baseUrl, "POST", "/api/swipes", {
			token: tokenFor(artist),
			body: { gigId: gig.id, liked: false },
		});

		const hirerView = await api(baseUrl, "GET", "/api/swipes/interests", {
			token: tokenFor(hirer),
		});
		assert.equal((hirerView.body?.items as unknown[]).length, 0);
	});
});

test("GET /api/swipes/interests never lists something the caller already matched on", async () => {
	const category = uniqueCategory();
	const artist = await makeArtist([category]);
	const hirer = await makeHirer();
	const gig = await makeGig(hirer, category);

	await withServer(async (baseUrl) => {
		await api(baseUrl, "POST", "/api/swipes", {
			token: tokenFor(hirer),
			body: { gigId: gig.id, liked: true, targetUserId: artist.id },
		});
		const artistSwipe = await api(baseUrl, "POST", "/api/swipes", {
			token: tokenFor(artist),
			body: { gigId: gig.id, liked: true },
		});
		assert.equal(typeof artistSwipe.body?.matchId, "string");

		const artistView = await api(baseUrl, "GET", "/api/swipes/interests", {
			token: tokenFor(artist),
		});
		assert.equal((artistView.body?.items as unknown[]).length, 0);

		const hirerView = await api(baseUrl, "GET", "/api/swipes/interests", {
			token: tokenFor(hirer),
		});
		assert.equal((hirerView.body?.items as unknown[]).length, 0);
	});
});
