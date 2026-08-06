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

//	Every query in this file is scoped by these categories. The suite shares a
//	database with the other test files, which run in parallel processes.
const MARKER = `search-test-${crypto.randomUUID()}`;
const CAT_A = `${MARKER}-gig-a`;
const CAT_B = `${MARKER}-gig-b`;
const GIG_SCOPE = `category=${CAT_A},${CAT_B}`;
const ACAT_A = `${MARKER}-art-a`;
const ACAT_B = `${MARKER}-art-b`;
const ARTIST_SCOPE = `category=${ACAT_A},${ACAT_B}`;
const TERM = `trm${crypto.randomUUID().slice(0, 8)}`;
const BASE_TIME = new Date("2026-01-01T00:00:00.000Z").getTime();

const createdUserIds: string[] = [];
const createdGigIds: string[] = [];
const label = new Map<string, string>();

interface Envelope {
	items: Array<Record<string, unknown>>;
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
	hasMore: boolean;
}

function envelope(body: Record<string, unknown> | null): Envelope {
	return body as unknown as Envelope;
}

//	Ids are opaque uuids; failures are unreadable without the seed labels.
function labelsOf(items: Array<Record<string, unknown>>): string[] {
	return items.map((item) => label.get(String(item.id)) ?? `??${String(item.id).slice(0, 6)}`);
}

async function makeUser(role: UserRole, username: string) {
	const user = await prisma.user.create({
		data: {
			email: `${MARKER}-${crypto.randomUUID()}@test.local`,
			username,
			role,
			avatarUrl: `https://cdn.test/${username}.png`,
		},
	});
	createdUserIds.push(user.id);
	return user;
}

interface GigSpec {
	key: string;
	title: string;
	description: string | null;
	category: string;
	location: string | null;
	rate: number | null;
	status: GigStatus;
}

//	g4 is the only closed gig; g1/g3/g6 match TERM in the title, g2/g5 in the
//	description only. Open + q=TERM therefore splits 3 / 2 across the buckets,
//	so a pageSize=2 walk has to straddle the seam on page 2.
const GIG_SPECS: GigSpec[] = [
	{
		key: "g1",
		title: `${TERM} mural`,
		description: null,
		category: CAT_A,
		location: "Lisbon",
		rate: null,
		status: GigStatus.open,
	},
	{
		key: "g2",
		title: "quiet gig",
		description: `needs ${TERM}`,
		category: CAT_A,
		location: "Porto",
		rate: 100,
		status: GigStatus.open,
	},
	{
		key: "g3",
		title: `${TERM} again`,
		description: `${TERM} too`,
		category: CAT_B,
		location: "Lisbon",
		rate: 500,
		status: GigStatus.open,
	},
	{
		key: "g4",
		title: `${TERM} closed`,
		description: null,
		category: CAT_B,
		location: "Porto",
		rate: 100,
		status: GigStatus.closed,
	},
	{
		key: "g5",
		title: "plain five",
		description: `another ${TERM}`,
		category: CAT_A,
		location: "Lisbon",
		rate: 500,
		status: GigStatus.open,
	},
	{
		key: "g6",
		title: `${TERM} sixth`,
		description: null,
		category: CAT_B,
		location: "Porto",
		rate: null,
		status: GigStatus.open,
	},
];

interface ArtistSpec {
	key: string;
	username: string;
	bio: string | null;
	category: string;
	location: string | null;
	availability: boolean;
}

