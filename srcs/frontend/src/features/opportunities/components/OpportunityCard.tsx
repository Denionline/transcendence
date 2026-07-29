import { BadgeCheckIcon, StarIcon } from "lucide-react";
import { COMMITMENTS } from "../constants";
import type { Commitment } from "../types";
import { initials } from "../../../lib/format";

export interface OpportunityCardData {
	hirerName: string;
	title: string;
	location: string;
	duration: string;
	commitment: Commitment;
	workTypes: string[];
}

export default function OpportunityCard({
	hirerName,
	title,
	location,
	duration,
	commitment,
	workTypes,
}: OpportunityCardData) {
	const commitmentLabel = COMMITMENTS.find((c) => c.value === commitment)?.label ?? commitment;

	return (
		<div className="overflow-hidden rounded-2xl border border-base-content/10 bg-base-100">
			<div className="relative aspect-4/3 bg-[repeating-linear-gradient(45deg,color-mix(in_oklab,var(--color-base-content)_6%,transparent)_0px,color-mix(in_oklab,var(--color-base-content)_6%,transparent)_10px,transparent_10px,transparent_20px)] bg-base-200">
				<button
					type="button"
					className="btn btn-circle btn-xs absolute top-3 right-3 border-none bg-base-100/80"
					disabled
					aria-hidden="true"
					tabIndex={-1}
				>
					<StarIcon className="size-3.5" />
				</button>
				<span className="absolute bottom-3 left-3 text-[10px] tracking-wide text-base-content/40 uppercase">
					Venue / Brand shot
				</span>
			</div>

			<div className="flex flex-col gap-3 p-4">
				<div className="flex items-center gap-2 text-sm">
					<div className="avatar avatar-placeholder">
						<div className="w-6 rounded-full bg-neutral text-neutral-content">
							<span className="text-[10px]">{initials(hirerName || "?")}</span>
						</div>
					</div>
					<span className="truncate font-medium">{hirerName || "Your brand"}</span>
					<BadgeCheckIcon className="size-3.5 shrink-0 text-primary" />
					<span className="truncate text-base-content/50">· {location || "Location TBD"}</span>
				</div>

				<h3 className="leading-snug font-semibold">
					{title || "Your opportunity title goes here"}
				</h3>

				<div className="flex flex-wrap gap-2">
					<span className="badge badge-sm badge-outline border-base-content/15">
						{duration || "Duration TBD"}
					</span>
					<span className="badge badge-sm badge-outline border-base-content/15">
						{commitmentLabel}
					</span>
				</div>

				{workTypes.length > 0 && (
					<div className="flex flex-wrap gap-1.5">
						{workTypes.map((type) => (
							<span key={type} className="badge badge-sm badge-ghost">
								{type}
							</span>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
