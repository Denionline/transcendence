import { useEffect, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import DesktopArtistDeck from "../features/artists/components/DesktopArtistDeck";
import MobileArtistStack from "../features/artists/components/MobileArtistStack";
import { listProfiles } from "../features/profiles/api";
import { mapProfileToArtist } from "../features/artists/mapProfile";
import { sendInterest } from "../features/interests/api";
import { ApiError } from "../lib/apiClient";
import type { Artist } from "../features/artists/types";

const DISCIPLINES = ["Illustration", "Photography", "Motion & 3D", "Mural & street"];
const SORT_OPTIONS = ["Best match", "Newest", "Nearby"];

export default function DiscoverPage() {
	const [disciplines, setDisciplines] = useState<Set<string>>(new Set(["Motion & 3D"]));
	const [availability, setAvailability] = useState<"now" | "soon" | null>("now");
	const [remoteOnly, setRemoteOnly] = useState(false);
	const [sort, setSort] = useState(SORT_OPTIONS[0]);

	const [artists, setArtists] = useState<Artist[]>([]);
	const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		listProfiles({ kind: "artist" })
			.then((res) => {
				if (cancelled) return;
				setArtists(res.items.map(mapProfileToArtist));
				setStatus("ready");
			})
			.catch((err: unknown) => {
				if (cancelled) return;
				setError(
					err instanceof ApiError ? err.message : "Couldn't load artists. Please try again.",
				);
				setStatus("error");
			});
		return () => {
			cancelled = true;
		};
	}, []);

	function toggleDiscipline(discipline: string) {
		setDisciplines((prev) => {
			const next = new Set(prev);
			if (next.has(discipline)) next.delete(discipline);
			else next.add(discipline);
			return next;
		});
	}

	function handleInterested(artist: Artist) {
		sendInterest(artist.userId).catch((err: unknown) => {
			console.error("Failed to send interest:", err);
		});
	}

	return (
		<div className="flex flex-col gap-8 md:mx-[calc(50%-50vw)] md:flex-row md:items-start md:px-6 lg:px-10">
			<aside className="hidden w-56 shrink-0 md:block">
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

					<div className="dropdown dropdown-end hidden md:block">
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
						<p className="font-medium">Couldn&rsquo;t load artists</p>
						<p className="text-error/80">{error}</p>
					</div>
				)}

				{status === "loading" && (
					<div className="flex h-[calc(100vh-19rem)] min-h-105 items-center justify-center text-sm text-base-content/50">
						Loading matches…
					</div>
				)}

				{status === "ready" && (
					<>
						<div className="hidden md:block">
							<DesktopArtistDeck artists={artists} onInterested={handleInterested} />
						</div>
						<div className="md:hidden">
							<MobileArtistStack artists={artists} onInterested={handleInterested} />
						</div>
					</>
				)}
			</div>
		</div>
	);
}
