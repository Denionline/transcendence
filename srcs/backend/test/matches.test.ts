import "./setup.js";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import type { Server } from "socket.io";

import app from "../src/app.js";
import { initWebsocket } from "../src/modules/websocket/websocket.gateway.js";
import { SECRET } from "../src/lib/env.js";
import { prisma } from "../src/lib/prisma.js";
import { UserRole } from "../generated/prisma/client.js";
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

//	Unlike withServer, this also wires up the WebSocket gateway on the same
//	HTTP server, so a real socket connection is reflected by isUserOnline —
//	needed to test otherUser.online against a live socket, not a mock.
async function withLiveServer<T>(run: (baseUrl: string, io: Server) => Promise<T>): Promise<T> {
	const httpServer = createServer(app);
	const io = initWebsocket(httpServer);
	await new Promise<void>((resolve) => httpServer.listen(0, resolve));
	const { port } = httpServer.address() as AddressInfo;
	try {
		return await run(`http://localhost:${port}`, io);
	} finally {
		await io.close();
	}
}

//	isUserOnline requires the socket to have joined the match's own room, not
//	just its personal one — "connect" fires before that join finishes, so
//	tests must poll server-side room state instead of racing the client event.
function waitUntil(predicate: () => boolean, timeoutMs = 2000, intervalMs = 20): Promise<void> {
	return new Promise((resolve, reject) => {
		const start = Date.now();
		const tick = () => {
			if (predicate()) return resolve();
			if (Date.now() - start > timeoutMs)
				return reject(new Error("timed out waiting for condition"));
			setTimeout(tick, intervalMs);
		};
		tick();
	});
}

function connectClient(baseUrl: string, token: string): ClientSocket {
	return ioClient(baseUrl, {
		auth: { token },
		reconnection: false,
		forceNew: true,
		transports: ["websocket"],
	});
}

function waitForEvent(socket: ClientSocket, event: string, timeoutMs = 2000): Promise<void> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(
			() => reject(new Error(`timed out waiting for "${event}"`)),
			timeoutMs,
		);
		socket.once(event, () => {
			clearTimeout(timer);
			resolve();
		});
	});
}

function tokenFor(user: { id: string; role: UserRole }): string {
	return jwt.sign({ userId: user.id, role: user.role, sessionId: crypto.randomUUID() }, SECRET, {
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

async function makeUser(role: UserRole, username = "matches-test") {
	const user = await prisma.user.create({
		data: {
			email: `matches-test-${crypto.randomUUID()}@test.local`,
			username,
			role,
		},
	});
	createdUserIds.push(user.id);
	return user;
}

async function makeArtist(categories: string[]) {
	const user = await makeUser(UserRole.artist);
	await prisma.artistProfile.create({
		data: { userId: user.id, availability: true, ...(await artistCategories(categories)) },
	});
	return user;
}

async function makeHirer(organizationName = "Matches Test Org") {
	const user = await makeUser(UserRole.hirer);
	await prisma.hirerProfile.create({
		data: { userId: user.id, organizationName, availability: true },
	});
	return user;
}

async function makeGig(hirer: { id: string }, category: string) {
	return await prisma.gig.create({
		data: {
			hirerId: hirer.id,
			title: "matches-test gig",
			...(await gigCategory(category)),
		},
	});
}

function uniqueCategory() {
	return `matches-test-${crypto.randomUUID()}`;
}

//	Swipes both ways for the same gig, so a Match row exists to test against.
async function makeMatch(organizationName = "Matches Test Org") {
	const category = uniqueCategory();
	const artist = await makeArtist([category]);
	const hirer = await makeHirer(organizationName);
	const gig = await makeGig(hirer, category);

	await withServer(async (baseUrl) => {
		await api(baseUrl, "POST", "/api/swipes", {
			token: tokenFor(hirer),
			body: { gigId: gig.id, liked: true, targetUserId: artist.id },
		});
		await api(baseUrl, "POST", "/api/swipes", {
			token: tokenFor(artist),
			body: { gigId: gig.id, liked: true },
		});
	});

	const match = await prisma.match.findFirstOrThrow({
		where: { gigId: gig.id, artistId: artist.id },
	});
	return { artist, hirer, gig, match };
}

test("GET /api/matches gives an artist the hirer's org name (otherUser) and gig", async () => {
	const { artist, gig, match } = await makeMatch("Matches Test Org 2");

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "GET", "/api/matches", { token: tokenFor(artist) });
		assert.equal(status, 200);
		const items = body!.items as Record<string, unknown>[];
		const entry = items.find((item) => item.matchId === match.id);
		assert.ok(entry, "match not found in response");
		const otherUser = entry!.otherUser as Record<string, unknown>;
		assert.equal(otherUser.displayName, "Matches Test Org 2");
		assert.equal(otherUser.online, false);
		const gigBody = entry!.gig as Record<string, unknown>;
		assert.equal(gigBody.id, gig.id);
		assert.equal(gigBody.title, gig.title);
	});
});

test("GET /api/matches gives a hirer the artist's username as otherUser", async () => {
	const { artist, hirer, match } = await makeMatch();

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "GET", "/api/matches", { token: tokenFor(hirer) });
		assert.equal(status, 200);
		const items = body!.items as Record<string, unknown>[];
		const entry = items.find((item) => item.matchId === match.id);
		assert.ok(entry, "match not found in response");
		const otherUser = entry!.otherUser as Record<string, unknown>;
		assert.equal(otherUser.id, artist.id);
		assert.equal(otherUser.displayName, artist.username);
	});
});

