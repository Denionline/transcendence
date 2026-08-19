import { Server, Socket, DisconnectReason } from "socket.io";
import type { Server as HttpServer } from "node:http";
import { verifyAccessToken } from "../../lib/jwt.js";
import { getMatchIdsForUser } from "../matches/matches.service.js";
import { UserRole } from "../../../generated/prisma/enums.js";
import { styleText } from "node:util";
import { authEvents } from "../../lib/auth-events.js";
import { createMessage } from "../messages/messages.service.js";
import { parseMessageContent } from "../messages/messages.service.js";

declare module "socket.io" {
	interface Socket {
		userId: string;
		role: string;
		sessionId: string;
		tokenExp: number;
	}
}

let ioInstance: Server;

export function isUserOnline(userId: string, matchId: string) {
	if (!ioInstance) return false;
	const userSockets = ioInstance.sockets.adapter.rooms.get(`user:${userId}`);
	const chatSockets = ioInstance.sockets.adapter.rooms.get(`chat:${matchId}`);
	if (!userSockets || !chatSockets) return false;
	for (const socketId of userSockets) {
		if (chatSockets.has(socketId)) return true;
	}
	return false;
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

		const matchesPromised = getMatchIdsForUser({
			id: socket.userId,
			role: socket.role as UserRole,
		});

		socket.on("disconnecting", (reason) => handleDisconnect(reason, io, socket, expiryTimer));

		socket.on("error", (err) => {
			// eslint-disable-next-line no-console
			console.error(`[WebSocket] Socket error for ${socket.userId}:`, err);
		});

		socket.on("send_message", async (data, ack?: (response: { chatMessageId: string }) => void) => {
			if (!parseMessageContent(data.content)) {
				socket.emit("message_error", { reason: "invalid_content" });
				return;
			}
			const room = `chat:${data.matchId}`;
			if (!socket.rooms.has(room)) {
				socket.emit("message_error", { reason: "failed_to_send" });
				return;
			}
			const result = await createMessage({
				matchId: data.matchId,
				senderId: socket.userId,
				content: data.content,
			});
			if (result.state === false) {
				socket.emit("message_error", { reason: "failed_to_send" });
				return;
			}
			ack?.({ chatMessageId: result.message!.id });
			socket.to(`chat:${data.matchId}`).emit("new_message", {
				matchId: data.matchId,
				senderId: socket.userId,
				content: data.content,
				chatMessageId: result.message!.id,
			});
		});

		const matchIds = await matchesPromised;
		matchIds.forEach((matchId) => {
			socket.join(`chat:${matchId}`);
			socket.to(`chat:${matchId}`).emit("user_online", { userId: socket.userId });
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
		userIds.forEach((userId) => {
			io.to(`chat:${matchId}`).except(`user:${userId}`).emit("user_online", { userId });
		});
	});

	authEvents.on("send_message", ({ senderId, content, matchId, chatMessageId }) => {
		io.to(`chat:${matchId}`).emit("new_message", { senderId, content, matchId, chatMessageId });
	});

	authEvents.on("new_notification", ({ targetId }) => {
		io.to(`user:${targetId}`).emit("new_notification");
	});
	return io;
}
