import { useEffect, useState } from "react";
import Modal from "../../../components/Modal";
import FriendRequestButton from "../../friends/components/FriendRequestButton";
import type { FriendshipStatus } from "../../friends/types";
import PublicProfileView from "./PublicProfileView";
import ArtistDetailsModal from "../../artists/components/ArtistDetailsModal";
import { mapPublicProfileToArtist } from "../../artists/mapPublicProfile";
import { fetchPublicProfile } from "../api";
import { profileDisplayName } from "../utils";
import type { PublicProfileDto } from "../types";

interface ProfileResultModalProps {
	userId: string | null;
	onClose: () => void;
}

/**
 * Opened from a search result. An artist hit reuses ArtistDetailsModal
 * outright — the exact same profile a hirer sees clicking an ArtistCard on
 * Discover, portfolio and all — just without the Pass/Interested actions,
 * since a search hit isn't a swipe candidate. There's no equivalent "hirer
 * card" anywhere else in the app to mirror, so a hirer hit gets a lighter,
 * purpose-built read-only panel instead.
 */
export default function ProfileResultModal({ userId, onClose }: ProfileResultModalProps) {
	const [profile, setProfile] = useState<PublicProfileDto | null>(null);
	const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>("none");
	const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

	useEffect(() => {
		// Nothing to fetch once the modal's closing (userId cleared) — the
		// stale profile/status left behind doesn't matter, both render
		// branches below key their "is this open" state off `userId` itself.
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

	// There's no `role` field on the wire (see profile.service.ts) — told
	// apart the same way the rest of the app tells the two shapes apart.
	const isHirer = profile !== null && "organizationName" in profile;

	if (status === "ready" && profile && !isHirer) {
		return (
			<ArtistDetailsModal
				// Explicitly null once userId clears, even though `profile` is
				// still the last-fetched one — this is what actually closes the
				// modal, the same mechanism DesktopArtistDeck/MobileArtistStack
				// already rely on.
				artist={userId ? mapPublicProfileToArtist(profile) : null}
				onClose={onClose}
			/>
		);
	}

	// There's no `role` field on the wire (see profile.service.ts) — told
	// apart the same way the rest of the app tells the two shapes apart.
	const isHirer = profile !== null && "organizationName" in profile;

	if (status === "ready" && profile && !isHirer) {
		return (
			<ArtistDetailsModal
				// Explicitly null once userId clears, even though `profile` is
				// still the last-fetched one — this is what actually closes the
				// modal, the same mechanism DesktopArtistDeck/MobileArtistStack
				// already rely on.
				artist={userId ? mapPublicProfileToArtist(profile) : null}
				onClose={onClose}
			/>
		);
	}

	const username = profile ? profileDisplayName(profile) : "Unnamed";

	return (
		<Modal open={Boolean(userId)} onClose={onClose} labelledBy="profile-result-title">
			{/* Kept in the DOM across every status so the modal always has a valid
			    accessible name, not just once the profile has loaded. */}
			<h2 id="profile-result-title" className="sr-only">
				{status === "ready" ? `${username}'s profile` : "Profile"}
			</h2>

			{status === "loading" && (
				<div className="flex h-48 items-center justify-center">
					<span className="loading loading-spinner" aria-label="Loading" />
				</div>
			)}

			{status === "error" && (
				<div className="p-6 text-sm text-base-content/60">
					Couldn&rsquo;t load this profile. Please try again.
				</div>
			)}

			{status === "ready" && profile && userId && (
				<div className="p-6">
					<PublicProfileView
						profile={profile}
						friendSlot={
							<FriendRequestButton
								userId={userId}
								status={friendshipStatus}
								onStatusChange={setFriendshipStatus}
							/>
						}
					/>
				</div>
			)}
		</Modal>
	);
}
