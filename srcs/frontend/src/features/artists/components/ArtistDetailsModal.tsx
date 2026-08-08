import { BadgeCheckIcon, StarIcon, XIcon } from "lucide-react";
import Modal from "../../../components/Modal";
import type { Artist } from "../types";

interface ArtistDetailsModalProps {
	artist: Artist | null;
	saved: boolean;
	onClose: () => void;
	onToggleSave: () => void;
	onPass: () => void;
	onInterested: () => void;
}

export default function ArtistDetailsModal({
	artist,
	saved,
	onClose,
	onToggleSave,
	onPass,
	onInterested,
}: ArtistDetailsModalProps) {
	return (
		<Modal open={Boolean(artist)} onClose={onClose} labelledBy="artist-details-title">
			{artist && (
				<>
					<div className="relative aspect-16/9 bg-neutral bg-[repeating-linear-gradient(45deg,color-mix(in_oklab,var(--color-primary)_18%,transparent)_0px,color-mix(in_oklab,var(--color-primary)_18%,transparent)_10px,transparent_10px,transparent_20px)]">
						<span
							className={`badge badge-sm absolute top-3 left-3 font-medium ${
								artist.availabilityTone === "available" ? "badge-primary" : "badge-warning"
							}`}
						>
							{artist.availabilityLabel}
						</span>
						{artist.photoUrl ? (
							<img
								src={artist.photoUrl}
								alt=""
								className="absolute inset-0 h-full w-full object-cover"
							/>
						) : (
							<span className="absolute inset-0 flex items-center justify-center text-xs tracking-wide text-base-content/40 uppercase">
								Artist photo / reel
							</span>
						)}
					</div>

					<div className="flex flex-col gap-4 p-6">
						<div>
							<div
								id="artist-details-title"
								className="flex items-center gap-2 text-xl leading-snug font-semibold"
							>
								<span>{artist.name}</span>
								{artist.verified && (
									<BadgeCheckIcon className="size-5 shrink-0 text-primary" aria-hidden="true" />
								)}
							</div>
							<div className="text-sm text-base-content/60">
								{artist.discipline} · {artist.remoteOk ? "Remote OK" : artist.location}
							</div>
						</div>

						<div className="flex flex-wrap gap-2">
							{artist.tags.map((tag) => (
								<span key={tag} className="badge badge-sm badge-outline border-base-content/15">
									{tag}
								</span>
							))}
							<span className="badge badge-sm badge-primary">{artist.priceTier}</span>
						</div>

						<p className="text-sm leading-relaxed text-base-content/70">{artist.bio}</p>

						<div className="flex items-center gap-2 pt-2">
							<button
								type="button"
								onClick={() => {
									onPass();
									onClose();
								}}
								aria-label={`Pass on ${artist.name}`}
								className="btn btn-circle border border-base-content/15 bg-transparent transition-[background-color,border-color,color,transform] duration-150 hover:scale-110 hover:border-error/50 hover:bg-error/10 hover:text-error"
							>
								<XIcon className="size-5" aria-hidden="true" />
							</button>
							<button
								type="button"
								onClick={onToggleSave}
								aria-label={saved ? "Remove from shortlist" : "Add to shortlist"}
								aria-pressed={saved}
								className="btn btn-circle border border-base-content/15 bg-transparent transition-[background-color,border-color,color,transform] duration-150 hover:scale-110 hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
							>
								<StarIcon
									className={`size-5 ${saved ? "fill-primary text-primary" : ""}`}
									aria-hidden="true"
								/>
							</button>
							<button
								type="button"
								onClick={() => {
									onInterested();
									onClose();
								}}
								className="btn btn-primary flex-1 rounded-full transition-transform duration-150 hover:scale-[1.02]"
							>
								Interested
							</button>
						</div>
					</div>
				</>
			)}
		</Modal>
	);
}
