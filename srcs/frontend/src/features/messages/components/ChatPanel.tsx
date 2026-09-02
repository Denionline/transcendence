import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeftIcon, SendIcon } from "lucide-react";
import Avatar from "../../../components/Avatar";
import MessageBubble from "./MessageBubble";
import {
	deleteMessage,
	listMessages,
	markMessagesRead,
	sendMessage,
	toOptimisticMessage,
} from "../api";
import { messageContentSchema } from "../schemas";
import type { ChatMessageDto } from "../types";
import type { MatchDto } from "../../matches/types";
import { getSocket } from "../../../lib/socket";
import { useUnreadMessages } from "../hooks/useUnreadMessages";
import { useToast } from "../../toast/hooks/useToast";
import { useTranslation } from "react-i18next";

// Close enough to the bottom that an incoming message should still autoscroll
// — past this, assume the user scrolled up to read history and leave them be.
const NEAR_BOTTOM_PX = 80;

interface ChatPanelProps {
	match: MatchDto;
	currentUserId: string;
	onBack?: () => void;
}

export default function ChatPanel({ match, currentUserId, onBack }: ChatPanelProps) {
	const { t } = useTranslation();
	const toast = useToast();
	const { refresh: refreshUnreadCount, setActiveMatchId } = useUnreadMessages();
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
	// against the socket's own echo of it, and older pages against `messages`
	// already holding some overlap.
	const knownIds = useRef<Set<string>>(new Set());
	const isNearBottomRef = useRef(true);
	// Whether new messages have arrived via socket since the last mark-as-read —
	// avoids re-hitting the read endpoint on every input focus.
	const hasUnreadRef = useRef(false);

	useEffect(() => {
		// Tells MessagesContext this conversation is the one on screen right
		// now, so its badge doesn't count messages the user is already looking
		// at — cleared on unmount/match switch, not just overwritten, since two
		// ChatPanels are never mounted at once but this one still shouldn't
		// leave a stale matchId behind after it goes away.
		setActiveMatchId(match.matchId);
		return () => setActiveMatchId(null);
	}, [match.matchId, setActiveMatchId]);

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
			// Fetching a conversation's messages already marks the other side's
			// as read server-side (see messages.service.ts) — sync the navbar
			// badge down to match.
			refreshUnreadCount();
		})().catch(() => {
			if (cancelled) return;
			setStatus("error");
		});
		return () => {
			cancelled = true;
		};
	}, [match.matchId, refreshUnreadCount]);

	useEffect(() => {
		if (status !== "ready") return;
		const el = listRef.current;
		if (el && isNearBottomRef.current) el.scrollTop = el.scrollHeight;
	}, [messages, status]);

	useEffect(() => {
		if (status !== "ready") return;

		const socket = getSocket();
		if (!socket) return;

		function handleNewMessage(payload: {
			matchId: string;
			senderId: string;
			content: string;
			chatMessageId: string;
		}) {
			// The socket is shared by every match the user is in — ignore events
			// for other conversations, and de-dupe our own just-sent message
			// (io.to(...) echoes it back to the sender's own socket too).
			if (payload.matchId !== match.matchId) return;
			if (knownIds.current.has(payload.chatMessageId)) return;
			knownIds.current.add(payload.chatMessageId);
			hasUnreadRef.current = true;
			setMessages((prev) => [
				...prev,
				{
					id: payload.chatMessageId,
					matchId: payload.matchId,
					senderId: payload.senderId,
					content: payload.content,
					createdAt: new Date().toISOString(),
				},
			]);
		}

		socket.on("new_message", handleNewMessage);
		return () => {
			socket.off("new_message", handleNewMessage);
		};
	}, [match.matchId, status]);

	function handleFocus() {
		if (!hasUnreadRef.current) return;
		hasUnreadRef.current = false;
		markMessagesRead(match.matchId)
			.then(() => refreshUnreadCount())
			.catch(() => {
				// Mark-as-read failed — restore the flag so the next focus retries.
				hasUnreadRef.current = true;
			});
	}

	async function handleDeleteMessage(messageId: string) {
		try {
			await deleteMessage(match.matchId, messageId);
			setMessages((prev) => prev.filter((m) => m.id !== messageId));
			toast.success(t("messages.deleted"));
		} catch {
			// The message stays in place and its control stays active — the
			// toast is the only cue the click did anything.
			toast.error(t("messages.deleteFailed"));
		}
	}

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
		} catch {
			// Left where it was — "Load earlier messages" stays clickable to retry.
		} finally {
			setLoadingMore(false);
		}
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (sending) return;

		//	maxLength caps what can be typed, but not what can be pasted in
		//	some browsers, and it says nothing about a draft of pure
		//	whitespace — which the server refuses.
		const checked = messageContentSchema.safeParse(draft);
		if (!checked.success) {
			setSendError(checked.error.issues[0]?.message ?? t("messages.sendFailed"));
			return;
		}
		const content = checked.data;

		setSending(true);
		setSendError(null);
		try {
			const result = await sendMessage(match.matchId, content, currentUserId);
			const message = toOptimisticMessage(result);
			knownIds.current.add(message.id);
			setMessages((prev) => [...prev, message]);
			setDraft("");
			isNearBottomRef.current = true;
		} catch (err: unknown) {
			setSendError(err instanceof Error ? err.message : t("messages.sendFailed"));
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
						aria-label={t("messages.backToConversations")}
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
							aria-label={t("messages.online")}
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
						{t("messages.loadingMessages")}
					</div>
				)}

				{status === "error" && (
					<div className="flex h-full items-center justify-center text-sm text-error">
						{t("messages.couldntLoadConversation")}
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
									{loadingMore ? t("messages.loading") : t("messages.loadEarlier")}
								</button>
							</div>
						)}

						{messages.length === 0 ? (
							<div className="flex h-full flex-col items-center justify-center gap-1 text-center text-base-content/50">
								<p className="font-medium">{t("messages.sayHello")}</p>
								<p className="text-sm">
									{t("messages.startConversation", { title: match.gig.title })}
								</p>
							</div>
						) : (
							<div className="flex flex-col">
								{messages.map((message) => (
									<MessageBubble
										key={message.id}
										message={message}
										isMine={message.senderId === currentUserId}
										onDelete={handleDeleteMessage}
									/>
								))}
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
					onFocus={handleFocus}
					maxLength={2000}
					disabled={sending}
					placeholder={t("messages.messagePlaceholder", { name: match.otherUser.displayName })}
					aria-label={t("messages.messageLabel")}
					className="input input-bordered flex-1 rounded-full"
				/>
				<button
					type="submit"
					disabled={sending || draft.trim() === ""}
					aria-label={t("a11y.send")}
					className="btn btn-circle btn-primary disabled:opacity-30"
				>
					<SendIcon className="size-4" aria-hidden="true" />
				</button>
			</form>
			{sendError && <p className="px-3 pb-2 text-xs text-error">{sendError}</p>}
		</div>
	);
}
