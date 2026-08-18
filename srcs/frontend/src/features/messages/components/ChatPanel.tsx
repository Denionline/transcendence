import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeftIcon, SendIcon } from "lucide-react";
import Avatar from "../../../components/Avatar";
import { listMessages, sendMessage, toOptimisticMessage } from "../api";
import type { ChatMessageDto } from "../types";
import type { MatchDto } from "../../matches/types";
import { ApiError } from "../../../lib/apiClient";
import { formatTime } from "../../../lib/format";

// No websocket wiring on the frontend yet (the backend already pushes
// "new_message" over a socket.io room per match — see websocket.gateway.ts —
// but nothing here connects to it), so new messages from the other side are
// picked up by polling the latest page instead of a live push.
const POLL_MS = 4000;
// Close enough to the bottom that an incoming message should still autoscroll
// — past this, assume the user scrolled up to read history and leave them be.
const NEAR_BOTTOM_PX = 80;

interface ChatPanelProps {
	match: MatchDto;
	currentUserId: string;
	onBack?: () => void;
}

export default function ChatPanel({ match, currentUserId, onBack }: ChatPanelProps) {
	const [messages, setMessages] = useState<ChatMessageDto[]>([]);
	const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [draft, setDraft] = useState("");
	const [sending, setSending] = useState(false);
	const [sendError, setSendError] = useState<string | null>(null);

	const listRef = useRef<HTMLDivElement>(null);
	// Every message id currently rendered — de-dupes the just-sent message
	// against the next poll tick, and older pages against `messages` already
	// holding some overlap.
	const knownIds = useRef<Set<string>>(new Set());
	const isNearBottomRef = useRef(true);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setStatus("loading");
			setMessages([]);
			knownIds.current = new Set();
			setPage(1);
			isNearBottomRef.current = true;
			const res = await listMessages(match.matchId, 1);
			if (cancelled) return;
			const ordered = [...res.items].reverse(); // API is newest-first; render oldest-first
			ordered.forEach((m) => knownIds.current.add(m.id));
			setMessages(ordered);
			setHasMore(res.hasMore);
			setStatus("ready");
		})().catch((err: unknown) => {
			if (cancelled) return;
			console.error("Failed to load messages:", err);
			setStatus("error");
		});
		return () => {
			cancelled = true;
		};
	}, [match.matchId]);

	useEffect(() => {
		if (status !== "ready") return;
		const el = listRef.current;
		if (el && isNearBottomRef.current) el.scrollTop = el.scrollHeight;
	}, [messages, status]);

	useEffect(() => {
		if (status !== "ready") return;
		const interval = window.setInterval(() => {
			listMessages(match.matchId, 1)
				.then((res) => {
					const fresh = [...res.items].reverse().filter((m) => !knownIds.current.has(m.id));
					if (fresh.length === 0) return;
					fresh.forEach((m) => knownIds.current.add(m.id));
					setMessages((prev) => [...prev, ...fresh]);
				})
				.catch((err: unknown) => {
					console.error("Failed to poll for new messages:", err);
				});
		}, POLL_MS);
		return () => window.clearInterval(interval);
	}, [match.matchId, status]);

	function handleScroll() {
		const el = listRef.current;
		if (!el) return;
		const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
		isNearBottomRef.current = distanceFromBottom < NEAR_BOTTOM_PX;
	}

	async function loadMore() {
		if (loadingMore || !hasMore) return;
		setLoadingMore(true);
		const el = listRef.current;
		const prevScrollHeight = el?.scrollHeight ?? 0;
		try {
			const nextPage = page + 1;
			const res = await listMessages(match.matchId, nextPage);
			const older = [...res.items].reverse().filter((m) => !knownIds.current.has(m.id));
			older.forEach((m) => knownIds.current.add(m.id));
			setMessages((prev) => [...older, ...prev]);
			setHasMore(res.hasMore);
			setPage(nextPage);
			// Keep the view anchored on what was already visible instead of
			// jumping to the top now that older messages were prepended above it.
			requestAnimationFrame(() => {
				const target = listRef.current;
				if (target) target.scrollTop = target.scrollHeight - prevScrollHeight;
			});
		} catch (err: unknown) {
			console.error("Failed to load earlier messages:", err);
		} finally {
			setLoadingMore(false);
		}
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		const content = draft.trim();
		if (!content || sending) return;
		setSending(true);
		setSendError(null);
		try {
			const result = await sendMessage(match.matchId, content);
			const message = toOptimisticMessage(result);
			knownIds.current.add(message.id);
			setMessages((prev) => [...prev, message]);
			setDraft("");
			isNearBottomRef.current = true;
		} catch (err: unknown) {
			setSendError(err instanceof ApiError ? err.message : "Couldn't send that message.");
		} finally {
			setSending(false);
		}
	}

	return (
		<div className="flex h-full min-h-0 flex-col">
			<header className="flex shrink-0 items-center gap-3 border-b border-base-content/10 p-3">
				{onBack && (
					<button
						type="button"
						onClick={onBack}
						aria-label="Back to conversations"
						className="btn btn-ghost btn-circle btn-sm"
					>
						<ArrowLeftIcon className="size-4" aria-hidden="true" />
					</button>
				)}
				<div className="relative shrink-0">
					<Avatar
						username={match.otherUser.displayName}
						avatarUrl={match.otherUser.avatarUrl}
						size="sm"
					/>
					{match.otherUser.online && (
						<span
							className="absolute right-0 bottom-0 size-2 rounded-full border-2 border-base-100 bg-success"
							aria-label="Online"
						/>
					)}
				</div>
				<div className="min-w-0">
					<p className="truncate text-sm font-medium">{match.otherUser.displayName}</p>
					<p className="truncate text-xs text-base-content/50">{match.gig.title}</p>
				</div>
			</header>

			<div ref={listRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4">
				{status === "loading" && (
					<div className="flex h-full items-center justify-center text-sm text-base-content/50">
						Loading messages…
					</div>
				)}

				{status === "error" && (
					<div className="flex h-full items-center justify-center text-sm text-error">
						Couldn&rsquo;t load this conversation.
					</div>
				)}

				{status === "ready" && (
					<>
						{hasMore && (
							<div className="mb-3 flex justify-center">
								<button
									type="button"
									onClick={loadMore}
									disabled={loadingMore}
									className="btn btn-ghost btn-xs rounded-full disabled:opacity-50"
								>
									{loadingMore ? "Loading…" : "Load earlier messages"}
								</button>
							</div>
						)}

						{messages.length === 0 ? (
							<div className="flex h-full flex-col items-center justify-center gap-1 text-center text-base-content/50">
								<p className="font-medium">Say hello 👋</p>
								<p className="text-sm">
									You matched on {match.gig.title} — start the conversation.
								</p>
							</div>
						) : (
							<div className="flex flex-col">
								{messages.map((message) => {
									const isMine = message.senderId === currentUserId;
									return (
										<div key={message.id} className={`chat ${isMine ? "chat-end" : "chat-start"}`}>
											<div
												className={`chat-bubble ${isMine ? "chat-bubble-primary" : "bg-base-200 text-base-content"}`}
											>
												{message.content}
											</div>
											<div className="chat-footer text-xs text-base-content/40">
												{formatTime(message.createdAt)}
											</div>
										</div>
									);
								})}
							</div>
						)}
					</>
				)}
			</div>

			<form
				onSubmit={handleSubmit}
				className="flex shrink-0 items-center gap-2 border-t border-base-content/10 p-3"
			>
				<input
					type="text"
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					maxLength={2000}
					disabled={sending}
					placeholder={`Message ${match.otherUser.displayName}`}
					aria-label="Message"
					className="input input-bordered flex-1 rounded-full"
				/>
				<button
					type="submit"
					disabled={sending || draft.trim() === ""}
					aria-label="Send"
					className="btn btn-circle btn-primary disabled:opacity-30"
				>
					<SendIcon className="size-4" aria-hidden="true" />
				</button>
			</form>
			{sendError && <p className="px-3 pb-2 text-xs text-error">{sendError}</p>}
		</div>
	);
}
