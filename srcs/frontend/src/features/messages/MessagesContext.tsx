import { type ReactNode, createContext, useCallback, useEffect, useState } from "react";
import { listMatches } from "../matches/api";
import type { MatchDto } from "../matches/types";
import { getSocket } from "../../lib/socket";
import { useAuth } from "../auth/hooks/useAuth";

type Status = "loading" | "ready" | "error";

interface MessagesContextValue {
	matches: MatchDto[];
	unreadCount: number;
	status: Status;
	refresh: () => void;
}

export const MessagesContext = createContext<MessagesContextValue | null>(null);

// Most recently active conversation first — what a preview dropdown wants,
// unlike the chat sidebar's own listMatches() call which keeps matches in
// the order they were created.
function byRecentActivity(a: MatchDto, b: MatchDto): number {
	const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
	const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
	return bTime - aTime;
}

export function MessagesProvider({ children }: { children: ReactNode }) {
	const { user, isLoading } = useAuth();
	const [matches, setMatches] = useState<MatchDto[]>([]);
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
				const items = await listMatches();
				if (cancelled) return;
				setMatches([...items].sort(byRecentActivity));
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

		function handleNewMessage(payload: { senderId: string; content: string; matchId: string }) {
			// The other side's message bumps that conversation's unread count and
			// preview optimistically, and floats it back to the top — opening the
			// conversation later calls refresh() to reconcile against the server,
			// which is the source of truth for what's actually unread.
			if (payload.senderId === user!.id) return;
			setMatches((prev) =>
				[...prev]
					.map((match) =>
						match.matchId === payload.matchId
							? {
									...match,
									unreadCount: match.unreadCount + 1,
									lastMessage: {
										content: payload.content,
										createdAt: new Date().toISOString(),
										senderId: payload.senderId,
									},
								}
							: match,
					)
					.sort(byRecentActivity),
			);
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

	const unreadCount = matches.reduce((sum, match) => sum + match.unreadCount, 0);

	return (
		<MessagesContext.Provider value={{ matches, unreadCount, status, refresh }}>
			{children}
		</MessagesContext.Provider>
	);
}
