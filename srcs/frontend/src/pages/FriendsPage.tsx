import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2Icon } from "lucide-react";
import Avatar from "../components/Avatar";
import { listFriends, removeFriend } from "../features/friends/api";
import type { FriendSummary } from "../features/friends/types";
import { ApiError } from "../lib/apiClient";

export default function FriendsPage() {
	const [friends, setFriends] = useState<FriendSummary[]>([]);
	const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
	const [error, setError] = useState<string | null>(null);
	const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);

	useEffect(() => {
		let cancelled = false;
		listFriends(1)
			.then((res) => {
				if (cancelled) return;
				setFriends(res.items);
				setHasMore(res.hasMore);
				setPage(1);
				setStatus("ready");
			})
			.catch((err: unknown) => {
				if (cancelled) return;
				setError(err instanceof ApiError ? err.message : "Couldn't load your friends.");
				setStatus("error");
			});
		return () => {
			cancelled = true;
		};
	}, []);

	async function loadMore() {
		if (loadingMore || !hasMore) return;
		setLoadingMore(true);
		try {
			const nextPage = page + 1;
			const res = await listFriends(nextPage);
			setFriends((prev) => [...prev, ...res.items]);
			setHasMore(res.hasMore);
			setPage(nextPage);
		} catch {
			// Left as-is — the button stays clickable to retry.
		} finally {
			setLoadingMore(false);
		}
	}

	async function handleRemove(friend: FriendSummary) {
		setRemovingIds((prev) => new Set(prev).add(friend.id));
		try {
			await removeFriend(friend.id);
			setFriends((prev) => prev.filter((item) => item.id !== friend.id));
		} catch {
			setRemovingIds((prev) => {
				const next = new Set(prev);
				next.delete(friend.id);
				return next;
			});
		}
	}

	return (
		<div className="mx-auto max-w-2xl">
			<div className="mb-6">
				<h1 className="text-2xl font-semibold">Friends</h1>
				<p className="text-sm text-base-content/50">
					{status === "ready" ? `${friends.length} friends` : "Loading…"}
				</p>
			</div>

			{status === "error" && (
				<div className="rounded-2xl border border-error/30 bg-error/10 p-4 text-sm text-error">
					{error}
				</div>
			)}

			{status === "loading" && (
				<div className="flex h-64 items-center justify-center text-sm text-base-content/50">
					Loading friends…
				</div>
			)}

			{status === "ready" && friends.length === 0 && (
				<div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-base-content/15 text-center text-base-content/50">
					<p className="font-medium">No friends yet</p>
					<p className="text-sm">Add someone from their profile to see them here.</p>
				</div>
			)}

			{status === "ready" && friends.length > 0 && (
				<ul className="flex flex-col gap-3">
					{friends.map((friend) => (
						<li
							key={friend.id}
							className="flex items-center gap-3 rounded-2xl border border-base-content/10 p-4"
						>
							<Link
								to={`/profile/${friend.id}`}
								className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80"
							>
								<Avatar username={friend.displayName} avatarUrl={friend.avatarUrl} size="md" />
								<span className="min-w-0 truncate font-medium">{friend.displayName}</span>
							</Link>
							<button
								type="button"
								aria-label={`Remove ${friend.displayName}`}
								disabled={removingIds.has(friend.id)}
								onClick={() => handleRemove(friend)}
								className="btn btn-ghost btn-sm shrink-0 text-error disabled:opacity-30"
							>
								<Trash2Icon className="size-4" aria-hidden="true" />
							</button>
						</li>
					))}
				</ul>
			)}

			{status === "ready" && hasMore && (
				<div className="mt-4 flex justify-center">
					<button
						type="button"
						disabled={loadingMore}
						onClick={loadMore}
						className="btn btn-sm rounded-full disabled:opacity-50"
					>
						{loadingMore ? <span className="loading loading-spinner loading-xs" /> : "Load more"}
					</button>
				</div>
			)}
		</div>
	);
}