//	`me` is the caller and matches TERM in both username and bio — without that
//	row, "the caller never sees themselves" would pass vacuously.
const ARTIST_SPECS: ArtistSpec[] = [
	{
		key: "a1",
		username: `${TERM}ana`,
		bio: null,
		category: ACAT_A,
		location: "Lisbon",
		availability: true,
	},
	{
		key: "a2",
		username: `${TERM}bruno`,
		bio: `also ${TERM}`,
		category: ACAT_B,
		location: "Porto",
		availability: true,
	},
	{
		key: "a3",
		username: "carla",
		bio: `needs ${TERM}`,
		category: ACAT_A,
		location: "Porto",
		availability: false,
	},
	{
		key: "a4",
		username: "diogo",
		bio: `needs ${TERM}`,
		category: ACAT_B,
		location: "Lisbon",
		availability: true,
	},
	{
		key: "a5",
		username: `${TERM}elsa`,
		bio: "no match here",
		category: ACAT_A,
		location: "PORTO",
		availability: true,
	},
	{
		key: "a6",
		username: "unrelated",
		bio: "unrelated",
		category: ACAT_A,
		location: "Lisbon",
		availability: true,
	},
	{
		key: "me",
		username: `${TERM}caller`,
		bio: `${TERM} self`,
		category: ACAT_A,
		location: "Porto",
		availability: true,
	},
];

interface Corpus {
	hirer: { id: string; role: UserRole };
	caller: { id: string; role: UserRole };
}

async function seedGigs(hirer: { id: string }) {
	let index = 0;
	while (index < GIG_SPECS.length) {
		const spec = GIG_SPECS[index];
		const gig = await prisma.gig.create({
			data: {
				hirerId: hirer.id,
				title: spec.title,
				description: spec.description,
				category: spec.category,
				location: spec.location,
				rate: spec.rate,
				status: spec.status,
				createdAt: new Date(BASE_TIME + index * 60_000),
			},
		});
		createdGigIds.push(gig.id);
		label.set(gig.id, spec.key);
		index += 1;
	}
}

async function seedArtists(): Promise<{ id: string; role: UserRole }> {
	let caller: { id: string; role: UserRole } | undefined;

	let index = 0;
	while (index < ARTIST_SPECS.length) {
		const spec = ARTIST_SPECS[index];
		const user = await prisma.user.create({
			data: {
				email: `${MARKER}-${crypto.randomUUID()}@test.local`,
				username: spec.username,
				role: UserRole.artist,
				avatarUrl: `https://cdn.test/${spec.key}.png`,
				artistProfile: {
					create: {
						category: spec.category,
						bio: spec.bio,
						location: spec.location,
						availability: spec.availability,
						createdAt: new Date(BASE_TIME + index * 60_000),
					},
				},
			},
			include: { artistProfile: true },
		});
		createdUserIds.push(user.id);
		label.set(user.artistProfile!.id, spec.key);
		if (spec.key === "me") caller = { id: user.id, role: user.role };
		index += 1;
	}

	return caller!;
}

let corpus: Promise<Corpus> | undefined;

//	Seeded once and awaited by every test, as the suite's assertions all read the
//	same fixed corpus.
function setup(): Promise<Corpus> {
	if (corpus === undefined) {
		corpus = (async () => {
			const hirer = await makeUser(UserRole.hirer, `${MARKER}-hirer`);
			await seedGigs(hirer);
			const caller = await seedArtists();
			return { hirer, caller };
		})();
	}
	return corpus;
}

async function searchGigs(baseUrl: string, token: string, query: string) {
	const { status, body } = await api(baseUrl, "GET", `/api/search/gigs?${query}`, { token });
	return { status, body, env: envelope(body) };
}

async function searchArtists(baseUrl: string, token: string, query: string) {
	const { status, body } = await api(baseUrl, "GET", `/api/search/artists?${query}`, { token });
	return { status, body, env: envelope(body) };
}

async function walkPages(
	baseUrl: string,
	token: string,
	path: string,
	query: string,
	pageSize: number,
): Promise<string[]> {
	const collected: string[] = [];
	let page = 1;
	let guard = 0;

	while (guard < 50) {
		const { body } = await api(
			baseUrl,
			"GET",
			`/api/search/${path}?${query}&page=${page}&pageSize=${pageSize}`,
			{ token },
		);
		const env = envelope(body);
		collected.push(...labelsOf(env.items));

		const isLastPage = page * pageSize >= env.total;
		if (isLastPage === true) break;
		page += 1;
		guard += 1;
	}

	return collected;
}

