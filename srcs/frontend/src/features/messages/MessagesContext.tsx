import { type ReactNode, createContext, useCallback, useEffect, useState } from "react";
import { listMatches } from "../matches/api";
import { getSocket } from "../../lib/socket";
import { useAuth } from "../auth/hooks/useAuth";

type Status = "loading" | "ready" | "error";

interface MessagesContextValue {
	unreadCount: number;
	status: Status;
	refresh: () => void;
}

export const MessagesContext = createContext<MessagesContextValue | null>(null);

export function MessagesProvider({ children }: { children: ReactNode }) {
	const { user, isLoading } = useAuth();
	const [unreadCount, setUnreadCount] = useState(0);
	const [status, setStatus] = useState<Status>("loading");
	const [retryToken, setRetryToken] = useState(0);

	useEffect(() => {
		// AuthProvider's own session check (fetchMe) hasn't set the access
		// token yet while isLoading is true — fetching now would go out
		// without it and come back 401. Wait for that to settle, and skip
		// entirely if it settled on "no session".
		if (isLoading || !user) return;

		let cancelled = false;

		async function load() {
			try {
				const matches = await listMatches();
				if (cancelled) return;
				setUnreadCount(matches.reduce((sum, match) => sum + match.unreadCount, 0));
				setStatus("ready");
			} catch {
				if (!cancelled) setStatus("error");
			}
		}

		load();

		return () => {
			cancelled = true;
		};
	}, [retryToken, isLoading, user?.id]);

	useEffect(() => {
		// Mirrors the gate on the data-loading effect above: this provider
		// mounts before AuthProvider's session check resolves, so on first
		// render connectSocket() hasn't run yet and getSocket() is still null.
		if (isLoading || !user) return;

		const socket = getSocket();
		if (!socket) return;

		function handleNewMessage(payload: { senderId: string }) {
			// The other side's message bumps the badge optimistically; opening
			// that conversation later calls refresh() to reconcile against the
			// server, which is the source of truth for what's actually unread.
			if (payload.senderId === user!.id) return;
			setUnreadCount((count) => count + 1);
		}

		socket.on("new_message", handleNewMessage);

		return () => {
			socket.off("new_message", handleNewMessage);
		};
	}, [isLoading, user]);

	// Stable identity — consumers (e.g. ChatPanel) call this from a useEffect
	// dependency array, and a function recreated on every render would make
	// that effect re-run on every unread-count change instead of only when
	// the conversation itself changes.
	const refresh = useCallback(() => {
		setRetryToken((t) => t + 1);
	}, []);

	return (
		<MessagesContext.Provider value={{ unreadCount, status, refresh }}>
			{children}
		</MessagesContext.Provider>
	);
}
