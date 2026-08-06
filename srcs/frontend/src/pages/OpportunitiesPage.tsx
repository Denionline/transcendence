import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import DesktopGigDeck from "../features/opportunities/components/DesktopGigDeck";
import MobileGigStack from "../features/opportunities/components/MobileGigStack";
import { getNextGig, postSwipe } from "../features/swipes/api";
import {
	matchesCategoryFilter,
	matchesLocationFilter,
	matchesMinRateFilter,
} from "../features/swipes/filters";
import { mapGigToListing } from "../features/opportunities/mapGig";
import { CATEGORIES } from "../features/opportunities/constants";
import { fetchMyProfile } from "../features/profile/api";
import { ApiError } from "../lib/apiClient";
import { useMediaQuery } from "../lib/useMediaQuery";
import { useDebouncedValue } from "../lib/useDebouncedValue";
import type { GigListing } from "../features/opportunities/gigTypes";

const SORT_OPTIONS = ["Newest", "Closing soon"];
const DESKTOP_QUERY = "(min-width: 1024px)";
// GET /swipes/next only ever returns the single next candidate; matching one
// of the active filters means fetching (and permanently skipping past, via
// excludeIds) candidates that don't match until one does. Cap the number of
// skips per slot so a very restrictive filter combination fails fast instead
// of hammering the backend once the pool is exhausted.
const MAX_FETCH_ATTEMPTS = 50;

