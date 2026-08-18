import { useEffect, useMemo, useState } from "react";
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
	// "all" or a gig id — lets the user narrow the list down to one gig.
	const [gigFilter, setGigFilter] = useState("all");

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

	return (
		<div className="mx-auto max-w-2xl">
			<div className="mb-6 flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold">Matches</h1>
					<p className="text-sm text-base-content/50">
						{status === "ready"
							? `${filteredInterests.length} people are interested in you`
							: "Loading…"}
					</p>
				</div>

				{status === "ready" && gigOptions.length > 0 && (
					<select
						value={activeGigFilter}
						onChange={(e) => setGigFilter(e.target.value)}
						aria-label="Filter by opportunity"
						className="select select-sm shrink-0 rounded-full border-base-content/15 bg-transparent font-normal"
					>
						<option value="all">All gigs</option>
						{gigOptions.map((gig) => (
							<option key={gig.id} value={gig.id}>
								{gig.title}
							</option>
						))}
					</select>
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
				<div className="flex h-64 items-center justify-center text-sm text-base-content/50">
					Loading interests…
				</div>
			)}

			{status === "ready" && filteredInterests.length === 0 && (
				<div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-base-content/15 text-center text-base-content/50">
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