after(async () => {
	await prisma.gig.deleteMany({ where: { id: { in: createdGigIds } } });
	await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
	await prisma.$disconnect();
});

/* ------------------------------------------------------------------ */
/* Auth and envelope                                                   */
/* ------------------------------------------------------------------ */

test("GET /api/search/gigs requires authentication (401 without a token)", async () => {
	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "GET", "/api/search/gigs");

		assert.equal(status, 401);
		assert.equal(body?.error, "MISSING_TOKEN");
	});
});

test("GET /api/search/artists requires authentication (401 without a token)", async () => {
	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "GET", "/api/search/artists");

		assert.equal(status, 401);
		assert.equal(body?.error, "MISSING_TOKEN");
	});
});

test("search returns the six-field envelope, not the four-field list shape", async () => {
	const { hirer } = await setup();

	await withServer(async (baseUrl) => {
		const { status, body } = await searchGigs(baseUrl, tokenFor(hirer), GIG_SCOPE);

		assert.equal(status, 200);
		assert.deepEqual(Object.keys(body as object).sort(), [
			"hasMore",
			"items",
			"page",
			"pageSize",
			"total",
			"totalPages",
		]);
	});
});

test("a gig item carries hirer{username, avatarUrl} and never an email", async () => {
	const { hirer } = await setup();

	await withServer(async (baseUrl) => {
		const { env } = await searchGigs(baseUrl, tokenFor(hirer), `${GIG_SCOPE}&pageSize=1`);
		const item = env.items[0];

		assert.deepEqual(Object.keys(item).sort(), [
			"category",
			"createdAt",
			"description",
			"hirer",
			"hirerId",
			"id",
			"location",
			"rate",
			"status",
			"title",
		]);
		assert.deepEqual(Object.keys(item.hirer as object).sort(), ["avatarUrl", "username"]);
	});
});

/* ------------------------------------------------------------------ */
/* Gig filters                                                         */
/* ------------------------------------------------------------------ */

test("?category= filters, and the CSV and repeated forms are equivalent", async () => {
	const { hirer } = await setup();

	await withServer(async (baseUrl) => {
		const token = tokenFor(hirer);
		const onlyA = await searchGigs(baseUrl, token, `category=${CAT_A}&pageSize=50`);
		assert.deepEqual(labelsOf(onlyA.env.items).sort(), ["g1", "g2", "g5"]);

		const csv = await searchGigs(baseUrl, token, `${GIG_SCOPE}&pageSize=50`);
		const repeated = await searchGigs(
			baseUrl,
			token,
			`category=${CAT_A}&category=${CAT_B}&pageSize=50`,
		);
		assert.deepEqual(labelsOf(repeated.env.items), labelsOf(csv.env.items));
		assert.equal(repeated.env.total, csv.env.total);
	});
});

test("?location= matches case-insensitively", async () => {
	const { hirer } = await setup();

	await withServer(async (baseUrl) => {
		const { env } = await searchGigs(baseUrl, tokenFor(hirer), `${GIG_SCOPE}&location=lis`);

		assert.deepEqual(labelsOf(env.items).sort(), ["g1", "g3", "g5"]);
	});
});

test("?minRate= excludes cheaper gigs and gigs with a null rate", async () => {
	const { hirer } = await setup();

	await withServer(async (baseUrl) => {
		const { env } = await searchGigs(baseUrl, tokenFor(hirer), `${GIG_SCOPE}&minRate=500`);

		assert.deepEqual(labelsOf(env.items).sort(), ["g3", "g5"]);
		assert.equal(env.total, 2);
	});
});

test("?minRate greater than ?maxRate is a 400 VALIDATION_ERROR", async () => {
	const { hirer } = await setup();

	await withServer(async (baseUrl) => {
		const { status, body } = await searchGigs(
			baseUrl,
			tokenFor(hirer),
			`${GIG_SCOPE}&minRate=500&maxRate=100`,
		);

		assert.equal(status, 400);
		assert.equal(body?.error, "VALIDATION_ERROR");
	});
});

