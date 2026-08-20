import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { getSocket } from "../../lib/socket";
import type { MatchDto } from "./types";

/**
 * Keeps each match's `otherUser.online` flag in sync with the backend's live
 * "user_online" / "user_offline" websocket events instead of the one-time
 * snapshot `listMatches()` returned when the page first loaded.
 *
 * Both events carry only `{ userId }` (see websocket.gateway.ts) — no
 * matchId — so every match whose other side is that user gets updated,
 * rather than looking one match up by id.
 */
export function useOnlineStatusUpdates(setMatches: Dispatch<SetStateAction<MatchDto[]>>) {
	useEffect(() => {
		const socket = getSocket();
		if (!socket) return;

		function setOnline(userId: string, online: boolean) {
			setMatches((prev) =>
				prev.map((match) =>
					match.otherUser.id === userId
						? { ...match, otherUser: { ...match.otherUser, online } }
						: match,
				),
			);
		}

		const onOnline = ({ userId }: { userId: string }) => setOnline(userId, true);
		const onOffline = ({ userId }: { userId: string }) => setOnline(userId, false);

		socket.on("user_online", onOnline);
		socket.on("user_offline", onOffline);
		return () => {
			socket.off("user_online", onOnline);
			socket.off("user_offline", onOffline);
		};
	}, [setMatches]);
}
