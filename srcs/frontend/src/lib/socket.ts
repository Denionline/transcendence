import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "../features/auth/api";

let socket: Socket | null = null;

export function getSocket() {
	if (!socket) {
		socket = io({
			path: "/socket.io",
			autoConnect: false,
			auth: (cb) => cb({ token: getAccessToken() }),
		});
	}
	return socket;
}

export function disconnectSocket(): void {
	socket?.disconnect();
}
