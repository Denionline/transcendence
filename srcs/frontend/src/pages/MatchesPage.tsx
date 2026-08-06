import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { listInterestedArtists } from "../features/swipes/api";
import { listMyGigs } from "../features/gigs/api";
import InterestedArtistRow from "../features/matches/components/InterestedArtistRow";
import InterestedArtistDetailsModal from "../features/matches/components/InterestedArtistDetailsModal";
import { ApiError } from "../lib/apiClient";
import type { InterestedArtistDto } from "../features/swipes/types";
import type { GigDto } from "../features/gigs/types";

const ALL_GIGS_VALUE = "";

export default function MatchesPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	// The URL is the source of truth for the filter (not just local state) so
	// a link from My opportunities' "View matches" button can land here
	// pre-filtered to one specific gig.
	const gigFilter = searchParams.get("gigId") ?? ALL_GIGS_VALUE;

	const [myGigs, setMyGigs] = useState<GigDto[]>([]);
	const [items, setItems] = useState<InterestedArtistDto[]>([]);
	const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
	const [error, setError] = useState<string | null>(null);
	const [detailItem, setDetailItem] = useState<InterestedArtistDto | null>(null);

	// Only used to populate the filter dropdown — every gig the hirer has ever
	// posted, open or closed, since interest recorded against a since-closed
	// gig is still worth seeing.
	useEffect(() => {
		listMyGigs()
			.then(setMyGigs)
			.catch((err: unknown) => {
				console.error("Failed to load your opportunities for the filter:", err);
			});
	}, []);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setStatus("loading");
			const res = await listInterestedArtists(gigFilter || undefined);
			if (cancelled) return;
			setItems(res);
			setStatus("ready");
		})().catch((err: unknown) => {
			if (cancelled) return;
			setError(err instanceof ApiError ? err.message : "Couldn't load matches. Please try again.");
			setStatus("error");
		});
		return () => {
			cancelled = true;
		};
	}, [gigFilter]);

	function handleFilterChange(gigId: string) {
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				if (gigId) next.set("gigId", gigId);
				else next.delete("gigId");
				return next;
			},
			{ replace: true },
		);
	}

	const activeGig = myGigs.find((gig) => gig.id === gigFilter) ?? null;

	return (
		<div className="mx-auto flex max-w-3xl flex-col gap-6">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold">Matches</h1>
					<p className="text-sm text-base-content/50">
						{status === "ready"
							? `${items.length} artist${items.length === 1 ? "" : "s"} interested${
									activeGig ? ` in ${activeGig.title}` : ""
								}`
							: "Loading…"}
					</p>
				</div>

				{myGigs.length > 0 && (
					<select
						value={gigFilter}
						onChange={(e) => handleFilterChange(e.target.value)}
						aria-label="Filter by opportunity"
						className="select select-sm rounded-full border-base-content/15 bg-transparent font-normal"
					>
						<option value={ALL_GIGS_VALUE}>All opportunities</option>
						{myGigs.map((gig) => (
							<option key={gig.id} value={gig.id}>
								{gig.title}
							</option>
						))}
					</select>
				)}
			</div>

			{status === "error" && (
				<div className="flex flex-col items-start gap-2 rounded-2xl border border-error/30 bg-error/10 p-4 text-sm text-error">
					<p className="font-medium">Couldn&rsquo;t load matches</p>
					<p className="text-error/80">{error}</p>
				</div>
			)}

			{status === "loading" && (
				<div className="flex h-64 items-center justify-center text-sm text-base-content/50">
					Loading…
				</div>
			)}

			{status === "ready" && items.length === 0 && (
				<div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-base-content/15 text-center text-base-content/50">
					<p className="font-medium">
						{activeGig
							? `No artists have shown interest in ${activeGig.title} yet`
							: "No artists have shown interest yet"}
					</p>
					<p className="text-sm">Interested artists will show up here.</p>
				</div>
			)}

			{status === "ready" && items.length > 0 && (
				<ul className="flex flex-col gap-3">
					{items.map((item) => (
						<InterestedArtistRow
							key={item.swipeId}
							item={item}
							showGig={!activeGig}
							onOpenDetails={() => setDetailItem(item)}
						/>
					))}
				</ul>
			)}

			<InterestedArtistDetailsModal item={detailItem} onClose={() => setDetailItem(null)} />
		</div>
	);
}
