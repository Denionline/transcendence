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
import { cleanupCategories, gigCategory } from "./helpers/categories.js";

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
//	needed to test counterpartOnline against a live socket, not a mock.
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

//	isUserOnline now requires the socket to have joined the match's own room,
//	not just its personal one — "connect" fires before that join finishes, so
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

function tokenFor(user: { id: string; role: UserRole }): string {
	return jwt.sign({ userId: user.id, role: user.role, sessionId: crypto.randomUUID() }, SECRET, {
		algorithm: "HS256",
		expiresIn: "15m",
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

async function api(
	baseUrl: string,
	method: string,
	path: string,
	options: { token?: string } = {},
) {
	const headers: Record<string, string> = {};
	if (options.token) headers.Authorization = `Bearer ${options.token}`;

	const res = await fetch(`${baseUrl}${path}`, { method, headers });
	const text = await res.text();
	const json = text ? (JSON.parse(text) as Record<string, unknown>) : null;
	return { status: res.status, body: json };
}

const createdUserIds: string[] = [];

async function makeUser(role: UserRole) {
	const user = await prisma.user.create({
		data: {
			email: `matches-test-${crypto.randomUUID()}@test.local`,
			username: `matches-test-${crypto.randomUUID().slice(0, 8)}`,
			role,
		},
	});
	createdUserIds.push(user.id);
	return user;
}

async function makeMatch(organizationName: string) {
	const artist = await makeUser(UserRole.artist);
	const hirer = await makeUser(UserRole.hirer);
	await prisma.hirerProfile.create({
		data: { userId: hirer.id, organizationName },
	});
	const gig = await prisma.gig.create({
		data: {
			hirerId: hirer.id,
			title: "matches-test gig",
			...(await gigCategory("matches-test category")),
		},
	});
	const match = await prisma.match.create({ data: { artistId: artist.id, gigId: gig.id } });
	return { artist, hirer, match };
}

//	Every HirerProfile/Gig/Match row hangs off a User by a cascading relation
//	(see 20260725134217_user_delete_cascade), so deleting the users is enough.
after(async () => {
	await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
	await cleanupCategories();
	await prisma.$disconnect();
});

test("GET /api/matches requires authentication", async () => {
	await withServer(async (baseUrl) => {
		const { status } = await api(baseUrl, "GET", "/api/matches");
		assert.equal(status, 401);
	});
});

test("an artist sees the hirer's organization name as the counterpart", async () => {
	const { artist, hirer, match } = await makeMatch("Matches Test Org");

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "GET", "/api/matches", {
			token: tokenFor(artist),
		});
		assert.equal(status, 200);
		const items = body!.items as Record<string, unknown>[];
		const entry = items.find((item) => item.matchId === match.id);
		assert.ok(entry, "match not found in response");
		const otherUser = entry!.otherUser as Record<string, unknown>;
		assert.equal(otherUser.id, hirer.id);
		assert.equal(otherUser.displayName, "Matches Test Org");
		assert.equal(otherUser.online, false);
		const gig = entry!.gig as Record<string, unknown>;
		assert.equal(gig.title, "matches-test gig");
	});
});

test("a hirer sees the artist's username as the counterpart", async () => {
	const { artist, hirer, match } = await makeMatch("Matches Test Org 2");

	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "GET", "/api/matches", {
			token: tokenFor(hirer),
		});
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
			//	isUserOnline now requires that join too, so wait for it here.
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