test("?q= matches the title or the description", async () => {
	const { hirer } = await setup();

	await withServer(async (baseUrl) => {
		const { env } = await searchGigs(
			baseUrl,
			tokenFor(hirer),
			`${GIG_SCOPE}&q=${TERM}&pageSize=50`,
		);

		//	g4 also matches but is closed, so the default status filter hides it.
		assert.deepEqual(labelsOf(env.items).sort(), ["g1", "g2", "g3", "g5", "g6"]);
	});
});

test("?q= is escaped, so % is a literal and does not match everything", async () => {
	const { hirer } = await setup();

	await withServer(async (baseUrl) => {
		const token = tokenFor(hirer);
		const wildcard = await searchGigs(baseUrl, token, `${GIG_SCOPE}&q=%25&pageSize=50`);
		const unfiltered = await searchGigs(baseUrl, token, `${GIG_SCOPE}&pageSize=50`);

		assert.equal(wildcard.env.total, 0);
		assert.ok(unfiltered.env.total > 0);
	});
});

test("status defaults to open; ?status=all includes closed; ?status=bogus is a 400", async () => {
	const { hirer } = await setup();

	await withServer(async (baseUrl) => {
		const token = tokenFor(hirer);

		const byDefault = await searchGigs(baseUrl, token, `${GIG_SCOPE}&pageSize=50`);
		assert.equal(labelsOf(byDefault.env.items).includes("g4"), false);
		assert.equal(byDefault.env.total, 5);

		const all = await searchGigs(baseUrl, token, `${GIG_SCOPE}&status=all&pageSize=50`);
		assert.equal(labelsOf(all.env.items).includes("g4"), true);
		assert.equal(all.env.total, 6);

		const closed = await searchGigs(baseUrl, token, `${GIG_SCOPE}&status=closed&pageSize=50`);
		assert.deepEqual(labelsOf(closed.env.items), ["g4"]);

		const bogus = await searchGigs(baseUrl, token, `${GIG_SCOPE}&status=bogus`);
		assert.equal(bogus.status, 400);
		assert.equal(bogus.body?.error, "VALIDATION_ERROR");
	});
});

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */

test("?pageSize= limits the page without changing total", async () => {
	const { hirer } = await setup();

	await withServer(async (baseUrl) => {
		const { env } = await searchGigs(
			baseUrl,
			tokenFor(hirer),
			`${GIG_SCOPE}&status=all&pageSize=2`,
		);

		assert.equal(env.items.length, 2);
		assert.equal(env.total, 6);
		assert.equal(env.totalPages, 3);
		assert.equal(env.hasMore, true);
	});
});

test("?pageSize=999 clamps to 100 and ?page=0 falls back to 1", async () => {
	const { hirer } = await setup();

	await withServer(async (baseUrl) => {
		const { status, env } = await searchGigs(
			baseUrl,
			tokenFor(hirer),
			`${GIG_SCOPE}&pageSize=999&page=0`,
		);

		assert.equal(status, 200);
		assert.equal(env.pageSize, 100);
		assert.equal(env.page, 1);
	});
});

test("walking every page yields each seeded gig exactly once", async () => {
	const { hirer } = await setup();

	await withServer(async (baseUrl) => {
		const walked = await walkPages(baseUrl, tokenFor(hirer), "gigs", `${GIG_SCOPE}&status=all`, 2);

		assert.deepEqual(walked.slice().sort(), ["g1", "g2", "g3", "g4", "g5", "g6"]);
	});
});

/* ------------------------------------------------------------------ */
/* Gig sorting                                                         */
/* ------------------------------------------------------------------ */