export default function OpportunitiesPage() {
	const isDesktop = useMediaQuery(DESKTOP_QUERY);
	// Desktop shows a 3-card deck, mobile a single card at a time — fixed at
	// mount so the initial fetch burst matches whichever layout is live.
	const [slotCount] = useState(() => (window.matchMedia(DESKTOP_QUERY).matches ? 3 : 1));

	// Discipline/location/rate are the real filters — they drive which
	// fetched gigs actually make it into the deck (see fetchMatchingGig
	// below). Discipline and location start out marked from the artist's own
	// profile since the backend only ever matches gigs to the caller's own
	// category anyway, but both stay freely editable from there. Discipline
	// is single-select — the backend only ever matches one category (the
	// artist's own), so there's never more than one meaningful choice at a
	// time.
	const [discipline, setDiscipline] = useState<string | null>(null);
	const [locationQuery, setLocationQuery] = useState("");
	const [minRateInput, setMinRateInput] = useState("");
	const debouncedLocation = useDebouncedValue(locationQuery, 300);
	const debouncedMinRateInput = useDebouncedValue(minRateInput, 300);
	const [sort, setSort] = useState(SORT_OPTIONS[0]);

	const [gigs, setGigs] = useState<GigListing[]>([]);
	const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
	const [error, setError] = useState<string | null>(null);
	// /next is stateless — it deterministically keeps handing back the same
	// not-yet-swiped gig until that gig is actually swiped on. Track every id
	// already pulled into the deck this fetch burst and pass it as excludeIds
	// so the backend skips straight to a genuinely different gig for each
	// slot. Reset on every re-search (filter change) — it only needs to
	// dedupe within one burst.
	const seenIds = useRef<Set<string>>(new Set());
	// Unlike seenIds, this tracks every gig swiped on for the whole session
	// and is never reset by a filter change. The backend already excludes
	// swiped gigs permanently via the Swipe table, but that exclusion only
	// takes effect once the POST /swipes call actually lands — recording it
	// here too, synchronously, closes the race where changing a filter right
	// after a swipe could re-fetch a gig that's mid-flight to being recorded.
	const swipedIds = useRef<Set<string>>(new Set());
	// StrictMode runs this effect twice on mount (mount → cleanup → mount
	// again). Both invocations share the same `seenIds` ref, so without this
	// guard the first (cancelled) invocation's in-flight request can still
	// resolve and mark a gig as "seen" after the second, live invocation has
	// already reset seenIds — making the live fetch wrongly skip the very
	// first candidate as a false duplicate. Each effect run gets its own
	// generation id, and a fetch only commits to seenIds if its generation is
	// still the current one.
	const generationRef = useRef(0);

	// Load the artist's own category/location once to mark the filters with
	// it — the backend only ever hands back gigs in the caller's own
	// category, so that's what's really driving results here.
	useEffect(() => {
		let cancelled = false;
		fetchMyProfile()
			.then((profile) => {
				if (cancelled) return;
				setDiscipline(profile.category);
				setLocationQuery(profile.location ?? "");
			})
			.catch((err: unknown) => {
				console.error("Failed to load your profile for filter defaults:", err);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	async function fetchGig(generation: number): Promise<GigListing | null> {
		const excludeIds = new Set([...seenIds.current, ...swipedIds.current]);
		const dto = await getNextGig(Array.from(excludeIds));
		if (generation !== generationRef.current) return null;
		if (!dto || excludeIds.has(dto.id)) return null;
		seenIds.current.add(dto.id);
		return mapGigToListing(dto);
	}

	/** Keeps pulling gigs until one clears the active filters, or the pool runs out. */
	async function fetchMatchingGig(
		generation: number,
		selectedDiscipline: string | null,
		location: string,
		minRateText: string,
	): Promise<GigListing | null> {
		const minRate = minRateText.trim() === "" ? null : Number(minRateText);
		for (let attempt = 0; attempt < MAX_FETCH_ATTEMPTS; attempt++) {
			const gig = await fetchGig(generation);
			if (!gig) return null;
			if (
				matchesCategoryFilter(gig.category, selectedDiscipline) &&
				matchesLocationFilter(gig.location, location) &&
				matchesMinRateFilter(gig.rate, minRate)
			) {
				return gig;
			}
		}
		return null;
	}

	useEffect(() => {
		generationRef.current += 1;
		const generation = generationRef.current;
		seenIds.current = new Set();
		let cancelled = false;
		const selectedDiscipline = discipline;
		const activeLocation = debouncedLocation;
		const activeMinRateInput = debouncedMinRateInput;
		(async () => {
			setStatus("loading");
			setGigs([]);
			for (let i = 0; i < slotCount; i++) {
				const gig = await fetchMatchingGig(
					generation,
					selectedDiscipline,
					activeLocation,
					activeMinRateInput,
				);
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
	}, [discipline, debouncedLocation, debouncedMinRateInput]);

	// Clicking a chip replaces the previous selection (or clears it, if the
	// same chip is clicked again) instead of accumulating — see the comment
	// on matchesCategoryFilter for why multi-select never made sense here.
	function selectDiscipline(category: string) {
		setDiscipline((prev) => (prev === category ? null : category));
	}

	function handleSwipe(gig: GigListing, liked: boolean) {
		swipedIds.current.add(gig.id);
		postSwipe({ gigId: gig.id, liked }).catch((err: unknown) => {
			console.error("Failed to record swipe:", err);
		});
		fetchMatchingGig(generationRef.current, discipline, debouncedLocation, debouncedMinRateInput)
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
						<h3 className="mb-1 text-xs font-medium tracking-wide text-base-content/50 uppercase">
							Discipline
						</h3>
						<p className="mb-2 text-xs text-base-content/40">
							Pre-filled from your artist category — adjust anytime.
						</p>
						<div className="flex flex-wrap gap-1.5">
							{CATEGORIES.map((category) => {
								const active = discipline === category;
								return (
									<button
										key={category}
										type="button"
										aria-pressed={active}
										onClick={() => selectDiscipline(category)}
										className={`btn btn-xs rounded-full font-normal ${
											active ? "btn-primary" : "btn-outline border-base-content/20"
										}`}
									>
										{category}
									</button>
								);
							})}
						</div>
					</div>

					<div>
						<h3 className="mb-1 text-xs font-medium tracking-wide text-base-content/50 uppercase">
							Location
						</h3>
						<p className="mb-2 text-xs text-base-content/40">
							Pre-filled from your profile — adjust anytime.
						</p>
						<input
							type="text"
							value={locationQuery}
							onChange={(e) => setLocationQuery(e.target.value)}
							placeholder="e.g. Berlin, remote…"
							className="input input-sm w-full rounded-full border-base-content/15 bg-transparent"
						/>
					</div>

					<div>
						<h3 className="mb-2 text-xs font-medium tracking-wide text-base-content/50 uppercase">
							Minimum rate
						</h3>
						<input
							type="number"
							min={0}
							value={minRateInput}
							onChange={(e) => setMinRateInput(e.target.value)}
							placeholder="e.g. 500"
							className="input input-sm w-full rounded-full border-base-content/15 bg-transparent"
						/>
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
