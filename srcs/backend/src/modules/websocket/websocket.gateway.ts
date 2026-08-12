import { Server } from "socket.io";
import type { Server as HttpServer } from "node:http";
import { verifyAccessToken } from "../../lib/jwt.js";
import { getMatchesForUser } from "../matches/matches.service.js";
import { styleText } from "node:util";
import { prisma } from "../../lib/prisma.js";

declare module "socket.io" {
	interface Socket {
		userId: string;
		role: string;
	}
}

export function initWebsocket(httpServer: HttpServer) {
	const io = new Server(httpServer, {
		cors: {
			origin: process.env.FRONTEND_URL,
			credentials: true,
		},
	});
	io.use((socket, next) => {
		const token = socket.handshake.auth.token;
		try {
			const payload = verifyAccessToken(token);
			socket.userId = payload.userId;
			socket.role = payload.role;
			next();
		} catch {
			next(new Error("unauthorized"));
		}
	});
	io.on("connection", async (socket) => {
		// eslint-disable-next-line no-console
		console.log(styleText("green", `[WebSocket] Client on: ${socket.userId}`));
		socket.join("user:" + socket.userId);

		const matchesPromised = getMatchesForUser(socket.userId, socket.role);

		socket.on("disconnect", async (reason) => {
			// eslint-disable-next-line no-console
			console.log(styleText("red", `[WebSocket] Client off: ${socket.userId}, reason: ${reason}`));
			const room = io.sockets.adapter.rooms.get(`user:${socket.userId}`);
			const remaining = room ? room.size : 0;
			if (remaining === 0) {
				const matches = await matchesPromised;
				matches.forEach((match) => {
					socket.to(`chat:${match.id}`).emit("user_offline", { userId: socket.userId });
				});
			}
		});

		socket.on("error", (err) => {
			// eslint-disable-next-line no-console
			console.error(`[WebSocket] Socket error for ${socket.userId}:`, err);
		});

		socket.on("send_message", async (data) => {
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
		});

		const matches = await matchesPromised;
		matches.forEach((match) => {
			socket.join(`chat:${match.id}`);
			socket.to(`chat:${match.id}`).emit("user_online", { userId: socket.userId });
		});
	});
	return io;
}