test("otherUser.online reflects a live socket connection, not a cached flag", async () => {
	const { artist, hirer, match } = await makeMatch("Matches Test Org 3");

	await withLiveServer(async (baseUrl, io) => {
		const offlineCheck = await api(baseUrl, "GET", "/api/matches", { token: tokenFor(hirer) });
		const offlineEntry = (offlineCheck.body!.items as Record<string, unknown>[]).find(
			(item) => item.matchId === match.id,
		);
		assert.equal((offlineEntry!.otherUser as Record<string, unknown>).online, false);

		const artistSocket = connectClient(baseUrl, tokenFor(artist));
		try {
			await waitForEvent(artistSocket, "connect");
			//	"connect" fires before the server finishes joining chat:<matchId> —
			//	isUserOnline requires that join too, so wait for it here.
			await waitUntil(() => (io.sockets.adapter.rooms.get(`chat:${match.id}`)?.size ?? 0) === 1);

			const onlineCheck = await api(baseUrl, "GET", "/api/matches", { token: tokenFor(hirer) });
			const onlineEntry = (onlineCheck.body!.items as Record<string, unknown>[]).find(
				(item) => item.matchId === match.id,
			);
			assert.equal((onlineEntry!.otherUser as Record<string, unknown>).online, true);
		} finally {
			artistSocket.close();
		}
	});
});

test("GET /api/matches only returns matches belonging to the caller", async () => {
	const { hirer: ownHirer } = await makeMatch();
	const stranger = await makeHirer();

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "GET", "/api/matches", {
			token: tokenFor(stranger),
		});
		assert.equal(status, 200);
		assert.equal(body?.total, 0);
	});

	assert.notEqual(ownHirer.id, stranger.id);
});

test("GET /api/matches?gigId filters a hirer's matches to one gig", async () => {
	const category = uniqueCategory();
	const hirer = await makeHirer();
	const firstArtist = await makeArtist([category]);
	const secondArtist = await makeArtist([category]);
	const firstGig = await makeGig(hirer, category);
	const secondGig = await makeGig(hirer, category);

	await withServer(async (baseUrl) => {
		for (const [artist, gig] of [
			[firstArtist, firstGig],
			[secondArtist, secondGig],
		] as const) {
			await api(baseUrl, "POST", "/api/swipes", {
				token: tokenFor(hirer),
				body: { gigId: gig.id, liked: true, targetUserId: artist.id },
			});
			await api(baseUrl, "POST", "/api/swipes", {
				token: tokenFor(artist),
				body: { gigId: gig.id, liked: true },
			});
		}

		const { status, body } = await api(baseUrl, "GET", `/api/matches?gigId=${firstGig.id}`, {
			token: tokenFor(hirer),
		});
		assert.equal(status, 200);
		assert.equal(body?.total, 1);
		const items = body!.items as Record<string, unknown>[];
		assert.equal((items[0]!.gig as Record<string, unknown>).id, firstGig.id);
	});
});

test("GET /api/matches requires authentication (401 without a token)", async () => {
	await withServer(async (baseUrl) => {
		const { status } = await api(baseUrl, "GET", "/api/matches");
		assert.equal(status, 401);
	});
});

test("GET /api/matches/:id returns a single match for a participant", async () => {
	const { artist, match } = await makeMatch();

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "GET", `/api/matches/${match.id}`, {
			token: tokenFor(artist),
		});
		assert.equal(status, 200);
		assert.equal(body?.matchId, match.id);
	});
});

test("GET /api/matches/:id rejects a non-participant (403 FORBIDDEN)", async () => {
	const { match } = await makeMatch();
	const stranger = await makeHirer();

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "GET", `/api/matches/${match.id}`, {
			token: tokenFor(stranger),
		});
		assert.equal(status, 403);
		assert.equal(body?.error, "FORBIDDEN");
	});
});

test("GET /api/matches/:id on an unknown id (404 MATCH_NOT_FOUND)", async () => {
	const hirer = await makeHirer();

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "GET", "/api/matches/does-not-exist", {
			token: tokenFor(hirer),
		});
		assert.equal(status, 404);
		assert.equal(body?.error, "MATCH_NOT_FOUND");
	});
});

test("DELETE /api/matches/:id unmatches and cascades its messages", async () => {
	const { artist, match } = await makeMatch();
	await prisma.chatMessage.create({
		data: { matchId: match.id, senderId: artist.id, content: "hi" },
	});

	await withServer(async (baseUrl) => {
		const { status } = await api(baseUrl, "DELETE", `/api/matches/${match.id}`, {
			token: tokenFor(artist),
		});
		assert.equal(status, 204);
	});

	assert.equal(await prisma.match.findUnique({ where: { id: match.id } }), null);
	assert.equal(await prisma.chatMessage.count({ where: { matchId: match.id } }), 0);
});

test("DELETE /api/matches/:id rejects a non-participant (403 FORBIDDEN)", async () => {
	const { match } = await makeMatch();
	const stranger = await makeHirer();

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "DELETE", `/api/matches/${match.id}`, {
			token: tokenFor(stranger),
		});
		assert.equal(status, 403);
		assert.equal(body?.error, "FORBIDDEN");
	});

	assert.notEqual(await prisma.match.findUnique({ where: { id: match.id } }), null);
});

test("DELETE /api/matches/:id on an unknown id (404 MATCH_NOT_FOUND)", async () => {
	const hirer = await makeHirer();

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "DELETE", "/api/matches/does-not-exist", {
			token: tokenFor(hirer),
		});
		assert.equal(status, 404);
		assert.equal(body?.error, "MATCH_NOT_FOUND");
	});
});

test("DELETE /api/matches/:id requires authentication (401 without a token)", async () => {
	const { match } = await makeMatch();

	await withServer(async (baseUrl) => {
		const { status } = await api(baseUrl, "DELETE", `/api/matches/${match.id}`);
		assert.equal(status, 401);
	});
});
