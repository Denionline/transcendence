import { useEffect, useState } from "react";
import Modal from "../../../components/Modal";
import FriendRequestButton from "../../friends/components/FriendRequestButton";
import type { FriendshipStatus } from "../../friends/types";
import PublicProfileView from "./PublicProfileView";
import { fetchPublicProfile } from "../api";
import { profileDisplayName } from "../utils";
import type { PublicProfileDto } from "../types";

interface ProfileResultModalProps {
	userId: string | null;
	onClose: () => void;
}

/**
 * Read-only view of another user's artist/hirer profile, opened from a
 * search result — no swipe actions (Pass/Interested/Save), just "who is
 * this" plus the ability to send/respond to a friend request.
 */
export default function ProfileResultModal({ userId, onClose }: ProfileResultModalProps) {
	const [profile, setProfile] = useState<PublicProfileDto | null>(null);
	const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>("none");
	const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

	useEffect(() => {
		// Nothing to fetch once the modal's closing (userId cleared) — the
		// stale profile/status left behind doesn't matter, Modal itself already
		// renders nothing while `open` is false.
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