test("?sort=oldest is the exact reverse of ?sort=newest", async () => {
	const { hirer } = await setup();

	await withServer(async (baseUrl) => {
		const token = tokenFor(hirer);
		const newest = await searchGigs(baseUrl, token, `${GIG_SCOPE}&status=all&pageSize=50`);
		const oldest = await searchGigs(
			baseUrl,
			token,
			`${GIG_SCOPE}&status=all&sort=oldest&pageSize=50`,
		);

		assert.deepEqual(labelsOf(newest.env.items), ["g6", "g5", "g4", "g3", "g2", "g1"]);
		assert.deepEqual(labelsOf(oldest.env.items), labelsOf(newest.env.items).reverse());
	});
});

test("?sort=rate_desc and ?sort=rate_asc both put null rates last", async () => {
	const { hirer } = await setup();

	await withServer(async (baseUrl) => {
		const token = tokenFor(hirer);

		const desc = await searchGigs(
			baseUrl,
			token,
			`${GIG_SCOPE}&status=all&sort=rate_desc&pageSize=50`,
		);
		assert.deepEqual(labelsOf(desc.env.items), ["g5", "g3", "g4", "g2", "g6", "g1"]);

		const asc = await searchGigs(
			baseUrl,
			token,
			`${GIG_SCOPE}&status=all&sort=rate_asc&pageSize=50`,
		);
		assert.deepEqual(labelsOf(asc.env.items), ["g4", "g2", "g5", "g3", "g6", "g1"]);
	});
});

test("?sort=popular counts every swipe, likes and skips alike", async () => {
	const { hirer } = await setup();
	const category = `${MARKER}-popular`;
	const swiperOne = await makeUser(UserRole.artist, `${MARKER}-swiper-1`);
	const swiperTwo = await makeUser(UserRole.artist, `${MARKER}-swiper-2`);

	const quiet = await prisma.gig.create({
		data: { hirerId: hirer.id, title: "quiet", category },
	});
	const busy = await prisma.gig.create({
		data: { hirerId: hirer.id, title: "busy", category },
	});
	createdGigIds.push(quiet.id, busy.id);
	label.set(quiet.id, "quiet");
	label.set(busy.id, "busy");

	//	The busy gig's two swipes include a skip: popular must still rank it first.
	await prisma.swipe.createMany({
		data: [
			{ swiperId: swiperOne.id, swipedId: hirer.id, gigId: busy.id, liked: true },
			{ swiperId: swiperTwo.id, swipedId: hirer.id, gigId: busy.id, liked: false },
			{ swiperId: swiperOne.id, swipedId: hirer.id, gigId: quiet.id, liked: true },
		],
	});

	await withServer(async (baseUrl) => {
		const { env } = await searchGigs(
			baseUrl,
			tokenFor(hirer),
			`category=${category}&sort=popular&pageSize=50`,
		);

		assert.deepEqual(labelsOf(env.items), ["busy", "quiet"]);
	});
});

test("?sort=bogus is a 400 VALIDATION_ERROR", async () => {
	const { hirer } = await setup();

	await withServer(async (baseUrl) => {
		const { status, body } = await searchGigs(baseUrl, tokenFor(hirer), `${GIG_SCOPE}&sort=bogus`);

		assert.equal(status, 400);
		assert.equal(body?.error, "VALIDATION_ERROR");
	});
});

/* ------------------------------------------------------------------ */
/* Gig relevance                                                       */
/* ------------------------------------------------------------------ */

test("?sort=relevance puts every title match before every description-only match", async () => {
	const { hirer } = await setup();

	await withServer(async (baseUrl) => {
		const { env } = await searchGigs(
			baseUrl,
			tokenFor(hirer),
			`${GIG_SCOPE}&q=${TERM}&sort=relevance&pageSize=50`,
		);

		//	Bucket A is g6/g3/g1 by createdAt desc, bucket B is g5/g2.
		assert.deepEqual(labelsOf(env.items), ["g6", "g3", "g1", "g5", "g2"]);
	});
});

test("a gig matching q in both title and description appears once, in bucket A", async () => {
	const { hirer } = await setup();

	await withServer(async (baseUrl) => {
		const { env } = await searchGigs(
			baseUrl,
			tokenFor(hirer),
			`${GIG_SCOPE}&q=${TERM}&sort=relevance&pageSize=50`,
		);
		const labels = labelsOf(env.items);

		assert.equal(labels.filter((entry) => entry === "g3").length, 1);
		assert.ok(labels.indexOf("g3") < labels.indexOf("g5"));
	});
});

