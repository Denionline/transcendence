import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import DesktopArtistDeck from "../features/artists/components/DesktopArtistDeck";
import MobileArtistStack from "../features/artists/components/MobileArtistStack";
import { getNextArtistCandidate, postSwipe } from "../features/swipes/api";
import { matchesCategoryFilter, matchesLocationFilter } from "../features/swipes/filters";
import { mapArtistCandidateToArtist } from "../features/artists/mapCandidate";
import { listMyGigs } from "../features/gigs/api";
import { CATEGORIES } from "../features/opportunities/constants";
import { ApiError } from "../lib/apiClient";
import { useMediaQuery } from "../lib/useMediaQuery";
import type { Artist } from "../features/artists/types";
import type { GigDto } from "../features/gigs/types";

const SORT_OPTIONS = ["Newest", "Nearby"];
const DESKTOP_QUERY = "(min-width: 1024px)";
// GET /swipes/next only ever returns the single next candidate; matching one
// of the active filters means fetching (and permanently skipping past, via
// excludeIds) candidates that don't match until one does. Cap the number of
// skips per slot so a very restrictive filter combination fails fast instead
// of hammering the backend once the pool is exhausted.
const MAX_FETCH_ATTEMPTS = 50;

export default function DiscoverPage() {
	const isDesktop = useMediaQuery(DESKTOP_QUERY);
	// Desktop shows a 3-card deck, mobile a single card at a time — fixed at
	// mount so the initial fetch burst matches whichever layout is live.
	const [slotCount] = useState(() => (window.matchMedia(DESKTOP_QUERY).matches ? 3 : 1));

	// Discipline/location are the real filters — they drive which fetched
	// candidates actually make it into the deck (see fetchMatchingCandidate
	// below). Both are locked to the active opportunity's info, not editable
	// by the hirer: the backend never returns a candidate in any other
	// category or location combination it wasn't already going to return, so
	// letting either be picked freely just produced an honestly-empty deck
	// for every other choice, which read as broken. Shown (disabled) anyway
	// so it's clear *what's* driving the match, not just that it's locked.
	// Both are set (and re-set) only by markFiltersFromGig, never directly by
	// the hirer.
	const [discipline, setDiscipline] = useState<string | null>(null);
	const [locationQuery, setLocationQuery] = useState("");
	const [sort, setSort] = useState(SORT_OPTIONS[0]);

	const [searchParams, setSearchParams] = useSearchParams();
	// GET /swipes/next requires a gigId for hirers — candidates are always
	// reviewed in the context of one of the hirer's own open gigs.
	const [activeGigId, setActiveGigId] = useState<string | null>(searchParams.get("gigId"));
	const [myOpenGigs, setMyOpenGigs] = useState<GigDto[]>([]);
	const [artists, setArtists] = useState<Artist[]>([]);
	const [status, setStatus] = useState<"loading" | "ready" | "error" | "no-gigs">("loading");
	const [error, setError] = useState<string | null>(null);
	// /next is stateless — it deterministically keeps handing back the same
	// not-yet-reviewed candidate until that candidate is actually swiped on.
	// Track every id already pulled into the deck this fetch burst and pass it
	// as excludeIds so the backend skips straight to a genuinely different
	// candidate for each slot. Reset on every re-search (gig switch or filter
	// change) — it only needs to dedupe within one burst.
	const seenIds = useRef<Set<string>>(new Set());
	// Unlike seenIds, this tracks every candidate swiped on for the active gig
	// and is *not* reset when filters change, only when the gig itself does
	// (swipes are recorded per gig). The backend already excludes swiped
	// candidates permanently via the Swipe table, but that exclusion only
	// takes effect once the POST /swipes call actually lands — recording it
	// here too, synchronously, closes the race where changing a filter right
	// after a swipe could re-fetch a card that's mid-flight to being recorded.
	const swipedIds = useRef<Set<string>>(new Set());
	const prevGigIdRef = useRef<string | null>(null);
	// StrictMode runs the fetch effect below twice on mount (and it can also
	// legitimately re-run when the hirer switches gigs). Every run shares the
	// same `seenIds` ref, so without this guard a stale invocation's in-flight
	// request can resolve after a newer one has already reset seenIds and mark
	// the very first real candidate as a false duplicate — the deck ends up
	// empty on first load even though candidates exist (fixed by picking a
	// gig again, since that starts a fresh, non-racing run). Each effect run
	// gets its own generation id; a fetch only commits to seenIds if its
	// generation is still current.
	const generationRef = useRef(0);

	// Discipline is locked to the gig's category on the backend anyway (a
	// candidate never comes back for any other category), and location is
	// the field the hirer is most likely to care about matching too — so
	// selecting an opportunity marks both filters with its info.
	function markFiltersFromGig(gig: GigDto) {
		setDiscipline(gig.category);
		setLocationQuery(gig.location ?? "");
	}

	// Load the hirer's own open gigs — candidates are always reviewed in the
	// context of one specific gig, so default to the first one unless the URL
	// already named one (e.g. arriving via "Search related artists").
	useEffect(() => {
		let cancelled = false;
		listMyGigs({ status: "open" })
			.then((gigs) => {
				if (cancelled) return;
				setMyOpenGigs(gigs);
				if (activeGigId) {
					const gig = gigs.find((g) => g.id === activeGigId);
					if (gig) markFiltersFromGig(gig);
					return;
				}
				if (gigs.length === 0) {
					setStatus("no-gigs");
					return;
				}
				setActiveGigId(gigs[0].id);
				markFiltersFromGig(gigs[0]);
			})
			.catch((err: unknown) => {
				if (cancelled) return;
				setError(err instanceof ApiError ? err.message : "Couldn't load your opportunities.");
				setStatus("error");
			});
		return () => {
			cancelled = true;
		};
		// Only ever run once — activeGigId changes afterwards come from the
		// picker or the URL, not from this initial load.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	async function fetchCandidate(gigId: string, generation: number): Promise<Artist | null> {
		const excludeIds = new Set([...seenIds.current, ...swipedIds.current]);
		const dto = await getNextArtistCandidate(gigId, Array.from(excludeIds));
		if (generation !== generationRef.current) return null;
		if (!dto || excludeIds.has(dto.id)) return null;
		seenIds.current.add(dto.id);
		return mapArtistCandidateToArtist(dto);
	}

	/** Keeps pulling candidates until one clears the active filters, or the pool runs out. */
	async function fetchMatchingCandidate(
		gigId: string,
		generation: number,
		selectedDiscipline: string | null,
		location: string,
	): Promise<Artist | null> {
		for (let attempt = 0; attempt < MAX_FETCH_ATTEMPTS; attempt++) {
			const artist = await fetchCandidate(gigId, generation);
			if (!artist) return null;
			if (
				matchesCategoryFilter(artist.discipline, selectedDiscipline) &&
				matchesLocationFilter(artist.location, location)
			) {
				return artist;
			}
		}
		return null;
	}

	useEffect(() => {
		if (!activeGigId) return;
		if (prevGigIdRef.current !== activeGigId) {
			swipedIds.current = new Set();
			prevGigIdRef.current = activeGigId;
		}
		generationRef.current += 1;
		const generation = generationRef.current;
		seenIds.current = new Set();
		let cancelled = false;
		const selectedDiscipline = discipline;
		const activeLocation = locationQuery;
		(async () => {
			setStatus("loading");
			setArtists([]);
			for (let i = 0; i < slotCount; i++) {
				const artist = await fetchMatchingCandidate(
					activeGigId,
					generation,
					selectedDiscipline,
					activeLocation,
				);
				if (cancelled) return;
				if (!artist) break;
				setArtists((prev) => [...prev, artist]);
			}
			if (!cancelled) setStatus("ready");
		})().catch((err: unknown) => {
			if (cancelled) return;
			setError(err instanceof ApiError ? err.message : "Couldn't load artists. Please try again.");
			setStatus("error");
		});
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeGigId, discipline, locationQuery]);

	function handleGigChange(gigId: string) {
		setActiveGigId(gigId);
		const gig = myOpenGigs.find((g) => g.id === gigId);
		if (gig) markFiltersFromGig(gig);
		setSearchParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				next.set("gigId", gigId);
				return next;
			},
			{ replace: true },
		);
	}

	function handleSwipe(artist: Artist, liked: boolean) {
		if (!activeGigId) return;
		swipedIds.current.add(artist.id);
		postSwipe({ gigId: activeGigId, liked, targetUserId: artist.userId }).catch((err: unknown) => {
			console.error("Failed to record swipe:", err);
		});
		fetchMatchingCandidate(activeGigId, generationRef.current, discipline, locationQuery)
			.then((next) => {
				if (next) setArtists((prev) => [...prev, next]);
			})
			.catch((err: unknown) => {
				console.error("Failed to load next artist:", err);
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
							Locked to this opportunity — every candidate here matches it already.
						</p>
						<div className="flex flex-wrap gap-1.5">
							{CATEGORIES.map((category) => {
								const active = discipline === category;
								return (
									<button
										key={category}
										type="button"
										disabled
										aria-pressed={active}
										className={`btn btn-xs rounded-full font-normal disabled:opacity-100 ${
											active
												? "btn-primary"
												: "btn-outline border-base-content/15 text-base-content/30"
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
						<p className="mb-2 text-xs text-base-content/40">Locked to this opportunity.</p>
						<input
							type="text"
							value={locationQuery}
							disabled
							placeholder="Not specified"
							className="input input-sm w-full rounded-full border-base-content/15 bg-transparent disabled:opacity-100"
						/>
					</div>
				</div>
			</aside>

			<div className="min-w-0 flex-1">
				<div className="mb-6 flex flex-wrap items-end justify-between gap-4">
					<div>
						<h1 className="text-2xl font-semibold">Discover artists</h1>
						<p className="text-sm text-base-content/50">
							{status === "ready"
								? `${artists.length} matches · sorted by ${sort.toLowerCase()}`
								: status === "no-gigs"
									? "No open opportunities yet"
									: "Loading matches…"}
						</p>
					</div>

					<div className="flex items-center gap-2">
						{myOpenGigs.length > 0 && (
							<select
								value={activeGigId ?? ""}
								onChange={(e) => handleGigChange(e.target.value)}
								aria-label="Reviewing for opportunity"
								className="select select-sm rounded-full border-base-content/15 bg-transparent font-normal"
							>
								{myOpenGigs.map((gig) => (
									<option key={gig.id} value={gig.id}>
										{gig.title}
									</option>
								))}
							</select>
						)}

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
				</div>

				{status === "no-gigs" && (
					<div className="flex h-[calc(100vh-19rem)] min-h-105 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-base-content/15 text-center text-base-content/50">
						<p className="font-medium">Post a gig to start discovering artists</p>
						<Link to="/opportunities/new" className="btn btn-primary btn-sm mt-2 rounded-full">
							New opportunity
						</Link>
					</div>
				)}

				{status === "error" && (
					<div className="flex flex-col items-start gap-2 rounded-2xl border border-error/30 bg-error/10 p-4 text-sm text-error">
						<p className="font-medium">Couldn&rsquo;t load artists</p>
						<p className="text-error/80">{error}</p>
					</div>
				)}

				{status === "loading" && (
					<div className="flex h-[calc(100vh-19rem)] min-h-105 items-center justify-center text-sm text-base-content/50">
						Loading matches…
					</div>
				)}

				{status === "ready" &&
					(isDesktop ? (
						<DesktopArtistDeck artists={artists} onSwipe={handleSwipe} />
					) : (
						<MobileArtistStack artists={artists} onSwipe={handleSwipe} />
					))}
			</div>
		</div>
	);
}
