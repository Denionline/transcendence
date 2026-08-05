import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import DesktopGigDeck from "../features/opportunities/components/DesktopGigDeck";
import MobileGigStack from "../features/opportunities/components/MobileGigStack";
import { getNextGig, postSwipe } from "../features/swipes/api";
import { mapGigToListing } from "../features/opportunities/mapGig";
import { ApiError } from "../lib/apiClient";
import { useMediaQuery } from "../lib/useMediaQuery";
import type { GigListing } from "../features/opportunities/gigTypes";

const GIG_TYPES = ["Mural", "Illustration", "Set design", "Lettering"];
const SORT_OPTIONS = ["Newest", "Best match", "Closing soon"];
const DESKTOP_QUERY = "(min-width: 1024px)";

export default function OpportunitiesPage() {
	const isDesktop = useMediaQuery(DESKTOP_QUERY);
	// Desktop shows a 3-card deck, mobile a single card at a time — fixed at
	// mount so the initial fetch burst matches whichever layout is live.
	const [slotCount] = useState(() => (window.matchMedia(DESKTOP_QUERY).matches ? 3 : 1));
	const [gigTypes, setGigTypes] = useState<Set<string>>(new Set(["Set design"]));
	const [duration, setDuration] = useState<"any" | "short">("any");
	const [remoteOnly, setRemoteOnly] = useState(false);
	const [sort, setSort] = useState(SORT_OPTIONS[0]);

	const [gigs, setGigs] = useState<GigListing[]>([]);
	const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
	const [error, setError] = useState<string | null>(null);
	// /next is stateless — it deterministically keeps handing back the same
	// not-yet-swiped gig until that gig is actually swiped on. Track every id
	// already pulled into the deck this session and pass it as excludeIds so
	// the backend skips straight to a genuinely different gig for each slot.
	const seenIds = useRef<Set<string>>(new Set());

	async function fetchOne(): Promise<GigListing | null> {
		const dto = await getNextGig(Array.from(seenIds.current));
		if (!dto || seenIds.current.has(dto.id)) return null;
		seenIds.current.add(dto.id);
		return mapGigToListing(dto);
	}

	useEffect(() => {
		let cancelled = false;
		(async () => {
			for (let i = 0; i < slotCount; i++) {
				const gig = await fetchOne();
				if (cancelled) return;
				if (!gig) break;
				setGigs((prev) => [...prev, gig]);
			}
			if (!cancelled) setStatus("ready");
		})().catch((err: unknown) => {
			if (cancelled) return;
			setError(err instanceof ApiError ? err.message : "Couldn't load gigs. Please try again.");
			setStatus("error");
		});
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	function toggleGigType(type: string) {
		setGigTypes((prev) => {
			const next = new Set(prev);
			if (next.has(type)) next.delete(type);
			else next.add(type);
			return next;
		});
	}

	function handleSwipe(gig: GigListing, liked: boolean) {
		postSwipe({ gigId: gig.id, liked }).catch((err: unknown) => {
			console.error("Failed to record swipe:", err);
		});
		fetchOne()
			.then((next) => {
				if (next) setGigs((prev) => [...prev, next]);
			})
			.catch((err: unknown) => {
				console.error("Failed to load next gig:", err);
			});
	}

	return (
		<div className="flex flex-col gap-8 lg:mx-[calc(50%-50vw)] lg:flex-row lg:items-start lg:px-10">
			<aside className="hidden w-56 shrink-0 lg:block">
				<h2 className="mb-4 text-sm font-semibold">Filters</h2>

				<div className="flex flex-col gap-6 text-sm">
					<div>
						<h3 className="mb-2 text-xs font-medium tracking-wide text-base-content/50 uppercase">
							Gig type
						</h3>
						<div className="flex flex-col gap-2">
							{GIG_TYPES.map((type) => (
								<label key={type} className="flex cursor-pointer items-center gap-2">
									<input
										type="checkbox"
										className="checkbox checkbox-sm checkbox-primary"
										checked={gigTypes.has(type)}
										onChange={() => toggleGigType(type)}
									/>
									<span>{type}</span>
								</label>
							))}
						</div>
					</div>

					<div>
						<h3 className="mb-2 text-xs font-medium tracking-wide text-base-content/50 uppercase">
							Duration
						</h3>
						<div className="flex flex-wrap gap-2">
							<button
								type="button"
								onClick={() => setDuration("any")}
								className={`btn btn-sm rounded-full ${
									duration === "any" ? "btn-primary" : "btn-outline border-base-content/20"
								}`}
							>
								Any
							</button>
							<button
								type="button"
								onClick={() => setDuration("short")}
								className={`btn btn-sm rounded-full ${
									duration === "short" ? "btn-primary" : "btn-outline border-base-content/20"
								}`}
							>
								≤ 1 wk
							</button>
						</div>
					</div>

					<div>
						<h3 className="mb-2 text-xs font-medium tracking-wide text-base-content/50 uppercase">
							Location
						</h3>
						<label className="flex cursor-pointer items-center gap-2">
							<input
								type="checkbox"
								className="checkbox checkbox-sm checkbox-primary"
								checked={remoteOnly}
								onChange={() => setRemoteOnly((v) => !v)}
							/>
							<span>Remote</span>
						</label>
					</div>
				</div>
			</aside>

			<div className="min-w-0 flex-1">
				<div className="mb-6 flex flex-wrap items-end justify-between gap-4">
					<div>
						<h1 className="text-2xl font-semibold">Opportunities</h1>
						<p className="text-sm text-base-content/50">
							{status === "ready"
								? `${gigs.length} gigs · sorted by ${sort.toLowerCase()}`
								: "Loading gigs…"}
						</p>
					</div>

					<div className="dropdown dropdown-end hidden lg:block">
						<div
							tabIndex={0}
							role="button"
							className="btn btn-sm rounded-full border-base-content/15 bg-transparent font-normal"
						>
							{sort}
							<ChevronDownIcon className="size-4" aria-hidden="true" />
						</div>
						<ul
							tabIndex={0}
							className="menu dropdown-content menu-sm z-1 mt-2 w-40 rounded-box bg-base-100 p-2 shadow"
						>
							{SORT_OPTIONS.map((option) => (
								<li key={option}>
									<button type="button" onClick={() => setSort(option)}>
										{option}
									</button>
								</li>
							))}
						</ul>
					</div>
				</div>

				{status === "error" && (
					<div className="flex flex-col items-start gap-2 rounded-2xl border border-error/30 bg-error/10 p-4 text-sm text-error">
						<p className="font-medium">Couldn&rsquo;t load gigs</p>
						<p className="text-error/80">{error}</p>
					</div>
				)}

				{status === "loading" && (
					<div className="flex h-[calc(100vh-19rem)] min-h-105 items-center justify-center text-sm text-base-content/50">
						Loading gigs…
					</div>
				)}

				{status === "ready" &&
					(isDesktop ? (
						<DesktopGigDeck gigs={gigs} onSwipe={handleSwipe} />
					) : (
						<MobileGigStack gigs={gigs} onSwipe={handleSwipe} />
					))}
			</div>
		</div>
	);
}
