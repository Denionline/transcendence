import { Server } from "socket.io";
import type { Server as HttpServer } from "node:http";
import { verifyAccessToken } from "../../lib/jwt.js";
import { getMatchesForUser } from "../matches/matches.service.js";
import { styleText } from "node:util";

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
		} catch (error) {
			next(new Error("unauthorized"));
		}
	});
	io.on("connection", async (socket) => {
		console.log(styleText("green", `[WebSocket] Client on: ${socket.userId}`));
		socket.join("user:" + socket.userId);

		const matchesPromised = getMatchesForUser(socket.userId, socket.role);

		socket.on("disconnect", async (reason) => {
			console.log(styleText("red", `[WebSocket] Client off: ${socket.userId}, reason: ${reason}`));
			const matches = await matchesPromised;
			matches.forEach((match) => {
				socket.to(`chat:${match.id}`).emit("user_offline", { userId: socket.userId });
			});
		});

		socket.on("error", (err) => {
			console.error(`[WebSocket] Socket error for ${socket.userId}:`, err);
		});

		const matches = await matchesPromised;
		matches.forEach((match) => {
			socket.join(`chat:${match.id}`);
			socket.to(`chat:${match.id}`).emit("user_online", { userId: socket.userId });
		});
	});
	return io;
}
