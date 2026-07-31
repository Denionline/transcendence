import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import DesktopArtistDeck from "../features/artists/components/DesktopArtistDeck";
import MobileArtistStack from "../features/artists/components/MobileArtistStack";
import { MOCK_ARTISTS } from "../features/artists/mock";

const DISCIPLINES = ["Illustration", "Photography", "Motion & 3D", "Mural & street"];
const SORT_OPTIONS = ["Best match", "Newest", "Nearby"];

export default function DiscoverPage() {
	const [disciplines, setDisciplines] = useState<Set<string>>(new Set(["Motion & 3D"]));
	const [availability, setAvailability] = useState<"now" | "soon" | null>("now");
	const [remoteOnly, setRemoteOnly] = useState(false);
	const [sort, setSort] = useState(SORT_OPTIONS[0]);

	function toggleDiscipline(discipline: string) {
		setDisciplines((prev) => {
			const next = new Set(prev);
			if (next.has(discipline)) next.delete(discipline);
			else next.add(discipline);
			return next;
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
							<span>Remote OK</span>
						</label>
					</div>
				</div>
			</aside>

			<div className="min-w-0 flex-1">
				<div className="mb-6 flex flex-wrap items-end justify-between gap-4">
					<div>
						<h1 className="text-2xl font-semibold">Discover artists</h1>
						<p className="text-sm text-base-content/50">
							{MOCK_ARTISTS.length} matches · sorted by fit
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

				<div className="hidden md:block">
					<DesktopArtistDeck artists={MOCK_ARTISTS} />
				</div>
				<div className="md:hidden">
					<MobileArtistStack artists={MOCK_ARTISTS} />
				</div>
			</div>
		</div>
	);
}
