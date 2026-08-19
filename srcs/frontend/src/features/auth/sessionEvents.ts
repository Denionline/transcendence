// Broadcasts that the session just ended from underneath the app — the
// access token expired *and* the silent refresh that should replace it also
// failed (see apiClient.ts), meaning the refresh cookie itself is gone,
// expired, or revoked. AuthContext is the sole subscriber: it clears the
// user and disconnects the socket, which naturally routes the app back to
// /login via ProtectedRoute — nothing else needs to know.
const SESSION_EXPIRED_EVENT = "artmate:session-expired";

export function notifySessionExpired(): void {
	window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

/** Returns an unsubscribe function, ready to hand straight to a `useEffect` cleanup. */
export function onSessionExpired(handler: () => void): () => void {
	window.addEventListener(SESSION_EXPIRED_EVENT, handler);
	return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
}
