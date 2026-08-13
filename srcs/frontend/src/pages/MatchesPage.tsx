import { useEffect, useState } from "react";
import { CheckIcon, XIcon } from "lucide-react";
import Avatar from "../components/Avatar";
import { listPendingInterests, respondToInterest } from "../features/interests/api";
import type { PendingInterestDto } from "../features/interests/types";
import { ApiError } from "../lib/apiClient";
import { formatDate } from "../lib/format";

type Status = "loading" | "ready" | "error";

function interestKey(interest: PendingInterestDto): string {
	return `${interest.gigId}:${interest.otherUser.id}`;
}

export default function MatchesPage() {
	const [interests, setInterests] = useState<PendingInterestDto[]>([]);
	const [status, setStatus] = useState<Status>("loading");
	const [error, setError] = useState<string | null>(null);
	// Keys currently mid-request, so their buttons disable instead of allowing
	// a double accept/decline while the swipe is still in flight.
	const [respondingKeys, setRespondingKeys] = useState<Set<string>>(new Set());
	const [retryToken, setRetryToken] = useState(0);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setStatus("loading");
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

	function retry() {
		setRetryToken((t) => t + 1);
	}

	async function handleRespond(interest: PendingInterestDto, liked: boolean) {
		const key = interestKey(interest);
		setRespondingKeys((prev) => new Set(prev).add(key));
		try {
			await respondToInterest(interest, liked);
			setInterests((prev) => prev.filter((item) => interestKey(item) !== key));
		} catch (err: unknown) {
			console.error("Failed to respond to interest:", err);
			setRespondingKeys((prev) => {
				const next = new Set(prev);
				next.delete(key);
				return next;
			});
		}
	}

	return (
		<div className="mx-auto max-w-2xl">
			<div className="mb-6">
				<h1 className="text-2xl font-semibold">Matches</h1>
				<p className="text-sm text-base-content/50">
					{status === "ready" ? `${interests.length} people are interested in you` : "Loading…"}
				</p>
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
				<div className="flex h-64 items-center justify-center text-sm text-base-content/50">
					Loading interests…
				</div>
			)}

			{status === "ready" && interests.length === 0 && (
				<div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-base-content/15 text-center text-base-content/50">
					<p className="font-medium">No one&rsquo;s shown interest yet</p>
					<p className="text-sm">Keep swiping — new interests show up here.</p>
				</div>
			)}

			{status === "ready" && interests.length > 0 && (
				<ul className="flex flex-col gap-3">
					{interests.map((interest) => {
						const key = interestKey(interest);
						const isResponding = respondingKeys.has(key);
						return (
							<li
								key={key}
								className="flex items-center justify-between gap-4 rounded-2xl border border-base-content/10 p-4"
							>
								<div className="flex min-w-0 items-center gap-3">
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
								</div>

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
		</div>
	);
}
