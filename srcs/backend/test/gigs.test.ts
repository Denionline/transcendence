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

const createdUserIds: string[] = [];
const createdGigIds: string[] = [];

async function makeUser(role: UserRole = UserRole.artist) {
	const user = await prisma.user.create({
		data: {
			email: `gigs-test-${crypto.randomUUID()}@test.local`,
			username: "gigs-test",
			role,
		},
	});
	createdUserIds.push(user.id);
	return user;
}

type GigOverrides = Partial<{
	title: string;
	description: string | null;
	category: string;
	location: string | null;
	rate: number | null;
	status: GigStatus;
}>;

async function makeGig(hirer: { id: string }, overrides: GigOverrides = {}) {
	const gig = await prisma.gig.create({
		data: {
			hirerId: hirer.id,
			title: overrides.title ?? "gigs-test gig",
			category: overrides.category ?? "music",
			...overrides,
		},
	});
	createdGigIds.push(gig.id);
	return gig;
}

after(async () => {
	await prisma.gig.deleteMany({ where: { id: { in: createdGigIds } } });
	await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
	await prisma.$disconnect();
});

test("GET /api/gigs/:id returns the gig to any logged-in user (not owner-gated)", async () => {
	const hirer = await makeUser(UserRole.hirer);
	const artist = await makeUser(UserRole.artist);
	const gig = await makeGig(hirer, { title: "Jazz night", category: "music" });

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "GET", `/api/gigs/${gig.id}`, {
			token: tokenFor(artist),
		});

		assert.equal(status, 200);
		assert.equal(body?.id, gig.id);
		assert.equal(body?.hirerId, hirer.id);
		assert.equal(body?.title, "Jazz night");
		assert.equal(body?.category, "music");
		assert.equal(body?.status, "open"); // GigStatus defaults to `open`
	});
});

test("GET /api/gigs/:id returns 404 GIG_NOT_FOUND for an unknown id", async () => {
	const artist = await makeUser(UserRole.artist);

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "GET", `/api/gigs/${crypto.randomUUID()}`, {
			token: tokenFor(artist),
		});

		assert.equal(status, 404);
		assert.equal(body?.error, "GIG_NOT_FOUND");
	});
});

test("GET /api/gigs/:id requires authentication (401 without a token)", async () => {
	const hirer = await makeUser(UserRole.hirer);
	const gig = await makeGig(hirer);

	await withServer(async (baseUrl) => {
		const { status } = await api(baseUrl, "GET", `/api/gigs/${gig.id}`);
		assert.equal(status, 401);
	});
});

test("GET /api/gigs/:id rejects a malformed token (401)", async () => {
	const hirer = await makeUser(UserRole.hirer);
	const gig = await makeGig(hirer);

	await withServer(async (baseUrl) => {
		const { status } = await api(baseUrl, "GET", `/api/gigs/${gig.id}`, { token: "garbage" });
		assert.equal(status, 401);
	});
});

test("POST /api/gigs lets a hirer create a gig (201, owned by the caller, defaults to open)", async () => {
	const hirer = await makeUser(UserRole.hirer);

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "POST", "/api/gigs", {
			token: tokenFor(hirer),
			body: { title: "Wedding band", category: "music", rate: 500 },
		});

		assert.equal(status, 201);
		assert.equal(body?.hirerId, hirer.id);
		assert.equal(body?.title, "Wedding band");
		assert.equal(body?.category, "music");
		assert.equal(body?.rate, 500);
		assert.equal(body?.status, "open");
		if (typeof body?.id === "string") createdGigIds.push(body.id);
	});
});

test("POST /api/gigs forbids an artist from creating a gig (403)", async () => {
	const artist = await makeUser(UserRole.artist);

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "POST", "/api/gigs", {
			token: tokenFor(artist),
			body: { title: "Wedding band", category: "music" },
		});

		assert.equal(status, 403);
		assert.equal(body?.error, "FORBIDDEN");
	});
});

test("POST /api/gigs rejects a missing title (400 VALIDATION_ERROR)", async () => {
	const hirer = await makeUser(UserRole.hirer);

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "POST", "/api/gigs", {
			token: tokenFor(hirer),
			body: { category: "music" },
		});

		assert.equal(status, 400);
		assert.equal(body?.error, "VALIDATION_ERROR");
	});
});

test("POST /api/gigs rejects a missing category (400 VALIDATION_ERROR)", async () => {
	const hirer = await makeUser(UserRole.hirer);

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "POST", "/api/gigs", {
			token: tokenFor(hirer),
			body: { title: "Wedding band" },
		});

		assert.equal(status, 400);
		assert.equal(body?.error, "VALIDATION_ERROR");
	});
});

test("POST /api/gigs rejects a negative or non-integer rate (400 VALIDATION_ERROR)", async () => {
	const hirer = await makeUser(UserRole.hirer);

	await withServer(async (baseUrl) => {
		const negative = await api(baseUrl, "POST", "/api/gigs", {
			token: tokenFor(hirer),
			body: { title: "x", category: "music", rate: -5 },
		});
		assert.equal(negative.status, 400);
		assert.equal(negative.body?.error, "VALIDATION_ERROR");

		const fractional = await api(baseUrl, "POST", "/api/gigs", {
			token: tokenFor(hirer),
			body: { title: "x", category: "music", rate: 12.5 },
		});
		assert.equal(fractional.status, 400);
		assert.equal(fractional.body?.error, "VALIDATION_ERROR");
	});
});

test("POST /api/gigs ignores a hirerId in the body — the owner is always the caller", async () => {
	const hirer = await makeUser(UserRole.hirer);
	const otherHirer = await makeUser(UserRole.hirer);

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "POST", "/api/gigs", {
			token: tokenFor(hirer),
			body: { title: "Wedding band", category: "music", hirerId: otherHirer.id },
		});

		assert.equal(status, 201);
		assert.equal(body?.hirerId, hirer.id); // NOT otherHirer.id
		if (typeof body?.id === "string") createdGigIds.push(body.id);
	});
});