test("?sort=relevance paginates across the bucket seam without duplicates or gaps", async () => {
	const { hirer } = await setup();

	await withServer(async (baseUrl) => {
		const token = tokenFor(hirer);
		const expected = ["g6", "g3", "g1", "g5", "g2"];

		//	countA=3 and pageSize=2, so page 2 starts in A and ends in B.
		for (const pageSize of [1, 2, 3]) {
			const walked = await walkPages(
				baseUrl,
				token,
				"gigs",
				`${GIG_SCOPE}&q=${TERM}&sort=relevance`,
				pageSize,
			);
			assert.deepEqual(walked, expected, `walk mismatch at pageSize=${pageSize}`);
		}
	});
});

test("?sort=relevance returns the same total as ?sort=newest for identical filters", async () => {
	const { hirer } = await setup();

	await withServer(async (baseUrl) => {
		const token = tokenFor(hirer);
		const relevance = await searchGigs(
			baseUrl,
			token,
			`${GIG_SCOPE}&q=${TERM}&sort=relevance&pageSize=50`,
		);
		const newest = await searchGigs(baseUrl, token, `${GIG_SCOPE}&q=${TERM}&pageSize=50`);

		assert.equal(relevance.env.total, newest.env.total);
		assert.deepEqual(labelsOf(relevance.env.items).sort(), labelsOf(newest.env.items).sort());
	});
});

test("?sort=relevance without q falls back to newest instead of erroring", async () => {
	const { hirer } = await setup();

	await withServer(async (baseUrl) => {
		const token = tokenFor(hirer);
		const relevance = await searchGigs(
			baseUrl,
			token,
			`${GIG_SCOPE}&status=all&sort=relevance&pageSize=50`,
		);
		const newest = await searchGigs(baseUrl, token, `${GIG_SCOPE}&status=all&pageSize=50`);

		assert.equal(relevance.status, 200);
		assert.deepEqual(labelsOf(relevance.env.items), labelsOf(newest.env.items));
	});
});

/* ------------------------------------------------------------------ */
/* Artist search                                                       */
/* ------------------------------------------------------------------ */

test("an artist item carries user{username, avatarUrl} and never an email", async () => {
	const { caller } = await setup();

	await withServer(async (baseUrl) => {
		const { env } = await searchArtists(baseUrl, tokenFor(caller), `${ARTIST_SCOPE}&pageSize=1`);
		const item = env.items[0];

		assert.deepEqual(Object.keys(item).sort(), [
			"availability",
			"bio",
			"category",
			"createdAt",
			"id",
			"location",
			"user",
			"userId",
		]);
		assert.deepEqual(Object.keys(item.user as object).sort(), ["avatarUrl", "username"]);
	});
});

test("artist ?category=, ?location= and ?availability= each filter", async () => {
	const { caller } = await setup();

	await withServer(async (baseUrl) => {
		const token = tokenFor(caller);

		const byCategory = await searchArtists(baseUrl, token, `category=${ACAT_B}&pageSize=50`);
		assert.deepEqual(labelsOf(byCategory.env.items).sort(), ["a2", "a4"]);

		const byLocation = await searchArtists(baseUrl, token, `${ARTIST_SCOPE}&location=porto`);
		assert.deepEqual(labelsOf(byLocation.env.items).sort(), ["a2", "a3", "a5"]);

		const unavailable = await searchArtists(
			baseUrl,
			token,
			`${ARTIST_SCOPE}&availability=false&pageSize=50`,
		);
		assert.deepEqual(labelsOf(unavailable.env.items), ["a3"]);
	});
});

