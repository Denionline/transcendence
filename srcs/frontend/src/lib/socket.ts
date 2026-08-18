import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "../features/auth/api";

let socket: Socket | null = null;

// One socket per session. The backend's websocket gateway (see
// backend/src/modules/websocket/websocket.gateway.ts) authenticates the
// handshake with the same access token as REST calls, joins the caller to a
// room per match, and pushes "user_online" / "user_offline" into those rooms
// whenever the other side connects or drops — this just keeps a live
// connection open so features can subscribe to that.
//
// `auth` is a callback rather than a plain object so a reconnect attempt
// (e.g. after the access token was refreshed) picks up the current token
// instead of the one captured when the socket was first created.
export function connectSocket(): Socket {
	if (socket) return socket;
	socket = io({
		auth: (cb) => cb({ token: getAccessToken() }),
	});
	return socket;
}

export function disconnectSocket() {
	socket?.disconnect();
	socket = null;
}

export function getSocket(): Socket | null {
	return socket;
}
