import { BadgeCheckIcon, StarIcon, XIcon } from "lucide-react";
import type { KeyboardEvent, MouseEvent } from "react";
import type { Artist } from "../types";

interface ArtistCardProps {
	artist: Artist;
	size?: "grid" | "stack";
	saved?: boolean;
	onToggleSave?: () => void;
	onPass?: () => void;
	onInterested?: () => void;
	onOpenDetails?: () => void;
}

export default function ArtistCard({
	artist,
	size = "grid",
	saved,
	onToggleSave,
	onPass,
	onInterested,
	onOpenDetails,
}: ArtistCardProps) {
	const {
		name,
		discipline,
		location,
		remoteOk,
		availabilityLabel,
		availabilityTone,
		priceTier,
		tags,
		verified,
		photoUrl,
	} = artist;

	function handleSaveClick(e: MouseEvent) {
		e.stopPropagation();
		onToggleSave?.();
	}

	function handlePassClick(e: MouseEvent) {
		e.stopPropagation();
		onPass?.();
	}

	function handleInterestedClick(e: MouseEvent) {
		e.stopPropagation();
		onInterested?.();
	}

	function handleCardKeyDown(e: KeyboardEvent<HTMLDivElement>) {
		if (e.target !== e.currentTarget) return;
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			onOpenDetails?.();
		}
	}

	const photo = photoUrl ? (
		<img src={photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
	) : (
		<span className="absolute inset-0 flex items-center justify-center text-[10px] tracking-wide text-base-content/40 uppercase">
			Artist photo / reel
		</span>
	);

	const availabilityBadge = (
		<span
			className={`badge badge-sm font-medium ${
				availabilityTone === "available" ? "badge-primary" : "badge-warning"
			}`}
		>
			{availabilityLabel}
		</span>
	);

	const saveButton = (
		<button
			type="button"
			data-card-save
			onClick={handleSaveClick}
			aria-label={saved ? "Remove from shortlist" : "Add to shortlist"}
			aria-pressed={saved}
			className="btn btn-circle btn-sm border-none bg-base-100/80 backdrop-blur transition-[background-color,color,transform] duration-150 hover:scale-110 hover:bg-base-100 hover:text-primary"
		>
			<StarIcon
				className={`size-4 ${saved ? "fill-primary text-primary" : "text-base-content/70"}`}
				aria-hidden="true"
			/>
		</button>
	);

	const tagBadges = (
		<div className="flex flex-wrap gap-2">
			{tags.map((tag) => (
				<span key={tag} className="badge badge-sm badge-outline border-base-content/15">
					{tag}
				</span>
			))}
			<span className="badge badge-sm badge-primary">{priceTier}</span>
		</div>
	);

	if (size === "stack") {
		return (
			<div
				onClick={onOpenDetails}
				className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-base-content/10 bg-neutral bg-[repeating-linear-gradient(45deg,color-mix(in_oklab,var(--color-primary)_18%,transparent)_0px,color-mix(in_oklab,var(--color-primary)_18%,transparent)_10px,transparent_10px,transparent_20px)]"
			>
				{photo}

				<div className="absolute top-3 left-3">{availabilityBadge}</div>
				<div className="absolute top-3 right-3">{saveButton}</div>

				<div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-linear-to-t from-black/85 via-black/50 to-transparent p-5 pt-16 text-white">
					<div>
						<div className="flex items-center gap-1.5 leading-snug font-semibold">
							<span className="truncate">{name}</span>
							{verified && (
								<BadgeCheckIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
							)}
						</div>
						<div className="truncate text-sm text-white/70">
							{discipline} · {remoteOk ? "Remote OK" : location}
						</div>
					</div>
					{tagBadges}
				</div>
			</div>
		);
	}

	return (
		<div
			onClick={onOpenDetails}
			onKeyDown={handleCardKeyDown}
			role="button"
			tabIndex={0}
			aria-label={`View details for ${name}`}
			className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-base-content/10 bg-base-100 shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
		>
			<div className="relative min-h-0 flex-1 bg-neutral bg-[repeating-linear-gradient(45deg,color-mix(in_oklab,var(--color-primary)_18%,transparent)_0px,color-mix(in_oklab,var(--color-primary)_18%,transparent)_10px,transparent_10px,transparent_20px)]">
				{photo}
				<div className="absolute top-3 left-3">{availabilityBadge}</div>
				<div className="absolute top-3 right-3">{saveButton}</div>
			</div>

			<div className="flex shrink-0 flex-col gap-3 p-4">
				<div>
					<div className="flex items-center gap-1.5 leading-snug font-semibold">
						<span className="truncate">{name}</span>
						{verified && (
							<BadgeCheckIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
						)}
					</div>
					<div className="truncate text-sm text-base-content/60">
						{discipline} · {remoteOk ? "Remote OK" : location}
					</div>
				</div>

				{tagBadges}

				<div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out group-hover:grid-rows-[1fr] group-focus-within:grid-rows-[1fr]">
					<div className="flex items-center gap-2 overflow-hidden pt-0 opacity-0 transition-opacity delay-75 duration-200 group-hover:pt-1 group-hover:opacity-100 group-focus-within:pt-1 group-focus-within:opacity-100">
						<button
							type="button"
							onClick={handlePassClick}
							aria-label={`Pass on ${name}`}
							className="btn btn-circle btn-sm border border-base-content/15 bg-transparent transition-[background-color,border-color,color,transform] duration-150 hover:scale-110 hover:border-error/50 hover:bg-error/10 hover:text-error"
						>
							<XIcon className="size-4" aria-hidden="true" />
						</button>
						<button
							type="button"
							onClick={handleSaveClick}
							aria-label={saved ? "Remove from shortlist" : "Add to shortlist"}
							aria-pressed={saved}
							className="btn btn-circle btn-sm border border-base-content/15 bg-transparent transition-[background-color,border-color,color,transform] duration-150 hover:scale-110 hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
						>
							<StarIcon
								className={`size-4 ${saved ? "fill-primary text-primary" : ""}`}
								aria-hidden="true"
							/>
						</button>
						<button
							type="button"
							onClick={handleInterestedClick}
							className="btn btn-primary flex-1 rounded-full transition-transform duration-150 hover:scale-[1.02]"
						>
							Interested
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
