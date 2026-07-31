import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import DesktopGigDeck from "../features/opportunities/components/DesktopGigDeck";
import MobileGigStack from "../features/opportunities/components/MobileGigStack";
import { MOCK_GIGS } from "../features/opportunities/mockGigs";

const GIG_TYPES = ["Mural", "Illustration", "Set design", "Lettering"];
const SORT_OPTIONS = ["Newest", "Best match", "Closing soon"];
const BUDGET_MIN = 200;
const BUDGET_MAX = 5000;

export default function OpportunitiesPage() {
	const [gigTypes, setGigTypes] = useState<Set<string>>(new Set(["Set design"]));
	const [duration, setDuration] = useState<"any" | "short">("any");
	const [budget, setBudget] = useState(1200);
	const [remoteOnly, setRemoteOnly] = useState(false);
	const [sort, setSort] = useState(SORT_OPTIONS[0]);

	function toggleGigType(type: string) {
		setGigTypes((prev) => {
			const next = new Set(prev);
			if (next.has(type)) next.delete(type);
			else next.add(type);
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
							Budget
						</h3>
						<input
							type="range"
							min={BUDGET_MIN}
							max={BUDGET_MAX}
							step={100}
							value={budget}
							onChange={(e) => setBudget(Number(e.target.value))}
							className="range range-primary range-sm"
						/>
						<div className="mt-1 flex justify-between text-xs text-base-content/50">
							<span>€{BUDGET_MIN}</span>
							<span>€{Math.round(BUDGET_MAX / 1000)}k+</span>
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
						<h1 className="text-2xl font-semibold">Opportunities</h1>
						<p className="text-sm text-base-content/50">
							{MOCK_GIGS.length} gigs · sorted by {sort.toLowerCase()}
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
					<DesktopGigDeck gigs={MOCK_GIGS} />
				</div>
				<div className="md:hidden">
					<MobileGigStack gigs={MOCK_GIGS} />
				</div>
			</div>
		</div>
	);
}
