import { useEffect, useRef, useState } from "react";
import DesktopGigDeck from "../features/opportunities/components/DesktopGigDeck";
import MobileGigStack from "../features/opportunities/components/MobileGigStack";
import { getNextGig, postSwipe } from "../features/swipes/api";
import {
	matchesDisciplineFilter,
	matchesLocationFilter,
	matchesMinRateFilter,
} from "../features/swipes/filters";
import { mapGigToListing } from "../features/opportunities/mapGig";
import { useAuth } from "../features/auth/hooks/useAuth";
import { fetchMyProfile } from "../features/profile/api";
import { onProfileUpdated } from "../features/profile/profileEvents";
import { useMediaQuery } from "../lib/useMediaQuery";
import type { GigListing } from "../features/opportunities/gigTypes";
import type { CategoryDto } from "../features/categories/types";

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

	const { user } = useAuth();

	// Discipline/location/rate are the real filters — they drive which
	// fetched gigs actually make it into the deck (see fetchMatchingGig
	// below). The backend widens the feed to every category the artist holds
	// (see getNextGigForArtist) and never further than that — a gig outside
	// the artist's own categories would fail CATEGORY_MISMATCH at swipe time
	// anyway (see verifyCategoryMatch) — so the discipline facet only ever
	// lists (and defaults to) the artist's own categories, not the full
	// vocabulary: checking any of them narrows to gigs in just those, and
	// there's nothing outside that set to broaden into. Location stays locked
	// to the artist's own profile (not editable here). Both are set (and
	// re-set) once the artist's profile loads.
	//
	// Rate is the one other real, editable filter. `minRateInput` is the
	// *draft* value bound to its input — editing it doesn't search by
	// itself. The search only reacts to `appliedMinRateInput`, which only
	// changes when the artist hits "Apply filters".
	const [myCategories, setMyCategories] = useState<CategoryDto[]>([]);
	const [disciplines, setDisciplines] = useState<Set<string>>(new Set());
	const [locationQuery, setLocationQuery] = useState("");
	const [minRateInput, setMinRateInput] = useState("");
	const [appliedMinRateInput, setAppliedMinRateInput] = useState("");

	const [gigs, setGigs] = useState<GigListing[]>([]);
	const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
	// Bumped on every "Try again" click, and whenever the artist's profile
	// changes elsewhere (see the effect below) — included in the gig-loading
	// effect's deps purely to force a retry; its value is never read.
	const [retryToken, setRetryToken] = useState(0);
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

	// Bumped whenever the artist's profile changes elsewhere in the app (e.g.
	// finishing the mandatory onboarding category picker while this page sits
	// mounted underneath it, having already failed once with no profile to
	// read yet) — forces both effects below to redo their fetch instead of
	// sitting on a stale miss until a manual reload.
	const [profileVersion, setProfileVersion] = useState(0);
	useEffect(
		() =>
			onProfileUpdated(() => {
				setProfileVersion((v) => v + 1);
				setRetryToken((t) => t + 1);
			}),
		[],
	);

	function toggleDiscipline(slug: string) {
		setDisciplines((prev) => {
			const next = new Set(prev);
			if (next.has(slug)) next.delete(slug);
			else next.add(slug);
			return next;
		});
	}

	// Load the artist's own categories/location to mark the filters with
	// them — the backend widens the feed to every category the artist
	// holds, so that's the sensible starting selection here.
	useEffect(() => {
		if (!user) return;
		let cancelled = false;
		fetchMyProfile(user.id)
			.then((profile) => {
				if (cancelled) return;
				setMyCategories(profile.categories);
				setDisciplines(new Set(profile.categories.map((category) => category.slug)));
				setLocationQuery(profile.location ?? "");
			})
			.catch(() => {
				// Filters just stay at their defaults (empty) — the gig feed
				// itself still loads fine without them.
			});
		return () => {
			cancelled = true;
		};
	}, [user, profileVersion]);

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
		selectedDisciplines: Set<string>,
		location: string,
		minRateText: string,
	): Promise<GigListing | null> {
		const minRate = minRateText.trim() === "" ? null : Number(minRateText);
		for (let attempt = 0; attempt < MAX_FETCH_ATTEMPTS; attempt++) {
			const gig = await fetchGig(generation);
			if (!gig) return null;
			if (
				matchesDisciplineFilter([gig.category], selectedDisciplines) &&
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
		const selectedDisciplines = disciplines;
		const activeLocation = locationQuery;
		const activeMinRateInput = appliedMinRateInput;
		(async () => {
			setStatus("loading");
			setGigs([]);
			for (let i = 0; i < slotCount; i++) {
				const gig = await fetchMatchingGig(
					generation,
					selectedDisciplines,
					activeLocation,
					activeMinRateInput,
				);
				if (cancelled) return;
				if (!gig) break;
				setGigs((prev) => [...prev, gig]);
			}
			if (!cancelled) setStatus("ready");
		})().catch(() => {
			if (cancelled) return;
			// The backend message (e.g. "artist profile not found") is an
			// internal detail, not something to surface as-is — a neutral
			// error state is enough here.
			setStatus("error");
		});
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [disciplines, locationQuery, appliedMinRateInput, retryToken]);

	const hasPendingFilterChanges = minRateInput !== appliedMinRateInput;

	function applyFilters() {
		setAppliedMinRateInput(minRateInput);
	}

	function retry() {
		setRetryToken((t) => t + 1);
	}

	function handleSwipe(gig: GigListing, liked: boolean) {
		swipedIds.current.add(gig.id);
		// The swipe itself is fire-and-forget from the card's perspective — the
		// deck has already moved on by the time a failure could come back.
		postSwipe({ gigId: gig.id, liked }).catch(() => {});
		fetchMatchingGig(generationRef.current, disciplines, locationQuery, appliedMinRateInput)
			.then((next) => {
				if (next) setGigs((prev) => [...prev, next]);
			})
			.catch(() => {
				// Deck just stays one card short — the next swipe tries again.
			});
	}

	return (
		<div className="flex flex-col gap-8 lg:mx-[calc(50%-50vw)] lg:flex-row lg:items-start lg:px-10">
			<aside className="hidden w-56 shrink-0 lg:block">
				<div className="mb-4 flex items-center justify-between gap-2">
					<h2 className="text-sm font-semibold">Filters</h2>
					<button
						type="button"
						onClick={applyFilters}
						disabled={!hasPendingFilterChanges}
						className="btn btn-primary btn-xs rounded-full disabled:opacity-30"
					>
						Apply filters
					</button>
				</div>

				<div className="flex flex-col gap-6 text-sm">
					<div>
						<h3 className="mb-1 text-xs font-medium tracking-wide text-base-content/50 uppercase">
							Discipline
						</h3>
						<p className="mb-2 text-xs text-base-content/40">
							Your own categories — every gig here matches at least one already. Add more from
							Settings to widen this list.
						</p>
						<div className="flex flex-wrap gap-1.5">
							{myCategories.map((category) => (
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
							Location
						</h3>
						<p className="mb-2 text-xs text-base-content/40">Locked to your profile.</p>
						<input
							type="text"
							value={locationQuery}
							disabled
							placeholder="Not specified"
							className="input input-sm w-full rounded-full border-base-content/15 bg-transparent disabled:opacity-100"
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
							onKeyDown={(e) => {
								if (e.key === "Enter") applyFilters();
							}}
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
					</div>
				</div>

				{status === "error" && (
					<div className="flex h-[calc(100vh-19rem)] min-h-105 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-base-content/15 text-center text-base-content/50">
						<p className="font-medium">No gigs to show right now</p>
						<p className="text-sm">Give it another try in a moment.</p>
						<button type="button" onClick={retry} className="btn btn-sm mt-2 rounded-full">
							Try again
						</button>
					</div>
				)}

				{status === "loading" && (
					<div className="flex h-[calc(100vh-19rem)] min-h-105 items-center justify-center text-sm text-base-content/50">
						Loading gigs…
					</div>
				)}

				{status === "ready" &&
					(isDesktop ? (
						<DesktopGigDeck gigs={gigs} selectedDisciplines={disciplines} onSwipe={handleSwipe} />
					) : (
						<MobileGigStack gigs={gigs} selectedDisciplines={disciplines} onSwipe={handleSwipe} />
					))}
			</div>
		</div>
	);
}
