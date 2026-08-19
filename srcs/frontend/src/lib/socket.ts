import { io, type Socket } from "socket.io-client";
import { getAccessToken, refreshAccessToken } from "../features/auth/api";

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
	// The backend gives a socket a ~2s grace window before force-disconnecting
	// it once its access token expires (see websocket.gateway.ts). Racing a
	// refresh in that window means the automatic reconnection socket.io does
	// next — which re-reads getAccessToken() via the `auth` callback above —
	// picks up the fresh token and rejoins silently, instead of "user_online"
	// updates just quietly going stale until something else (a REST call)
	// happens to trigger a refresh first.
	socket.on("token_expired", () => {
		refreshAccessToken().catch(() => {
			// Refresh failed too — apiClient's own 401 handling already routes
			// that into notifySessionExpired for the rest of the app; nothing
			// more for the socket to do here.
		});
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
