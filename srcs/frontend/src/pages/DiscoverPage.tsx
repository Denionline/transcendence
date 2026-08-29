import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronDownIcon } from "lucide-react";
import DesktopArtistDeck from "../features/artists/components/DesktopArtistDeck";
import MobileArtistStack from "../features/artists/components/MobileArtistStack";
import { getNextArtistCandidate, postSwipe } from "../features/swipes/api";
import { matchesAvailabilityFilter, matchesLocationFilter } from "../features/swipes/filters";
import { mapArtistCandidateToArtist } from "../features/artists/mapCandidate";
import { listMyGigs } from "../features/gigs/api";
import { ApiError } from "../lib/apiClient";
import { useMediaQuery } from "../lib/useMediaQuery";
import type { Artist } from "../features/artists/types";
import type { GigDto } from "../features/gigs/types";
import { useCategories } from "../features/categories/hooks/useCategories";
import FiltersPanel, { FiltersToggle } from "../components/FiltersPanel";
import { useTranslation } from "react-i18next";

// The discipline facet is a real, live multi-select: checking a category
// sends it straight to GET /swipes/next (see getNextCandidateForHirer on the
// backend), which widens the candidate pool to any artist sharing at least
// one of the checked categories — for this browse only, nothing is written
// back to the gig itself. Liking a candidate outside the gig's *actual*
// category still fails CATEGORY_MISMATCH at swipe time (see
// verifyCategoryMatch) — broadening the browse doesn't broaden eligibility,
// it just lets the hirer look. handleSwipe surfaces that failure below.
//	Labels are i18n keys, resolved at render — a module constant is evaluated
//	once at import, so a translated string here would freeze in whatever
//	language was active on first load.
const AVAILABILITY_OPTIONS: { value: "available" | "soon" | null; labelKey: string }[] = [
	{ value: null, labelKey: "filters.any" },
	{ value: "available", labelKey: "filters.availableNow" },
	{ value: "soon", labelKey: "filters.availableSoon" },
];
const DESKTOP_QUERY = "(min-width: 1024px)";
// GET /swipes/next only ever returns the single next candidate; matching one
// of the active filters means fetching (and permanently skipping past, via
// excludeIds) candidates that don't match until one does. Cap the number of
// skips per slot so a very restrictive filter combination fails fast instead
// of hammering the backend once the pool is exhausted.
const MAX_FETCH_ATTEMPTS = 50;

