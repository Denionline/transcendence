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

//	Needed only for the test that proves POST also reaches an already-connected
//	socket — everything else only exercises the HTTP side.
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

function waitForEvent<T = unknown>(
	socket: ClientSocket,
	event: string,
	timeoutMs = 2000,
): Promise<T> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(
			() => reject(new Error(`timed out waiting for "${event}"`)),
			timeoutMs,
		);
		socket.once(event, (payload: T) => {
			clearTimeout(timer);
			resolve(payload);
		});
	});
}

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

async function api(
	baseUrl: string,
	method: string,
	path: string,
	options: { token?: string; body?: unknown } = {},
) {
	const headers: Record<string, string> = {};
	if (options.token) headers.Authorization = `Bearer ${options.token}`;
	if (options.body !== undefined) headers["Content-Type"] = "application/json";

	const res = await fetch(`${baseUrl}${path}`, {
		method,
		headers,
		body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
	});
	const text = await res.text();
	const json = text ? (JSON.parse(text) as Record<string, unknown>) : null;
	return { status: res.status, body: json };
}

const createdUserIds: string[] = [];

async function makeUser(role: UserRole) {
	const user = await prisma.user.create({
		data: {
			email: `messages-test-${crypto.randomUUID()}@test.local`,
			username: `messages-test-${crypto.randomUUID().slice(0, 8)}`,
			role,
		},
	});
	createdUserIds.push(user.id);
	return user;
}

async function makeMatch() {
	const artist = await makeUser(UserRole.artist);
	const hirer = await makeUser(UserRole.hirer);
	const gig = await prisma.gig.create({
		data: {
			hirerId: hirer.id,
			title: "messages-test gig",
			...(await gigCategory("messages-test category")),
		},
	});
	const match = await prisma.match.create({ data: { artistId: artist.id, gigId: gig.id } });
	return { artist, hirer, match };
}

//	Every Gig/Match/ChatMessage row hangs off a User by a cascading relation
//	(see 20260725134217_user_delete_cascade), so deleting the users is enough.
after(async () => {
	await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
	await cleanupCategories();
	await prisma.$disconnect();
});

test("GET .../messages requires authentication", async () => {
	const { match } = await makeMatch();
	await withServer(async (baseUrl) => {
		const { status } = await api(baseUrl, "GET", `/api/matches/${match.id}/messages`);
		assert.equal(status, 401);
	});
});

test("GET .../messages rejects a caller who isn't a match participant", async () => {
	const { match } = await makeMatch();
	const outsider = await makeUser(UserRole.artist);
	await withServer(async (baseUrl) => {
		const { status } = await api(baseUrl, "GET", `/api/matches/${match.id}/messages`, {
			token: tokenFor(outsider),
		});
		assert.equal(status, 404);
	});
});

test("GET .../messages returns paginated history, newest first", async () => {
	const { artist, hirer, match } = await makeMatch();
	//	Explicit, well-separated createdAt values — three sequential creates can
	//	land in the same millisecond, which would make DESC ordering ambiguous.
	const base = Date.now();
	await prisma.chatMessage.create({
		data: {
			matchId: match.id,
			senderId: artist.id,
			content: "first",
			createdAt: new Date(base),
		},
	});
	await prisma.chatMessage.create({
		data: {
			matchId: match.id,
			senderId: hirer.id,
			content: "second",
			createdAt: new Date(base + 1000),
		},
	});
	await prisma.chatMessage.create({
		data: {
			matchId: match.id,
			senderId: artist.id,
			content: "third",
			createdAt: new Date(base + 2000),
		},
	});

	await withServer(async (baseUrl) => {
		const { status, body } = await api(
			baseUrl,
			"GET",
			`/api/matches/${match.id}/messages?pageSize=2`,
			{ token: tokenFor(artist) },
		);
		assert.equal(status, 200);
		const items = body!.items as Record<string, unknown>[];
		assert.equal(items.length, 2);
		assert.equal(items[0]!.content, "third");
		assert.equal(items[1]!.content, "second");
		assert.equal(body!.total, 3);
		assert.equal(body!.hasMore, true);
	});
});

test("POST .../messages requires authentication", async () => {
	const { match } = await makeMatch();
	await withServer(async (baseUrl) => {
		const { status } = await api(baseUrl, "POST", `/api/matches/${match.id}/messages`, {
			body: { content: "hello" },
		});
		assert.equal(status, 401);
	});
});

test("POST .../messages rejects a caller who isn't a match participant", async () => {
	const { match } = await makeMatch();
	const outsider = await makeUser(UserRole.artist);
	await withServer(async (baseUrl) => {
		const { status } = await api(baseUrl, "POST", `/api/matches/${match.id}/messages`, {
			token: tokenFor(outsider),
			body: { content: "hello" },
		});
		assert.equal(status, 404);
	});
});

test("POST .../messages rejects empty content", async () => {
	const { artist, match } = await makeMatch();
	await withServer(async (baseUrl) => {
		const { status } = await api(baseUrl, "POST", `/api/matches/${match.id}/messages`, {
			token: tokenFor(artist),
			body: { content: "" },
		});
		assert.equal(status, 400);
	});
});

test("POST .../messages rejects content over 2000 characters", async () => {
	const { artist, match } = await makeMatch();
	await withServer(async (baseUrl) => {
		const { status } = await api(baseUrl, "POST", `/api/matches/${match.id}/messages`, {
			token: tokenFor(artist),
			body: { content: "a".repeat(2001) },
		});
		assert.equal(status, 400);
	});
});

test("POST .../messages persists the message and responds with its id", async () => {
	const { artist, match } = await makeMatch();
	await withServer(async (baseUrl) => {
		const { status, body } = await api(baseUrl, "POST", `/api/matches/${match.id}/messages`, {
			token: tokenFor(artist),
			body: { content: "rest-test hello" },
		});
		assert.equal(status, 201);
		assert.ok(body!.chatMessageId);

		const stored = await prisma.chatMessage.findUnique({
			where: { id: body!.chatMessageId as string },
		});
		assert.equal(stored?.matchId, match.id);
		assert.equal(stored?.senderId, artist.id);
		assert.equal(stored?.content, "rest-test hello");
	});
});

test("POST .../messages reaches the other participant's open socket, with the same id as the HTTP response", async () => {
	const { artist, hirer, match } = await makeMatch();

	await withLiveServer(async (baseUrl, io) => {
		const hirerSocket = connectClient(baseUrl, tokenFor(hirer));
		try {
			await waitForEvent(hirerSocket, "connect");
			await waitUntil(() => (io.sockets.adapter.rooms.get(`chat:${match.id}`)?.size ?? 0) === 1);

			const messagePromise = waitForEvent<{
				matchId: string;
				senderId: string;
				content: string;
				chatMessageId: string;
			}>(hirerSocket, "new_message");

			const { status, body } = await api(baseUrl, "POST", `/api/matches/${match.id}/messages`, {
				token: tokenFor(artist),
				body: { content: "rest-test live" },
			});
			assert.equal(status, 201);

			const payload = await messagePromise;
			assert.equal(payload.matchId, match.id);
			assert.equal(payload.senderId, artist.id);
			assert.equal(payload.content, "rest-test live");
			assert.equal(payload.chatMessageId, body!.chatMessageId);
		} finally {
			hirerSocket.close();
		}
	});
});
