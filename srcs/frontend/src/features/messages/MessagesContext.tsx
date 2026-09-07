import { type ReactNode, createContext, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { listMatches } from "../matches/api";
import type { MatchDto } from "../matches/types";
import { getSocket, roleUsesRealtime } from "../../lib/socket";
import { useAuth } from "../auth/hooks/useAuth";
import { useToast } from "../toast/hooks/useToast";

type Status = "loading" | "ready" | "error";

interface MessagesContextValue {
	matches: MatchDto[];
	unreadCount: number;
	status: Status;
	refresh: () => void;
	/** ChatPanel calls this with its matchId on mount and `null` on unmount, so
	 *  a message arriving for the conversation someone already has open never
	 *  bumps the badge — they're already looking at it. */
	setActiveMatchId: (matchId: string | null) => void;
	/** Increments once per message that actually adds to the badge — a cue for
	 *  MessagesIcon to play its "new message" animation, distinct from
	 *  reconciliation bumps (refresh()) that shouldn't animate. */
	bumpToken: number;
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
	const { user, isInitializing } = useAuth();
	//	The id, not the object: AuthProvider hands back a new `user` identity on
	//	every session refresh, which would re-run the fetch for the same person.
	const userId = user?.id ?? null;
	//	Admins have no matches — GET /api/matches answers them 403, which the
	//	browser logs as a console error. Only artists and hirers have a chat.
	const canChat = roleUsesRealtime(user?.role);
	const [matches, setMatches] = useState<MatchDto[]>([]);
	const [status, setStatus] = useState<Status>("loading");
	const [retryToken, setRetryToken] = useState(0);
	const [bumpToken, setBumpToken] = useState(0);
	const activeMatchIdRef = useRef<string | null>(null);
	// The socket effect below closes over `matches` only when it attaches, so it
	// reads the current list through this ref.
	const matchesRef = useRef<MatchDto[]>(matches);
	useEffect(() => {
		matchesRef.current = matches;
	}, [matches]);

	const toast = useToast();
	const { t } = useTranslation();
	const notifyRef = useRef({ toast, t });
	useEffect(() => {
		notifyRef.current = { toast, t };
	});

	// Stable identity — consumers (e.g. ChatPanel) call this from a useEffect
	// dependency array, and a function recreated on every render would make
	// that effect re-run on every unread-count change instead of only when
	// the conversation itself changes.
	const refresh = useCallback(() => {
		setRetryToken((t) => t + 1);
	}, []);

	useEffect(() => {
		// AuthProvider's own session check (fetchMe) hasn't set the access
		// token yet while isInitializing is true — fetching now would go out
		// without it and come back 401. Wait for that to settle, and skip
		// entirely if it settled on "no session".
		if (isInitializing || !userId || !canChat) return;

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
	}, [retryToken, isInitializing, userId, canChat]);

	useEffect(() => {
		// Mirrors the gate on the data-loading effect above: this provider
		// mounts before AuthProvider's session check resolves, so on first
		// render connectSocket() hasn't run yet and getSocket() is still null.
		if (isInitializing || !user) return;

		const socket = getSocket();
		if (!socket) return;

		function handleNewMessage(payload: { senderId: string; content: string; matchId: string }) {
			// The other side's message bumps that conversation's unread count and
			// preview optimistically, and floats it back to the top — opening the
			// conversation later calls refresh() to reconcile against the server,
			// which is the source of truth for what's actually unread.
			if (payload.senderId === user!.id) return;
			// Already looking at this conversation — it counts as read, so only
			// refresh the preview text/timestamp, not the badge or animation.
			const isActiveConversation = payload.matchId === activeMatchIdRef.current;
			const inAnotherChat =
				activeMatchIdRef.current !== null && payload.matchId !== activeMatchIdRef.current;
			// A message for a match not yet in the list (created this session,
			// chat never opened) — the map below would silently drop it, so
			// reconcile against the server instead.
			if (!matchesRef.current.some((match) => match.matchId === payload.matchId)) {
				refresh();
				if (!isActiveConversation) setBumpToken((t) => t + 1);
				if (inAnotherChat) {
					notifyRef.current.toast.info(notifyRef.current.t("messages.newMessage"));
				}
				return;
			}
			if (inAnotherChat) {
				const name = matchesRef.current.find((match) => match.matchId === payload.matchId)
					?.otherUser.displayName;
				notifyRef.current.toast.info(
					name
						? notifyRef.current.t("messages.newMessageFrom", { name })
						: notifyRef.current.t("messages.newMessage"),
				);
			}
			setMatches((prev) =>
				[...prev]
					.map((match) =>
						match.matchId === payload.matchId
							? {
									...match,
									unreadCount: isActiveConversation ? match.unreadCount : match.unreadCount + 1,
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
			if (!isActiveConversation) setBumpToken((t) => t + 1);
		}

		function handleNewMatch() {
			refresh();
		}

		socket.on("new_message", handleNewMessage);
		socket.on("new_match", handleNewMatch);

		return () => {
			socket.off("new_message", handleNewMessage);
			socket.off("new_match", handleNewMatch);
		};
	}, [isInitializing, user, refresh]);

	// Stable for the same reason as refresh — ChatPanel calls it from a
	// useEffect keyed on the conversation it's mounted for.
	const setActiveMatchId = useCallback((matchId: string | null) => {
		activeMatchIdRef.current = matchId;
	}, []);

	const unreadCount = matches.reduce((sum, match) => sum + match.unreadCount, 0);

	return (
		<MessagesContext.Provider
			value={{ matches, unreadCount, status, refresh, setActiveMatchId, bumpToken }}
		>
			{children}
		</MessagesContext.Provider>
	);
}
