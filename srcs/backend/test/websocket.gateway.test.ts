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
import { authEvents } from "../src/lib/auth-events.js";
import { SECRET } from "../src/lib/env.js";
import { prisma } from "../src/lib/prisma.js";
import { UserRole } from "../generated/prisma/client.js";
import { cleanupCategories, gigCategory } from "./helpers/categories.js";

async function withServer<T>(run: (baseUrl: string, io: Server) => Promise<T>): Promise<T> {
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

function connectClient(baseUrl: string, token?: string): ClientSocket {
	return ioClient(baseUrl, {
		auth: token ? { token } : {},
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

//	A negative assertion: the event must not fire within the window. Used to
//	prove a silently-dropped message or a non-broadcast to the sender.
function expectNoEvent(socket: ClientSocket, event: string, timeoutMs = 500): Promise<void> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(resolve, timeoutMs);
		socket.once(event, () => {
			clearTimeout(timer);
			reject(new Error(`unexpected "${event}" event`));
		});
	});
}

//	Room membership is only observable server-side, so polling the adapter is
//	the deterministic way to know a socket has finished joining before the
//	next actor connects — avoiding a race against the async matches lookup.
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

const createdUserIds: string[] = [];

async function makeUser(role: UserRole) {
	const user = await prisma.user.create({
		data: {
			email: `ws-test-${crypto.randomUUID()}@test.local`,
			username: "ws-test",
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
		data: { hirerId: hirer.id, title: "ws-test gig", ...(await gigCategory("ws-test category")) },
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

test("connecting without a token is rejected", async () => {
	await withServer(async (baseUrl) => {
		const socket = connectClient(baseUrl);
		try {
			const err = await waitForEvent<Error>(socket, "connect_error");
			assert.equal(err.message, "unauthorized");
			assert.equal(socket.connected, false);
		} finally {
			socket.close();
		}
	});
});

test("connecting with a malformed token is rejected", async () => {
	await withServer(async (baseUrl) => {
		const socket = connectClient(baseUrl, "not-a-real-token");
		try {
			const err = await waitForEvent<Error>(socket, "connect_error");
			assert.equal(err.message, "unauthorized");
		} finally {
			socket.close();
		}
	});
});

test("connecting with an expired token is rejected", async () => {
	const artist = await makeUser(UserRole.artist);
	const expired = jwt.sign({ userId: artist.id, role: artist.role }, SECRET, {
		algorithm: "HS256",
		expiresIn: -10,
	});

	await withServer(async (baseUrl) => {
		const socket = connectClient(baseUrl, expired);
		try {
			const err = await waitForEvent<Error>(socket, "connect_error");
			assert.equal(err.message, "unauthorized");
		} finally {
			socket.close();
		}
	});
});

test("connecting with a role that has no chat access is rejected", async () => {
	const admin = await makeUser(UserRole.admin);

	await withServer(async (baseUrl) => {
		const socket = connectClient(baseUrl, tokenFor(admin));
		try {
			const err = await waitForEvent<Error>(socket, "connect_error");
			assert.equal(err.message, "role not supported for chat");
		} finally {
			socket.close();
		}
	});
});

test("a valid token is accepted", async () => {
	const artist = await makeUser(UserRole.artist);

	await withServer(async (baseUrl) => {
		const socket = connectClient(baseUrl, tokenFor(artist));
		try {
			await waitForEvent(socket, "connect");
			assert.equal(socket.connected, true);
		} finally {
			socket.close();
		}
	});
});

test("connecting notifies the other match participant that they're online", async () => {
	const { artist, hirer, match } = await makeMatch();

	await withServer(async (baseUrl, io) => {
		const hirerSocket = connectClient(baseUrl, tokenFor(hirer));
		try {
			await waitForEvent(hirerSocket, "connect");
			await waitUntil(() => io.sockets.adapter.rooms.has(`chat:${match.id}`));

			const onlinePromise = waitForEvent<{ userId: string }>(hirerSocket, "user_online");
			const artistSocket = connectClient(baseUrl, tokenFor(artist));
			try {
				const payload = await onlinePromise;
				assert.equal(payload.userId, artist.id);
			} finally {
				artistSocket.close();
			}
		} finally {
			hirerSocket.close();
		}
	});
});

test("disconnecting notifies the other match participant that they've gone offline", async () => {
	const { artist, hirer, match } = await makeMatch();

	await withServer(async (baseUrl, io) => {
		const hirerSocket = connectClient(baseUrl, tokenFor(hirer));
		const artistSocket = connectClient(baseUrl, tokenFor(artist));
		try {
			await Promise.all([
				waitForEvent(hirerSocket, "connect"),
				waitForEvent(artistSocket, "connect"),
			]);
			await waitUntil(() => (io.sockets.adapter.rooms.get(`chat:${match.id}`)?.size ?? 0) === 2);

			const offlinePromise = waitForEvent<{ userId: string }>(hirerSocket, "user_offline");
			artistSocket.close();
			const payload = await offlinePromise;

			assert.equal(payload.userId, artist.id);
		} finally {
			hirerSocket.close();
			artistSocket.close();
		}
	});
});

test("a socket outside the match silently cannot send a message into its room", async () => {
	const { match } = await makeMatch();
	const outsider = await makeUser(UserRole.artist);

	await withServer(async (baseUrl) => {
		const socket = connectClient(baseUrl, tokenFor(outsider));
		try {
			await waitForEvent(socket, "connect");

			const noError = expectNoEvent(socket, "message_error");
			socket.emit("send_message", { matchId: match.id, content: "ws-test intrusion" });
			await noError;

			const count = await prisma.chatMessage.count({ where: { matchId: match.id } });
			assert.equal(count, 0);
		} finally {
			socket.close();
		}
	});
});

test("a match participant's message is persisted and broadcast to the other participant", async () => {
	const { artist, hirer, match } = await makeMatch();

	await withServer(async (baseUrl, io) => {
		const hirerSocket = connectClient(baseUrl, tokenFor(hirer));
		const artistSocket = connectClient(baseUrl, tokenFor(artist));
		try {
			await Promise.all([
				waitForEvent(hirerSocket, "connect"),
				waitForEvent(artistSocket, "connect"),
			]);
			await waitUntil(() => (io.sockets.adapter.rooms.get(`chat:${match.id}`)?.size ?? 0) === 2);

			const messagePromise = waitForEvent<{ matchId: string; senderId: string; content: string }>(
				hirerSocket,
				"new_message",
			);
			artistSocket.emit("send_message", { matchId: match.id, content: "ws-test hello" });
			const payload = await messagePromise;

			assert.equal(payload.matchId, match.id);
			assert.equal(payload.senderId, artist.id);
			assert.equal(payload.content, "ws-test hello");

			const stored = await prisma.chatMessage.findFirst({ where: { matchId: match.id } });
			assert.equal(stored?.senderId, artist.id);
			assert.equal(stored?.content, "ws-test hello");
		} finally {
			hirerSocket.close();
			artistSocket.close();
		}
	});
});

test("the sender does not receive its own broadcasted message", async () => {
	const { artist, hirer, match } = await makeMatch();

	await withServer(async (baseUrl, io) => {
		const hirerSocket = connectClient(baseUrl, tokenFor(hirer));
		const artistSocket = connectClient(baseUrl, tokenFor(artist));
		try {
			await Promise.all([
				waitForEvent(hirerSocket, "connect"),
				waitForEvent(artistSocket, "connect"),
			]);
			await waitUntil(() => (io.sockets.adapter.rooms.get(`chat:${match.id}`)?.size ?? 0) === 2);

			const noEcho = expectNoEvent(artistSocket, "new_message");
			artistSocket.emit("send_message", { matchId: match.id, content: "ws-test no-echo" });
			await noEcho;
		} finally {
			hirerSocket.close();
			artistSocket.close();
		}
	});
});

test("a match created while both participants are already connected joins them to its room live", async () => {
	const artist = await makeUser(UserRole.artist);
	const hirer = await makeUser(UserRole.hirer);
	const gig = await prisma.gig.create({
		data: { hirerId: hirer.id, title: "ws-test gig", ...(await gigCategory("ws-test category")) },
	});

	await withServer(async (baseUrl, io) => {
		const hirerSocket = connectClient(baseUrl, tokenFor(hirer));
		const artistSocket = connectClient(baseUrl, tokenFor(artist));
		try {
			await Promise.all([
				waitForEvent(hirerSocket, "connect"),
				waitForEvent(artistSocket, "connect"),
			]);

			//	Neither socket has this match's room yet — it did not exist when
			//	either of them connected. authEvents.emit stands in for the
			//	validateMatch call that creates the row in the real swipe flow.
			const match = await prisma.match.create({ data: { artistId: artist.id, gigId: gig.id } });
			const newMatchPromise = waitForEvent<{ matchId: string }>(hirerSocket, "new_match");
			authEvents.emit("new_match", { matchId: match.id, userIds: [artist.id, hirer.id] });
			const payload = await newMatchPromise;
			assert.equal(payload.matchId, match.id);

			await waitUntil(() => (io.sockets.adapter.rooms.get(`chat:${match.id}`)?.size ?? 0) === 2);

			const messagePromise = waitForEvent<{ matchId: string; content: string }>(
				hirerSocket,
				"new_message",
			);
			artistSocket.emit("send_message", { matchId: match.id, content: "ws-test live join" });
			const message = await messagePromise;
			assert.equal(message.content, "ws-test live join");
		} finally {
			hirerSocket.close();
			artistSocket.close();
		}
	});
});

test("logging out disconnects only the matching session, not the user's other sessions", async () => {
	const artist = await makeUser(UserRole.artist);
	const sessionA = crypto.randomUUID();
	const sessionB = crypto.randomUUID();
	const tokenA = jwt.sign({ userId: artist.id, role: artist.role, sessionId: sessionA }, SECRET, {
		algorithm: "HS256",
		expiresIn: "15m",
	});
	const tokenB = jwt.sign({ userId: artist.id, role: artist.role, sessionId: sessionB }, SECRET, {
		algorithm: "HS256",
		expiresIn: "15m",
	});

	await withServer(async (baseUrl) => {
		const socketA = connectClient(baseUrl, tokenA);
		const socketB = connectClient(baseUrl, tokenB);
		try {
			await Promise.all([waitForEvent(socketA, "connect"), waitForEvent(socketB, "connect")]);

			const disconnectPromise = waitForEvent(socketA, "disconnect");
			const staysConnected = expectNoEvent(socketB, "disconnect");
			authEvents.emit("logout", { sessionId: sessionA });

			await disconnectPromise;
			await staysConnected;
			assert.equal(socketA.connected, false);
			assert.equal(socketB.connected, true);
		} finally {
			socketA.close();
			socketB.close();
		}
	});
});
