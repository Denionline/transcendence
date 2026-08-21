import { useEffect, useState } from "react";
import Modal from "../../../components/Modal";
import Avatar from "../../../components/Avatar";
import FileGallery from "../../files/components/FileGallery";
import ArtistDetailsModal from "../../artists/components/ArtistDetailsModal";
import { mapPublicProfileToArtist } from "../../artists/mapPublicProfile";
import { fetchPublicProfile } from "../api";
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

	const username = profile?.user?.username ?? "Unnamed";

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

			{status === "ready" && profile && isHirer && (
				<div className="flex flex-col gap-4 p-6">
					<div className="flex items-center gap-4">
						<Avatar username={username} avatarUrl={profile.user?.avatarUrl ?? null} size="lg" />
						<div className="min-w-0">
							<div className="truncate text-xl leading-snug font-semibold">{username}</div>
							<div className="truncate text-sm text-base-content/60">
								{profile.organizationName} · {profile.location ?? "Location TBD"}
							</div>
						</div>
					</div>

					<div className="flex flex-wrap gap-2">
						<span className="badge badge-sm badge-secondary font-medium">Hirer</span>
						{profile.categories.map((category) => (
							<span
								key={category.slug}
								className="badge badge-sm badge-outline border-base-content/15"
							>
								{category.label}
							</span>
						))}
					</div>

					{profile.bio ? (
						<p className="text-sm leading-relaxed text-base-content/70">{profile.bio}</p>
					) : (
						<p className="text-sm text-base-content/40 italic">No bio provided.</p>
					)}

					{profile.portfolio.length > 0 && (
						<div className="flex flex-col gap-2">
							<h3 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
								Portfolio
							</h3>
							{/* Read-only: no `onDelete`. These are someone else's files. */}
							<FileGallery files={profile.portfolio} />
						</div>
					)}
				</div>
			)}
		</Modal>
	);
}
