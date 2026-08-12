import { Server, Socket, DisconnectReason } from "socket.io";
import type { Server as HttpServer } from "node:http";
import { verifyAccessToken } from "../../lib/jwt.js";
import { getMatchesForUser } from "../matches/matches.service.js";
import { styleText } from "node:util";
import { prisma } from "../../lib/prisma.js";
import { authEvents } from "../../lib/auth-events.js";

declare module "socket.io" {
	interface Socket {
		userId: string;
		role: string;
		sessionId: string;
		tokenExp: number;
	}
}

let ioInstance: Server;

export function isUserOnline(userId: string) {
	const room = ioInstance.sockets.adapter.rooms.get(`user:${userId}`);
	return !!room && room.size > 0;
}

async function handleSendMessage(
	socket: Socket,
	data: { matchId: string; content: string },
	matchesPromised: ReturnType<typeof getMatchesForUser>,
) {
	const room = `chat:${data.matchId}`;
	await matchesPromised;
	if (!socket.rooms.has(room)) return;
	try {
		const message = await prisma.chatMessage.create({
			data: { matchId: data.matchId, senderId: socket.userId, content: data.content },
		});
		socket.to(`chat:${data.matchId}`).emit("new_message", {
			matchId: message.matchId,
			senderId: message.senderId,
			content: message.content,
		});
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error(`[WebSocket] Failed to save message for ${socket.userId}:`, error);
		socket.emit("message_error", { reason: "failed_to_send" });
	}
}

function handleDisconnect(
	reason: DisconnectReason,
	io: Server,
	socket: Socket,
	expiryTimer: NodeJS.Timeout,
) {
	// eslint-disable-next-line no-console
	console.log(styleText("red", `[WebSocket] Client off: ${socket.userId}, reason: ${reason}`));
	const chatRooms = [...socket.rooms].filter((room) => room.startsWith("chat:"));
	const room = io.sockets.adapter.rooms.get(`user:${socket.userId}`);
	const remaining = room ? room.size - 1 : 0;
	if (remaining === 0) {
		chatRooms.forEach((roomName) => {
			socket.to(roomName).emit("user_offline", { userId: socket.userId });
		});
	}
	clearTimeout(expiryTimer);
}

export function initWebsocket(httpServer: HttpServer) {
	const io = new Server(httpServer, {
		cors: {
			origin: process.env.FRONTEND_URL,
			credentials: true,
		},
	});
	ioInstance = io;
	io.use((socket, next) => {
		const token = socket.handshake.auth.token;
		try {
			const payload = verifyAccessToken(token);
			if (payload.role !== "artist" && payload.role !== "hirer") {
				return next(new Error("role not supported for chat"));
			}
			socket.userId = payload.userId;
			socket.role = payload.role;
			socket.sessionId = payload.sessionId;
			socket.tokenExp = payload.exp * 1000;
			next();
		} catch {
			next(new Error("unauthorized"));
		}
	});

	io.on("connection", async (socket) => {
		// eslint-disable-next-line no-console
		console.log(styleText("green", `[WebSocket] Client on: ${socket.userId}`));
		socket.join("user:" + socket.userId);
		socket.join(`session:${socket.sessionId}`);

		const expiryTimer = setTimeout(() => {
			socket.timeout(2000).emit("token_expired", () => {
				socket.disconnect(true);
			});
		}, socket.tokenExp - Date.now());

		const matchesPromised = getMatchesForUser(socket.userId, socket.role);

		socket.on("disconnecting", (reason) => handleDisconnect(reason, io, socket, expiryTimer));

		socket.on("error", (err) => {
			// eslint-disable-next-line no-console
			console.error(`[WebSocket] Socket error for ${socket.userId}:`, err);
		});

		socket.on("send_message", (data) => handleSendMessage(socket, data, matchesPromised));

		const matches = await matchesPromised;
		matches.forEach((match) => {
			socket.join(`chat:${match.matchId}`);
		});
	});

	authEvents.on("logout", ({ sessionId }) => {
		io.in(`session:${sessionId}`).disconnectSockets(true);
	});

	authEvents.on("new_match", ({ matchId, userIds }: { matchId: string; userIds: string[] }) => {
		userIds.forEach((userId) => {
			io.in(`user:${userId}`).socketsJoin(`chat:${matchId}`);
		});
		io.to(`chat:${matchId}`).emit("new_match", { matchId });
	});
	return io;
}