test("?availability=maybe is a 400 VALIDATION_ERROR", async () => {
	const { caller } = await setup();

	await withServer(async (baseUrl) => {
		const { status, body } = await searchArtists(
			baseUrl,
			tokenFor(caller),
			`${ARTIST_SCOPE}&availability=maybe`,
		);

		assert.equal(status, 400);
		assert.equal(body?.error, "VALIDATION_ERROR");
	});
});

test("the caller never appears in artist results, even matching q in both fields", async () => {
	const { caller } = await setup();

	await withServer(async (baseUrl) => {
		const token = tokenFor(caller);

		const unfiltered = await searchArtists(baseUrl, token, `${ARTIST_SCOPE}&pageSize=50`);
		assert.equal(labelsOf(unfiltered.env.items).includes("me"), false);

		const matching = await searchArtists(
			baseUrl,
			token,
			`${ARTIST_SCOPE}&q=${TERM}&sort=relevance&pageSize=50`,
		);
		assert.equal(labelsOf(matching.env.items).includes("me"), false);

		//	Another caller does see them, so the exclusion is per-request, not a filter
		//	on the row itself.
		const other = await searchArtists(
			baseUrl,
			tokenFor({ id: crypto.randomUUID(), role: UserRole.artist }),
			`${ARTIST_SCOPE}&pageSize=50`,
		);
		assert.equal(labelsOf(other.env.items).includes("me"), true);
	});
});

test("artist ?sort=relevance buckets username matches before bio-only matches", async () => {
	const { caller } = await setup();

	await withServer(async (baseUrl) => {
		const { env } = await searchArtists(
			baseUrl,
			tokenFor(caller),
			`${ARTIST_SCOPE}&q=${TERM}&sort=relevance&pageSize=50`,
		);

		assert.deepEqual(labelsOf(env.items), ["a5", "a2", "a1", "a4", "a3"]);
	});
});

test("artist relevance returns the same total as newest — bucket B drops nothing", async () => {
	const { caller } = await setup();

	await withServer(async (baseUrl) => {
		const token = tokenFor(caller);
		const relevance = await searchArtists(
			baseUrl,
			token,
			`${ARTIST_SCOPE}&q=${TERM}&sort=relevance&pageSize=50`,
		);
		const newest = await searchArtists(baseUrl, token, `${ARTIST_SCOPE}&q=${TERM}&pageSize=50`);

		assert.equal(relevance.env.total, newest.env.total);
		assert.deepEqual(labelsOf(relevance.env.items).sort(), labelsOf(newest.env.items).sort());
	});
});

test("artist ?sort=popular is a 400 naming gig search", async () => {
	const { caller } = await setup();

	await withServer(async (baseUrl) => {
		const { status, body } = await searchArtists(
			baseUrl,
			tokenFor(caller),
			`${ARTIST_SCOPE}&sort=popular`,
		);

		assert.equal(status, 400);
		assert.equal(body?.error, "VALIDATION_ERROR");
		assert.match(String(body?.message), /gig/i);
	});
});

test("artist ?sort=rate_desc is a 400 listing only the artist sorts", async () => {
	const { caller } = await setup();

	await withServer(async (baseUrl) => {
		const { status, body } = await searchArtists(
			baseUrl,
			tokenFor(caller),
			`${ARTIST_SCOPE}&sort=rate_desc`,
		);

		assert.equal(status, 400);
		assert.equal(String(body?.message), "sort must be one of: newest, oldest, relevance");
	});
});

test("artist ?minRate= is ignored rather than rejected", async () => {
	const { caller } = await setup();

	await withServer(async (baseUrl) => {
		const token = tokenFor(caller);
		const withRate = await searchArtists(
			baseUrl,
			token,
			`${ARTIST_SCOPE}&minRate=999&maxRate=1&pageSize=50`,
		);
		const without = await searchArtists(baseUrl, token, `${ARTIST_SCOPE}&pageSize=50`);

		//	minRate > maxRate would be a 400 on gig search; here both are unread.
		assert.equal(withRate.status, 200);
		assert.deepEqual(labelsOf(withRate.env.items), labelsOf(without.env.items));
	});
});
