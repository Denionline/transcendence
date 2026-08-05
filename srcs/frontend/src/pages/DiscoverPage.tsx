import { useEffect, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import DesktopArtistDeck from "../features/artists/components/DesktopArtistDeck";
import MobileArtistStack from "../features/artists/components/MobileArtistStack";
import PickGigModal from "../features/artists/components/PickGigModal";
import { getNextArtistCandidate, postSwipe } from "../features/swipes/api";
import { mapArtistCandidateToArtist } from "../features/artists/mapCandidate";
import { listMyGigs } from "../features/gigs/api";
import { ApiError } from "../lib/apiClient";
import { useMediaQuery } from "../lib/useMediaQuery";
import type { Artist } from "../features/artists/types";
import type { GigDto } from "../features/gigs/types";

const DISCIPLINES = ["Illustration", "Photography", "Motion & 3D", "Mural & street"];
const SORT_OPTIONS = ["Best match", "Newest", "Nearby"];
const DESKTOP_QUERY = "(min-width: 1024px)";
const ALL_ARTISTS_VALUE = "";

export default function DiscoverPage() {
	const isDesktop = useMediaQuery(DESKTOP_QUERY);
	// Desktop shows a 3-card deck, mobile a single card at a time — fixed at
	// mount so the initial fetch burst matches whichever layout is live.
	const [slotCount] = useState(() => (window.matchMedia(DESKTOP_QUERY).matches ? 3 : 1));
	const [disciplines, setDisciplines] = useState<Set<string>>(new Set(["Motion & 3D"]));
	const [availability, setAvailability] = useState<"now" | "soon" | null>("now");
	const [remoteOnly, setRemoteOnly] = useState(false);
	const [sort, setSort] = useState(SORT_OPTIONS[0]);

	const [searchParams, setSearchParams] = useSearchParams();
	// No gigId in the URL means "browse everyone" — a hirer can look at artist
	// cards without an opportunity to review them against.
	const [activeGigId, setActiveGigId] = useState<string | null>(searchParams.get("gigId"));
	const [myOpenGigs, setMyOpenGigs] = useState<GigDto[]>([]);
	const [artists, setArtists] = useState<Artist[]>([]);
	const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
	const [error, setError] = useState<string | null>(null);
	const [pendingInterest, setPendingInterest] = useState<Artist | null>(null);

	// The hirer's own open gigs — used for the "reviewing for" picker and for
	// the "which opportunity is this for?" prompt when liking someone while
	// browsing without one selected.
	useEffect(() => {
		listMyGigs({ status: "open" })
			.then(setMyOpenGigs)
			.catch((err: unknown) => {
				console.error("Failed to load your opportunities:", err);
			});
	}, []);

	async function fetchOne(gigId: string | null): Promise<Artist | null> {
		const dto = await getNextArtistCandidate(gigId ?? undefined);
		return dto ? mapArtistCandidateToArtist(dto) : null;
	}

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setStatus("loading");
			setArtists([]);
			for (let i = 0; i < slotCount; i++) {
				const artist = await fetchOne(activeGigId);
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
	}, [activeGigId]);

	function toggleDiscipline(discipline: string) {
		setDisciplines((prev) => {
			const next = new Set(prev);
			if (next.has(discipline)) next.delete(discipline);
			else next.add(discipline);
			return next;
		});
	}

	function handleGigChange(gigId: string) {
		setActiveGigId(gigId || null);
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

	function handleSwipe(artist: Artist, liked: boolean) {
		if (activeGigId) {
			postSwipe({ gigId: activeGigId, liked, targetUserId: artist.userId }).catch(
				(err: unknown) => {
					console.error("Failed to record swipe:", err);
				},
			);
		} else if (liked) {
			// Browsing without an opportunity: find out which one this is for
			// before we actually record the swipe.
			setPendingInterest(artist);
		}
		fetchOne(activeGigId)
			.then((next) => {
				if (next) setArtists((prev) => [...prev, next]);
			})
			.catch((err: unknown) => {
				console.error("Failed to load next artist:", err);
			});
	}

	function handlePickGig(gigId: string) {
		if (pendingInterest) {
			postSwipe({ gigId, liked: true, targetUserId: pendingInterest.userId }).catch(
				(err: unknown) => {
					console.error("Failed to record swipe:", err);
				},
			);
		}
		setPendingInterest(null);
	}

	return (
		<div className="flex flex-col gap-8 lg:mx-[calc(50%-50vw)] lg:flex-row lg:items-start lg:px-10">
			<aside className="hidden w-56 shrink-0 lg:block">
				<h2 className="mb-4 text-sm font-semibold">Filters</h2>

				<div className="flex flex-col gap-6 text-sm">
					<div>
						<h3 className="mb-2 text-xs font-medium tracking-wide text-base-content/50 uppercase">
							Discipline
						</h3>
						<div className="flex flex-col gap-2">
							{DISCIPLINES.map((discipline) => (
								<label key={discipline} className="flex cursor-pointer items-center gap-2">
									<input
										type="checkbox"
										className="checkbox checkbox-sm checkbox-primary"
										checked={disciplines.has(discipline)}
										onChange={() => toggleDiscipline(discipline)}
									/>
									<span>{discipline}</span>
								</label>
							))}
						</div>
					</div>

					<div>
						<h3 className="mb-2 text-xs font-medium tracking-wide text-base-content/50 uppercase">
							Availability
						</h3>
						<div className="flex flex-wrap gap-2">
							<button
								type="button"
								onClick={() => setAvailability((a) => (a === "now" ? null : "now"))}
								className={`btn btn-sm rounded-full ${
									availability === "now" ? "btn-primary" : "btn-outline border-base-content/20"
								}`}
							>
								Now
							</button>
							<button
								type="button"
								onClick={() => setAvailability((a) => (a === "soon" ? null : "soon"))}
								className={`btn btn-sm rounded-full ${
									availability === "soon" ? "btn-primary" : "btn-outline border-base-content/20"
								}`}
							>
								≤ 2 wks
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
						<h1 className="text-2xl font-semibold">Discover artists</h1>
						<p className="text-sm text-base-content/50">
							{status === "ready"
								? `${artists.length} matches · sorted by fit`
								: "Loading matches…"}
						</p>
					</div>

					<div className="flex items-center gap-2">
						<select
							value={activeGigId ?? ALL_ARTISTS_VALUE}
							onChange={(e) => handleGigChange(e.target.value)}
							aria-label="Reviewing for opportunity"
							className="select select-sm rounded-full border-base-content/15 bg-transparent font-normal"
						>
							<option value={ALL_ARTISTS_VALUE}>All artists</option>
							{myOpenGigs.map((gig) => (
								<option key={gig.id} value={gig.id}>
									{gig.title}
								</option>
							))}
						</select>

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

			<PickGigModal
				artist={pendingInterest}
				gigs={myOpenGigs}
				onPick={handlePickGig}
				onClose={() => setPendingInterest(null)}
			/>
		</div>
	);
}
