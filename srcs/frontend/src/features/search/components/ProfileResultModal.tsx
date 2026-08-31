import { useEffect, useState } from "react";
import Modal from "../../../components/Modal";
import FriendRequestButton from "../../friends/components/FriendRequestButton";
import type { FriendshipStatus } from "../../friends/types";
import ArtistDetailsModal from "../../artists/components/ArtistDetailsModal";
import { mapPublicProfileToArtist } from "../../artists/mapPublicProfile";
import HirerDetailsModal from "./HirerDetailsModal";
import { fetchPublicProfile } from "../api";
import type { PublicProfileDto } from "../types";
import { useTranslation } from "react-i18next";

interface ProfileResultModalProps {
	userId: string | null;
	onClose: () => void;
}

/**
 * Opened from a search result — always the same photo-header/badge/tag card
 * layout a swipe candidate opens as, just without the Pass/Interested
 * actions (a search hit isn't a swipe candidate) and with an Add Friend
 * button next to the name instead. An artist hit reuses ArtistDetailsModal
 * outright (the exact modal a hirer sees clicking an ArtistCard on
 * Discover); a hirer hit uses HirerDetailsModal, styled to match even
 * though there's no swipeable "hirer card" elsewhere to reuse.
 */
export default function ProfileResultModal({ userId, onClose }: ProfileResultModalProps) {
	const { t } = useTranslation();
	const [profile, setProfile] = useState<PublicProfileDto | null>(null);
	const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>("none");
	const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

	// Nothing to fetch once the modal's closing (userId cleared) — the
	// stale profile/status left behind doesn't matter, both render
	// branches below key their "is this open" state off `userId` itself.
	useEffect(() => {
		if (!userId) return;
		let cancelled = false;
		(async () => {
			setStatus("loading");
			const result = await fetchPublicProfile(userId);
			if (cancelled) return;
			setProfile(result);
			setFriendshipStatus(result.friendshipStatus ?? "none");
			setStatus("ready");
		})().catch(() => {
			if (cancelled) return;
			setStatus("error");
		});
		return () => {
			cancelled = true;
		};
	}, [userId]);

	if (status === "ready" && profile && userId) {
		if (profile.role === "artist") {
			return (
				<ArtistDetailsModal
					artist={mapPublicProfileToArtist(profile)}
					onClose={onClose}
					friendSlot={
						<FriendRequestButton
							userId={userId}
							status={friendshipStatus}
							onStatusChange={setFriendshipStatus}
						/>
					}
				/>
			);
		}
		return (
			<HirerDetailsModal
				profile={profile}
				onClose={onClose}
				friendshipStatus={friendshipStatus}
				onFriendshipStatusChange={setFriendshipStatus}
			/>
		);
	}

	return (
		<Modal open={Boolean(userId)} onClose={onClose} labelledBy="profile-result-title">
			{/* Kept in the DOM across every status so the modal always has a valid
			    accessible name, not just once the profile has loaded. */}
			<h2 id="profile-result-title" className="sr-only">
				{t("profile.resultTitle")}
			</h2>

			{status === "loading" && (
				<div className="flex h-48 items-center justify-center">
					<span className="loading loading-spinner" aria-label={t("a11y.loading")} />
				</div>
			)}

			{status === "error" && (
				<div className="p-6 text-sm text-base-content/60">{t("profile.couldntLoadRetry")}</div>
			)}
		</Modal>
	);
}
