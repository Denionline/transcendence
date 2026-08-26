import Modal from "../../../components/Modal";
import ProfileMediaGallery from "../../artists/components/ProfileMediaGallery";
import FriendRequestButton from "../../friends/components/FriendRequestButton";
import { fileToMediaItem } from "../../files/toMediaItem";
import type { ProfileMediaItem } from "../../artists/types";
import type { FriendshipStatus } from "../../friends/types";
import type { PublicHirerProfileDto } from "../types";

interface HirerDetailsModalProps {
	profile: PublicHirerProfileDto | null;
	onClose: () => void;
	friendshipStatus: FriendshipStatus;
	onFriendshipStatusChange: (status: FriendshipStatus) => void;
}

/**
 * Opened from a search hit on a hirer. Styled to match ArtistDetailsModal —
 * the same photo-header/badge/tag layout an artist sees when a search hit
 * is another artist — even though there's no swipeable "hirer card"
 * anywhere else in the app to literally reuse (artists browse gigs, not
 * hirers, on Opportunities). Always read-only: a hirer is never a swipe
 * candidate, so there's no Pass/Interested action to include.
 */
export default function HirerDetailsModal({
	profile,
	onClose,
	friendshipStatus,
	onFriendshipStatusChange,
}: HirerDetailsModalProps) {
	const media: ProfileMediaItem[] = profile
		? profile.portfolio
				.map(fileToMediaItem)
				.filter((item): item is ProfileMediaItem => item !== null)
		: [];
	const categoryLabel = profile?.categories.map((category) => category.label).join(", ") ?? "";

	return (
		<Modal open={Boolean(profile)} onClose={onClose} labelledBy="hirer-details-title" size="lg">
			{profile && (
				<>
					<ProfileMediaGallery
						key={profile.id}
						media={media}
						name={profile.organizationName}
						emptyLabel="Hirer photo / reel"
						topLeftSlot={
							<span
								className={`badge badge-sm font-medium ${
									profile.availability ? "badge-primary" : "badge-warning"
								}`}
							>
								{profile.availability ? "Available" : "Unavailable"}
							</span>
						}
					/>

					<div className="flex flex-col gap-4 p-6">
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0">
								<div
									id="hirer-details-title"
									className="truncate text-xl leading-snug font-semibold"
								>
									{profile.organizationName}
								</div>
								<div className="truncate text-sm text-base-content/60">
									{categoryLabel && `${categoryLabel} · `}
									{profile.location ?? "Location TBD"}
								</div>
							</div>
							<FriendRequestButton
								userId={profile.userId}
								status={friendshipStatus}
								onStatusChange={onFriendshipStatusChange}
							/>
						</div>

						{profile.categories.length > 0 && (
							<div className="flex flex-wrap gap-2">
								{profile.categories.map((category) => (
									<span
										key={category.id}
										className="badge badge-sm badge-outline border-base-content/15"
									>
										{category.label}
									</span>
								))}
							</div>
						)}

						<p className="text-sm leading-relaxed text-base-content/70">
							{profile.bio || <span className="text-base-content/40 italic">No bio provided.</span>}
						</p>
					</div>
				</>
			)}
		</Modal>
	);
}
