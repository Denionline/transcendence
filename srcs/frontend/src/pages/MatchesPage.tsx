import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CheckIcon, ChevronDownIcon, MessageCircleIcon, Trash2Icon, XIcon } from "lucide-react";
import Avatar from "../components/Avatar";
import { listPendingInterests, respondToInterest } from "../features/interests/api";
import type { PendingInterestDto } from "../features/interests/types";
import { deleteMatch, listMatches } from "../features/matches/api";
import type { MatchDto } from "../features/matches/types";
import { useOnlineStatusUpdates } from "../features/matches/useOnlineStatus";
import { getSocket } from "../lib/socket";
import { ApiError } from "../lib/apiClient";
import { formatDate, formatRelativeTime } from "../lib/format";
import { useAuth } from "../features/auth/hooks/useAuth";
import type { NotificationType } from "../features/notifications/types";

type Status = "loading" | "ready" | "error";

function interestKey(interest: PendingInterestDto): string {
	return `${interest.gigId}:${interest.otherUser.id}`;
}

export default function MatchesPage() {
	return (
		<div className="mx-auto flex max-w-2xl flex-col gap-10">
			<div>
				<h1 className="text-2xl font-semibold">Matches</h1>
				<p className="text-sm text-base-content/50">
					People interested in you, and the matches you&rsquo;ve already made.
				</p>
			</div>

			<PossibleMatchesSection />
			<YourMatchesSection />
		</div>
	);
}

// ---------------------------------------------------------------------------
// Possible matches — likes received that the caller hasn't answered yet.
// Accepting one creates the match; declining removes it from this list for good.
// ---------------------------------------------------------------------------

