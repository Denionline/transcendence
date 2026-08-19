import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ConversationList from "../features/messages/components/ConversationList";
import ChatPanel from "../features/messages/components/ChatPanel";
import { listMatches } from "../features/matches/api";
import type { MatchDto } from "../features/matches/types";
import { useOnlineStatusUpdates } from "../features/matches/useOnlineStatus";
import { useAuth } from "../features/auth/hooks/useAuth";
import { ApiError } from "../lib/apiClient";
import { useMediaQuery } from "../lib/useMediaQuery";

const DESKTOP_QUERY = "(min-width: 1024px)";

type Status = "loading" | "ready" | "error";

export default function MessagesPage() {
	const isDesktop = useMediaQuery(DESKTOP_QUERY);
	const { user } = useAuth();
	const [searchParams, setSearchParams] = useSearchParams();
	const [matches, setMatches] = useState<MatchDto[]>([]);
	const [status, setStatus] = useState<Status>("loading");
	const [error, setError] = useState<string | null>(null);
	const [selectedMatchId, setSelectedMatchId] = useState<string | null>(
		searchParams.get("matchId"),
	);

	useEffect(() => {
		let cancelled = false;
		listMatches()
			.then((items) => {
				if (cancelled) return;
				setMatches(items);
				setStatus("ready");
				// Fall back to the first match if the URL didn't name one, or named
				// one that isn't (or no longer is) actually ours.
				setSelectedMatchId((current) => {
					if (current && items.some((m) => m.matchId === current)) return current;
					return items[0]?.matchId ?? null;
				});
			})
			.catch((err: unknown) => {
				if (cancelled) return;
				setError(err instanceof ApiError ? err.message : "Couldn't load your matches.");
				setStatus("error");
			});
		return () => {
			cancelled = true;
		};
	}, []);

	useOnlineStatusUpdates(setMatches);

	function selectMatch(matchId: string | null) {
		setSelectedMatchId(matchId);
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				if (matchId) next.set("matchId", matchId);
				else next.delete("matchId");
				return next;
			},
			{ replace: true },
		);
	}

	const selectedMatch = matches.find((m) => m.matchId === selectedMatchId) ?? null;
	// Mobile is single-pane: the list until a conversation is picked, then the
	// chat itself with a back button. Desktop always shows both side by side.
	const showList = isDesktop || !selectedMatch;
	const showChat = isDesktop || Boolean(selectedMatch);

	return (
		<div className="mx-auto max-w-5xl">
			<div className="mb-6">
				<h1 className="text-2xl font-semibold">Messages</h1>
				<p className="text-sm text-base-content/50">
					Chat with the people you&rsquo;ve matched with.
				</p>
			</div>

			{status === "error" && (
				<div className="flex flex-col items-start gap-2 rounded-2xl border border-error/30 bg-error/10 p-4 text-sm text-error">
					<p className="font-medium">Couldn&rsquo;t load your messages</p>
					<p className="text-error/80">{error}</p>
				</div>
			)}

			{status === "loading" && (
				<div className="flex h-[calc(100vh-14rem)] min-h-100 items-center justify-center text-sm text-base-content/50">
					Loading conversations…
				</div>
			)}

			{status === "ready" && user && (
				<div className="flex h-[calc(100vh-14rem)] min-h-100 overflow-hidden rounded-2xl border border-base-content/10">
					{showList && (
						<div
							className={`flex min-h-0 flex-col ${
								isDesktop ? "w-72 shrink-0 border-r border-base-content/10" : "w-full"
							}`}
						>
							<ConversationList
								matches={matches}
								selectedMatchId={selectedMatchId}
								onSelect={selectMatch}
							/>
						</div>
					)}

					{showChat &&
						(selectedMatch ? (
							<div className="min-w-0 flex-1">
								<ChatPanel
									key={selectedMatch.matchId}
									match={selectedMatch}
									currentUserId={user.id}
									onBack={isDesktop ? undefined : () => selectMatch(null)}
								/>
							</div>
						) : (
							// Only reachable when isDesktop (mobile's showChat requires a
							// selectedMatch), so this is always the two-pane empty state.
							<div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-center text-base-content/50">
								<p className="font-medium">Select a conversation</p>
								<p className="text-sm">Pick someone from the left to see your messages.</p>
							</div>
						))}
				</div>
			)}
		</div>
	);
}
