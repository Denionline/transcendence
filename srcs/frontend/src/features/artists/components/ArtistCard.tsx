import { BadgeCheckIcon, EyeIcon, XIcon } from "lucide-react";
import type { KeyboardEvent, MouseEvent } from "react";
import type { Artist } from "../types";
import { useTranslation } from "react-i18next";

interface ArtistCardProps {
	artist: Artist;
	size?: "grid" | "stack";
	/** Discipline slugs currently checked in the sidebar filter — matching tags render highlighted. */
	selectedDisciplines?: Set<string>;
	onPass?: () => void;
	onInterested?: () => void;
	onOpenDetails?: () => void;
}

export default function ArtistCard({
	artist,
	size = "grid",
	selectedDisciplines,
	onPass,
	onInterested,
	onOpenDetails,
}: ArtistCardProps) {
	const { t } = useTranslation();
	const {
		name,
		discipline,
		location,
		remoteOk,
		availabilityLabel,
		availabilityTone,
		categorySlugs,
		tags,
		verified,
		photoUrl,
	} = artist;

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

	// Gently pulses forever so it reads as an invitation on its own — mobile
	// has no hover to reveal it with. On desktop, hovering settles it into a
	// steady, slightly bigger state instead of fighting the loop mid-pulse.
	const detailsHint = (
		<span className="pointer-events-none absolute top-3 right-3 flex animate-[hint-pulse_2400ms_ease-in-out_infinite] items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur transition-transform duration-200 group-hover:animate-none group-hover:scale-110">
			<EyeIcon className="size-3" aria-hidden="true" />
			View profile
		</span>
	);

	// `tags` and `categorySlugs` are built from the same category list, in the
	// same order (see mapCandidate.ts / mapProfile.ts) — zipping by index pairs
	// each display label back up with its matching key.
	const tagBadges = (
		<div className="flex flex-wrap gap-2">
			{tags.map((tag, i) => {
				const isSelected = Boolean(selectedDisciplines?.has(categorySlugs[i]));
				return (
					<span
						key={tag}
						className={`badge badge-sm ${
							isSelected ? "badge-primary" : "badge-outline border-base-content/15"
						}`}
					>
						{tag}
					</span>
				);
			})}
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
				{detailsHint}

				<div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-linear-to-t from-black/85 via-black/50 to-transparent p-5 pt-16 text-white">
					<div>
						<div className="flex items-center gap-1.5 leading-snug font-semibold">
							<span className="truncate">{name}</span>
							{verified && (
								<BadgeCheckIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
							)}
						</div>
						<div className="truncate text-sm text-white/70">
							{discipline} · {remoteOk ? t("deck.remoteOk") : location}
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
				{detailsHint}
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
						{discipline} · {remoteOk ? t("deck.remoteOk") : location}
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
