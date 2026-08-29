import type { ReactNode } from "react";
import { BadgeCheckIcon, XIcon } from "lucide-react";
import Modal from "../../../components/Modal";
import ProfileMediaGallery from "./ProfileMediaGallery";
import type { Artist } from "../types";
import { useTranslation } from "react-i18next";

interface ArtistDetailsModalProps {
	artist: Artist | null;
	/** Discipline slugs currently checked in the sidebar filter — matching tags render highlighted. */
	selectedDisciplines?: Set<string>;
	onClose: () => void;
	/** Omit both to render a read-only profile — e.g. opened from a search
	 *  result, which isn't a swipe candidate to act on. */
	onPass?: () => void;
	onInterested?: () => void;
	/** Rendered next to the name — the Add Friend button, when the caller
	 *  wants one (e.g. opened from a search result). Nothing renders there
	 *  by default, so the swipe deck's own use is unaffected. */
	friendSlot?: ReactNode;
}

export default function ArtistDetailsModal({
	artist,
	selectedDisciplines,
	onClose,
	onPass,
	onInterested,
	friendSlot,
}: ArtistDetailsModalProps) {
	const { t } = useTranslation();
	return (
		<Modal open={Boolean(artist)} onClose={onClose} labelledBy="artist-details-title" size="lg">
			{artist && (
				<>
					<ProfileMediaGallery
						key={artist.id}
						media={artist.media}
						name={artist.name}
						topLeftSlot={
							<span
								className={`badge badge-sm font-medium ${
									artist.availabilityTone === "available" ? "badge-primary" : "badge-warning"
								}`}
							>
								{artist.availabilityLabel}
							</span>
						}
					/>

					<div className="flex flex-col gap-4 p-6">
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0">
								<div
									id="artist-details-title"
									className="flex items-center gap-2 text-xl leading-snug font-semibold"
								>
									<span className="truncate">{artist.name}</span>
									{artist.verified && (
										<BadgeCheckIcon className="size-5 shrink-0 text-primary" aria-hidden="true" />
									)}
								</div>
								<div className="truncate text-sm text-base-content/60">
									{artist.discipline} ·{" "}
									{artist.remoteOk
										? t("deck.remoteOk")
										: artist.location || t("preview.locationTbd")}
								</div>
							</div>
							{friendSlot}
						</div>

						<div className="flex flex-wrap gap-2">
							{artist.tags.map((tag, i) => {
								const isSelected = Boolean(selectedDisciplines?.has(artist.categorySlugs[i]));
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

						<p className="text-sm leading-relaxed text-base-content/70">{artist.bio}</p>

						{(onPass || onInterested) && (
							<div className="flex items-center gap-2 pt-2">
								<button
									type="button"
									onClick={() => {
										onPass?.();
										onClose();
									}}
									aria-label={t("deck.passOn", { name: artist.name })}
									className="btn btn-circle border border-base-content/15 bg-transparent transition-[background-color,border-color,color,transform] duration-150 hover:scale-110 hover:border-error/50 hover:bg-error/10 hover:text-error"
								>
									<XIcon className="size-5" aria-hidden="true" />
								</button>
								<button
									type="button"
									onClick={() => {
										onInterested?.();
										onClose();
									}}
									className="btn btn-primary flex-1 rounded-full transition-transform duration-150 hover:scale-[1.02]"
								>
									{t("deck.interested")}
								</button>
							</div>
						)}
					</div>
				</>
			)}
		</Modal>
	);
}