function PossibleMatchesSection() {
	const { user, isLoading: authLoading } = useAuth();
	const [interests, setInterests] = useState<PendingInterestDto[]>([]);
	const [status, setStatus] = useState<Status>("loading");
	const [error, setError] = useState<string | null>(null);
	// Keys currently mid-request, so their buttons disable instead of allowing
	// a double accept/decline while the swipe is still in flight.
	const [respondingKeys, setRespondingKeys] = useState<Set<string>>(new Set());
	const [retryToken, setRetryToken] = useState(0);
	// "all" or a gig id — lets the user narrow the list down to one gig.
	const [gigFilter, setGigFilter] = useState("all");

	useEffect(() => {
		let cancelled = false;
		(async () => {
			const items = await listPendingInterests();
			if (cancelled) return;
			setInterests(items);
			setStatus("ready");
		})().catch((err: unknown) => {
			if (cancelled) return;
			setError(err instanceof ApiError ? err.message : "Couldn't load your interests.");
			setStatus("error");
		});
		return () => {
			cancelled = true;
		};
	}, [retryToken]);

	// Someone showing interest fires a `swipe_liked` notification, pushed live
	// over the socket with its type — refetch only for that type, since other
	// notifications (a friend request, a gig closing) never add a new pending
	// interest here.
	useEffect(() => {
		if (authLoading || !user) return;
		const socket = getSocket();
		if (!socket) return;

		function handleNewNotification({ type }: { type: NotificationType }) {
			if (type === "swipe_liked") setRetryToken((t) => t + 1);
		}

		socket.on("new_notification", handleNewNotification);
		return () => {
			socket.off("new_notification", handleNewNotification);
		};
	}, [authLoading, user]);

	function retry() {
		setRetryToken((t) => t + 1);
	}

	async function handleRespond(interest: PendingInterestDto, liked: boolean) {
		const key = interestKey(interest);
		setRespondingKeys((prev) => new Set(prev).add(key));
		try {
			await respondToInterest(interest, liked);
			setInterests((prev) => prev.filter((item) => interestKey(item) !== key));
		} catch {
			// Button re-enables below so the hirer can just try again.
			setRespondingKeys((prev) => {
				const next = new Set(prev);
				next.delete(key);
				return next;
			});
		}
	}

	// Every gig referenced by a pending interest, deduped, so the filter always
	// reflects what's actually on the page rather than every gig ever posted.
	const gigOptions = useMemo(() => {
		const byId = new Map<string, string>();
		for (const interest of interests) byId.set(interest.gig.id, interest.gig.title);
		return Array.from(byId, ([id, title]) => ({ id, title })).sort((a, b) =>
			a.title.localeCompare(b.title),
		);
	}, [interests]);

	// Fall back to "all" once the selected gig has nothing left to show (e.g.
	// the last interest for it was just accepted/declined) instead of staying
	// pointed at an option that's gone from the dropdown.
	const activeGigFilter =
		gigFilter !== "all" && gigOptions.every((gig) => gig.id !== gigFilter) ? "all" : gigFilter;

	const filteredInterests =
		activeGigFilter === "all" ? interests : interests.filter((i) => i.gig.id === activeGigFilter);

	const activeGigLabel =
		activeGigFilter === "all"
			? "All gigs"
			: (gigOptions.find((gig) => gig.id === activeGigFilter)?.title ?? "All gigs");

	return (
		<section>
			<div className="mb-4 flex items-start justify-between gap-4">
				<div>
					<h2 className="text-lg font-semibold">Possible matches</h2>
					<p className="text-sm text-base-content/50">
						{status === "ready"
							? `${filteredInterests.length} people are interested in you`
							: "Loading…"}
					</p>
				</div>

				{status === "ready" && gigOptions.length > 0 && (
					<div className="dropdown dropdown-end shrink-0">
						<div
							tabIndex={0}
							role="button"
							aria-label="Filter by opportunity"
							className="btn btn-sm gap-1.5 rounded-full border-base-content/15 bg-transparent font-normal"
						>
							<span className="max-w-40 truncate sm:max-w-48">{activeGigLabel}</span>
							<ChevronDownIcon className="size-3.5 text-base-content/50" aria-hidden="true" />
						</div>
						<ul
							tabIndex={0}
							className="menu dropdown-content z-20 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-box border border-base-content/10 bg-base-100 p-2 shadow-lg menu-sm"
						>
							<li>
								<button
									type="button"
									aria-current={activeGigFilter === "all"}
									className={activeGigFilter === "all" ? "active" : ""}
									onClick={(e) => {
										setGigFilter("all");
										e.currentTarget.blur();
									}}
								>
									All gigs
								</button>
							</li>
							{gigOptions.map((gig) => (
								<li key={gig.id}>
									<button
										type="button"
										aria-current={gig.id === activeGigFilter}
										className={gig.id === activeGigFilter ? "active" : ""}
										onClick={(e) => {
											setGigFilter(gig.id);
											e.currentTarget.blur();
										}}
									>
										<span className="truncate">{gig.title}</span>
									</button>
								</li>
							))}
						</ul>
					</div>
				)}
			</div>

			{status === "error" && (
				<div className="flex flex-col items-start gap-2 rounded-2xl border border-error/30 bg-error/10 p-4 text-sm text-error">
					<p className="font-medium">Couldn&rsquo;t load your interests</p>
					<p className="text-error/80">{error}</p>
					<button type="button" onClick={retry} className="btn btn-sm mt-2 rounded-full">
						Try again
					</button>
				</div>
			)}

			{status === "loading" && (
				<div className="flex h-40 items-center justify-center text-sm text-base-content/50">
					Loading interests…
				</div>
			)}

			{status === "ready" && filteredInterests.length === 0 && (
				<div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-base-content/15 text-center text-base-content/50">
					<p className="font-medium">
						{activeGigFilter === "all"
							? "No one’s shown interest yet"
							: "No interest for this gig yet"}
					</p>
					<p className="text-sm">Keep swiping — new interests show up here.</p>
				</div>
			)}

			{status === "ready" && filteredInterests.length > 0 && (
				<ul className="flex flex-col gap-3">
					{filteredInterests.map((interest) => {
						const key = interestKey(interest);
						const isResponding = respondingKeys.has(key);
						return (
							<li
								key={key}
								className="flex items-center justify-between gap-4 rounded-2xl border border-base-content/10 p-4"
							>
								<Link
									to={`/profile/${interest.otherUser.id}`}
									className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80"
								>
									<Avatar
										username={interest.otherUser.displayName}
										avatarUrl={interest.otherUser.avatarUrl}
										size="md"
									/>
									<div className="min-w-0">
										<p className="truncate font-medium">{interest.otherUser.displayName}</p>
										<p className="truncate text-sm text-base-content/50">
											Interested in {interest.gig.title} · {formatDate(interest.createdAt)}
										</p>
									</div>
								</Link>

								<div className="flex shrink-0 items-center gap-2">
									<button
										type="button"
										aria-label={`Decline ${interest.otherUser.displayName}`}
										disabled={isResponding}
										onClick={() => handleRespond(interest, false)}
										className="btn btn-circle btn-sm btn-outline border-base-content/15 text-base-content/50 hover:border-error hover:bg-error hover:text-error-content disabled:opacity-30"
									>
										<XIcon className="size-4" aria-hidden="true" />
									</button>
									<button
										type="button"
										aria-label={`Accept ${interest.otherUser.displayName}`}
										disabled={isResponding}
										onClick={() => handleRespond(interest, true)}
										className="btn btn-circle btn-sm btn-primary disabled:opacity-30"
									>
										<CheckIcon className="size-4" aria-hidden="true" />
									</button>
								</div>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}

// ---------------------------------------------------------------------------
// Your matches — confirmed (mutual) matches, with a way into their chat and a
// way to unmatch.
// ---------------------------------------------------------------------------

function YourMatchesSection() {
	const [matches, setMatches] = useState<MatchDto[]>([]);
	const [status, setStatus] = useState<Status>("loading");
	const [error, setError] = useState<string | null>(null);
	const [retryToken, setRetryToken] = useState(0);
	// The match a "Remove" click is asking to confirm — null closes the dialog.
	const [pendingRemove, setPendingRemove] = useState<MatchDto | null>(null);
	const [removingId, setRemovingId] = useState<string | null>(null);
	const [removeError, setRemoveError] = useState<string | null>(null);
	const dialogRef = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		if (pendingRemove) dialogRef.current?.showModal();
		else dialogRef.current?.close();
	}, [pendingRemove]);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setStatus("loading");
			const items = await listMatches();
			if (cancelled) return;
			setMatches(items);
			setStatus("ready");
		})().catch((err: unknown) => {
			if (cancelled) return;
			setError(err instanceof ApiError ? err.message : "Couldn't load your matches.");
			setStatus("error");
		});
		return () => {
			cancelled = true;
		};
	}, [retryToken]);

	useOnlineStatusUpdates(setMatches);

	// A fresh match made elsewhere (Discover, or the other side accepting a
	// pending interest above) should show up here without a manual reload.
	useEffect(() => {
		const socket = getSocket();
		if (!socket) return;
		function handleNewMatch() {
			listMatches()
				.then((items) => setMatches(items))
				.catch(() => {
					// Best-effort — the next visit to this page still refetches fresh.
				});
		}
		socket.on("new_match", handleNewMatch);
		return () => {
			socket.off("new_match", handleNewMatch);
		};
	}, []);

	function retry() {
		setRetryToken((t) => t + 1);
	}

	async function confirmRemove() {
		if (!pendingRemove) return;
		const matchId = pendingRemove.matchId;
		setRemovingId(matchId);
		setRemoveError(null);
		try {
			await deleteMatch(matchId);
			setMatches((prev) => prev.filter((m) => m.matchId !== matchId));
			setPendingRemove(null);
		} catch (err) {
			setRemoveError(err instanceof ApiError ? err.message : "Couldn't remove this match.");
		} finally {
			setRemovingId(null);
		}
	}

	return (
		<section>
			<div className="mb-4">
				<h2 className="text-lg font-semibold">Your matches</h2>
				<p className="text-sm text-base-content/50">
					{status === "ready" ? `${matches.length} confirmed matches` : "Loading…"}
				</p>
			</div>

			{status === "error" && (
				<div className="flex flex-col items-start gap-2 rounded-2xl border border-error/30 bg-error/10 p-4 text-sm text-error">
					<p className="font-medium">Couldn&rsquo;t load your matches</p>
					<p className="text-error/80">{error}</p>
					<button type="button" onClick={retry} className="btn btn-sm mt-2 rounded-full">
						Try again
					</button>
				</div>
			)}

			{status === "loading" && (
				<div className="flex h-40 items-center justify-center text-sm text-base-content/50">
					Loading matches…
				</div>
			)}

			{status === "ready" && matches.length === 0 && (
				<div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-base-content/15 text-center text-base-content/50">
					<p className="font-medium">No matches yet</p>
					<p className="text-sm">Accept an interest above, or keep swiping to find one.</p>
				</div>
			)}

			{status === "ready" && matches.length > 0 && (
				<ul className="flex flex-col gap-3">
					{matches.map((match) => (
						<li
							key={match.matchId}
							className="flex items-center justify-between gap-4 rounded-2xl border border-base-content/10 p-4"
						>
							<div className="flex min-w-0 items-center gap-3">
								<div className="relative shrink-0">
									<Avatar
										username={match.otherUser.displayName}
										avatarUrl={match.otherUser.avatarUrl}
										size="md"
									/>
									{match.otherUser.online && (
										<span
											className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-base-100 bg-success"
											aria-label="Online"
										/>
									)}
								</div>
								<div className="min-w-0">
									<p className="truncate font-medium">{match.otherUser.displayName}</p>
									<p className="truncate text-sm text-base-content/50">
										{match.lastMessage
											? `${match.lastMessage.content} · ${formatRelativeTime(match.lastMessage.createdAt)}`
											: `Matched on ${match.gig.title}`}
									</p>
								</div>
							</div>

							<div className="flex shrink-0 items-center gap-2">
								<Link
									to={`/messages?matchId=${match.matchId}`}
									aria-label={`Go to chat with ${match.otherUser.displayName}`}
									className="btn btn-sm btn-primary gap-1.5 rounded-full"
								>
									<MessageCircleIcon className="size-4" aria-hidden="true" />
									Chat
									{match.unreadCount > 0 && (
										<span className="badge badge-xs badge-neutral">{match.unreadCount}</span>
									)}
								</Link>
								<button
									type="button"
									aria-label={`Remove match with ${match.otherUser.displayName}`}
									onClick={() => {
										setRemoveError(null);
										setPendingRemove(match);
									}}
									className="btn btn-circle btn-sm btn-outline border-base-content/15 text-base-content/50 hover:border-error hover:bg-error hover:text-error-content"
								>
									<Trash2Icon className="size-4" aria-hidden="true" />
								</button>
							</div>
						</li>
					))}
				</ul>
			)}

			<dialog ref={dialogRef} className="modal" onClose={() => setPendingRemove(null)}>
				<div className="modal-box">
					<h3 className="text-lg font-bold">
						Remove match with {pendingRemove?.otherUser.displayName}?
					</h3>
					<p className="py-4 text-base-content/70">
						This ends the match and deletes your chat history with them. This can&rsquo;t be undone.
					</p>
					{removeError && <p className="pb-4 text-sm text-error">{removeError}</p>}
					<div className="modal-action">
						<button
							type="button"
							className="btn"
							disabled={removingId !== null}
							onClick={() => setPendingRemove(null)}
						>
							Cancel
						</button>
						<button
							type="button"
							className="btn btn-error"
							disabled={removingId !== null}
							onClick={confirmRemove}
						>
							{removingId !== null ? "Removing…" : "Remove match"}
						</button>
					</div>
				</div>
				<form method="dialog" className="modal-backdrop">
					<button>close</button>
				</form>
			</dialog>
		</section>
	);
}