export default function DiscoverPage() {
	const { t } = useTranslation();
	const isDesktop = useMediaQuery(DESKTOP_QUERY);
	// Desktop shows a 3-card deck, mobile a single card at a time — fixed at
	// mount so the initial fetch burst matches whichever layout is live.
	const [slotCount] = useState(() => (window.matchMedia(DESKTOP_QUERY).matches ? 3 : 1));
	const { categories } = useCategories();
	const [disciplines, setDisciplines] = useState<Set<string>>(new Set());
	const [availability, setAvailability] = useState<"available" | "soon" | null>(null);
	const [locationQuery, setLocationQuery] = useState("");
	const [filtersOpen, setFiltersOpen] = useState(false);
	// Set when a like fails because the candidate's category doesn't actually
	// match the gig's (see the comment above) — a real possibility once the
	// hirer has broadened discipline past the gig's own category.
	const [swipeNotice, setSwipeNotice] = useState<string | null>(null);

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

	// The gig's own category is always a safe default selection — every
	// candidate for it already matches — and location is the field the hirer
	// is most likely to care about matching too. Both are just a starting
	// point; the hirer can broaden discipline further afterward (see the
	// comment above), though location stays locked to the gig.
	function markFiltersFromGig(gig: GigDto) {
		setDisciplines(new Set([gig.category.slug]));
		setLocationQuery(gig.location ?? "");
	}

	function toggleDiscipline(slug: string) {
		setDisciplines((prev) => {
			const next = new Set(prev);
			if (next.has(slug)) next.delete(slug);
			else next.add(slug);
			return next;
		});
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
				setError(err instanceof ApiError ? err.message : t("discover.loadOpportunitiesFailed"));
				setStatus("error");
			});
		return () => {
			cancelled = true;
		};
		// Only ever run once — activeGigId changes afterwards come from the
		// picker or the URL, not from this initial load.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	async function fetchCandidate(
		gigId: string,
		generation: number,
		categorySlugs: string[],
	): Promise<Artist | null> {
		const excludeIds = new Set([...seenIds.current, ...swipedIds.current]);
		const dto = await getNextArtistCandidate(gigId, Array.from(excludeIds), categorySlugs);
		if (generation !== generationRef.current) return null;
		if (!dto || excludeIds.has(dto.id)) return null;
		seenIds.current.add(dto.id);
		return mapArtistCandidateToArtist(dto);
	}

	/**
	 * Keeps pulling candidates until one clears the active filters, or the pool
	 * runs out. Discipline itself is already applied server-side (see
	 * fetchCandidate); location and availability are the two GET /swipes/next
	 * has no params for, so they're still checked here against whatever the
	 * backend streams back.
	 */
	async function fetchMatchingCandidate(
		gigId: string,
		generation: number,
		selectedDisciplines: Set<string>,
		location: string,
		selectedAvailability: "available" | "soon" | null,
	): Promise<Artist | null> {
		const categorySlugs = Array.from(selectedDisciplines);
		for (let attempt = 0; attempt < MAX_FETCH_ATTEMPTS; attempt++) {
			const artist = await fetchCandidate(gigId, generation, categorySlugs);
			if (!artist) return null;
			if (
				matchesLocationFilter(artist.location, location) &&
				matchesAvailabilityFilter(artist.availabilityTone, selectedAvailability)
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
		const selectedDisciplines = disciplines;
		const activeLocation = locationQuery;
		const selectedAvailability = availability;
		(async () => {
			setStatus("loading");
			setArtists([]);
			for (let i = 0; i < slotCount; i++) {
				const artist = await fetchMatchingCandidate(
					activeGigId,
					generation,
					selectedDisciplines,
					activeLocation,
					selectedAvailability,
				);
				if (cancelled) return;
				if (!artist) break;
				setArtists((prev) => [...prev, artist]);
			}
			if (!cancelled) setStatus("ready");
		})().catch((err: unknown) => {
			if (cancelled) return;
			setError(err instanceof ApiError ? err.message : t("discover.loadFailed"));
			setStatus("error");
		});
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeGigId, disciplines, locationQuery, availability]);

	function switchToGig(gigId: string, gig?: GigDto) {
		setActiveGigId(gigId);
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

	function handleGigChange(gigId: string) {
		switchToGig(
			gigId,
			myOpenGigs.find((g) => g.id === gigId),
		);
	}

	const activeGig = myOpenGigs.find((g) => g.id === activeGigId) ?? null;

	async function handleSwipe(artist: Artist, liked: boolean) {
		if (!activeGigId) return;
		const gigId = activeGigId;
		swipedIds.current.add(artist.id);
		let matched = false;
		try {
			const result = await postSwipe({ gigId, liked, targetUserId: artist.userId });
			matched = Boolean(result.matchId);
		} catch (err: unknown) {
			// A broadened discipline selection can surface a candidate outside the
			// gig's real category — liking them is always rejected server-side
			// (see verifyCategoryMatch). Worth telling the hirer why nothing
			// happened instead of just swallowing it like other swipe failures.
			if (err instanceof ApiError && err.code === "CATEGORY_MISMATCH") {
				setSwipeNotice(t("discover.notEligible", { name: artist.name }));
				window.setTimeout(() => setSwipeNotice(null), 4000);
			}
			// Any other failure just leaves `matched` false below — the deck
			// moves on the same as a normal, unmatched swipe.
		}

		if (matched) {
			// A match auto-closes the gig server-side (see swipe.service.ts). Pulling
			// more candidates for it would now fail every time with GIG_CLOSED, so
			// drop it from the picker and hop to another open gig ourselves instead
			// of the deck silently stalling on repeated failed fetches below.
			const remaining = myOpenGigs.filter((g) => g.id !== gigId);
			setMyOpenGigs(remaining);
			if (remaining.length > 0) {
				switchToGig(remaining[0].id, remaining[0]);
			} else {
				setActiveGigId(null);
				setStatus("no-gigs");
			}
			return;
		}

		fetchMatchingCandidate(gigId, generationRef.current, disciplines, locationQuery, availability)
			.then((next) => {
				if (next) setArtists((prev) => [...prev, next]);
			})
			.catch(() => {
				// Deck just stays one card short — the next swipe tries again.
			});
	}

	return (
		<div className="flex flex-col lg:mx-[calc(50%-50vw)] lg:flex-row lg:items-start lg:px-10">
			<FiltersPanel open={filtersOpen} onClose={() => setFiltersOpen(false)}>
				<div>
					<h3 className="mb-1 text-xs font-medium tracking-wide text-base-content/50 uppercase">
						{t("filters.discipline")}
					</h3>
					<p className="mb-2 text-xs text-base-content/40">
						Starts on this opportunity&rsquo;s own category — check more to browse other disciplines
						too. A like still only counts within the gig&rsquo;s real category.
					</p>
					<div className="flex flex-wrap gap-1.5">
						{categories.map((category) => (
							<button
								key={category.slug}
								type="button"
								onClick={() => toggleDiscipline(category.slug)}
								aria-pressed={disciplines.has(category.slug)}
								className={`btn btn-xs rounded-full font-normal ${
									disciplines.has(category.slug)
										? "btn-primary"
										: "btn-outline border-base-content/15 text-base-content/30"
								}`}
							>
								{category.label}
							</button>
						))}
					</div>
				</div>

				<div>
					<h3 className="mb-1 text-xs font-medium tracking-wide text-base-content/50 uppercase">
						{t("filters.availability")}
					</h3>
					<div className="flex flex-wrap gap-1.5">
						{AVAILABILITY_OPTIONS.map((option) => (
							<button
								key={option.labelKey}
								type="button"
								onClick={() => setAvailability(option.value)}
								aria-pressed={availability === option.value}
								className={`btn btn-xs rounded-full font-normal ${
									availability === option.value
										? "btn-primary"
										: "btn-outline border-base-content/15 text-base-content/30"
								}`}
							>
								{t(option.labelKey)}
							</button>
						))}
					</div>
				</div>

				<div>
					<h3 className="mb-1 text-xs font-medium tracking-wide text-base-content/50 uppercase">
						{t("filters.location")}
					</h3>
					<p className="mb-2 text-xs text-base-content/40">{t("filters.lockedToOpportunity")}</p>
					<input
						type="text"
						value={locationQuery}
						disabled
						placeholder={t("filters.notSpecified")}
						className="input input-sm w-full rounded-full border-base-content/15 bg-transparent disabled:opacity-100"
					/>
				</div>
			</FiltersPanel>

			<div className="min-w-0 flex-1">
				<div className="mb-6 flex flex-wrap items-end justify-between gap-4">
					<div>
						<h1 className="text-2xl font-semibold">{t("discover.title")}</h1>
					</div>

					<div className="flex items-center gap-2">
						<FiltersToggle open={filtersOpen} onToggle={() => setFiltersOpen((open) => !open)} />
						{myOpenGigs.length > 0 && (
							<div className="dropdown dropdown-end">
								<div
									tabIndex={0}
									role="button"
									aria-label={t("discover.reviewingForOpportunity")}
									className="btn btn-sm gap-1.5 rounded-full border-base-content/15 bg-transparent font-normal"
								>
									<span className="max-w-40 truncate sm:max-w-48">
										{activeGig?.title ?? t("discover.selectOpportunity")}
									</span>
									<ChevronDownIcon className="size-3.5 text-base-content/50" aria-hidden="true" />
								</div>
								<ul
									tabIndex={0}
									className="menu dropdown-content z-20 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-box border border-base-content/10 bg-base-100 p-2 shadow-lg menu-sm"
								>
									<li className="menu-title">{t("discover.reviewingFor")}</li>
									{myOpenGigs.map((gig) => (
										<li key={gig.id}>
											<button
												type="button"
												aria-current={gig.id === activeGigId}
												className={gig.id === activeGigId ? "active" : ""}
												onClick={(e) => {
													handleGigChange(gig.id);
													e.currentTarget.blur();
												}}
											>
												<span className="min-w-0 flex-1 truncate">{gig.title}</span>
												<span className="badge badge-ghost badge-sm shrink-0">
													{gig.category.label}
												</span>
											</button>
										</li>
									))}
								</ul>
							</div>
						)}
					</div>
				</div>

				{swipeNotice && (
					<div className="alert alert-warning mb-4 py-2 text-sm">
						<span>{swipeNotice}</span>
					</div>
				)}

				{status === "no-gigs" && (
					<div className="flex h-[calc(100vh-19rem)] min-h-105 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-base-content/15 text-center text-base-content/50">
						<p className="font-medium">{t("discover.postGigToStart")}</p>
						<Link to="/opportunities/new" className="btn btn-primary btn-sm mt-2 rounded-full">
							{t("discover.newOpportunity")}
						</Link>
					</div>
				)}

				{status === "error" && (
					<div className="flex flex-col items-start gap-2 rounded-2xl border border-error/30 bg-error/10 p-4 text-sm text-error">
						<p className="font-medium">{t("discover.couldntLoadArtists")}</p>
						<p className="text-error/80">{error}</p>
					</div>
				)}

				{status === "loading" && (
					<div className="flex h-[calc(100vh-19rem)] min-h-105 items-center justify-center text-sm text-base-content/50">
						{t("discover.loadingArtists")}
					</div>
				)}

				{status === "ready" &&
					(isDesktop ? (
						<DesktopArtistDeck
							artists={artists}
							selectedDisciplines={disciplines}
							onSwipe={handleSwipe}
						/>
					) : (
						<MobileArtistStack
							artists={artists}
							selectedDisciplines={disciplines}
							onSwipe={handleSwipe}
						/>
					))}
			</div>
		</div>
	);
}
