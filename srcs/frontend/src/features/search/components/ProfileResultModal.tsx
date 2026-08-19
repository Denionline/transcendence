import { useEffect, useState } from "react";
import Modal from "../../../components/Modal";
import Avatar from "../../../components/Avatar";
import FileGallery from "../../files/components/FileGallery";
import { fetchPublicProfile } from "../api";
import type { PublicProfileDto } from "../types";

interface ProfileResultModalProps {
	userId: string | null;
	onClose: () => void;
}

/**
 * Read-only view of another user's artist/hirer profile, opened from a
 * search result — deliberately no swipe actions (Pass/Interested/Save), this
 * is just "who is this", not a candidate to act on.
 */
export default function ProfileResultModal({ userId, onClose }: ProfileResultModalProps) {
	const [profile, setProfile] = useState<PublicProfileDto | null>(null);
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
			setStatus("ready");
		})().catch((err: unknown) => {
			if (cancelled) return;
			console.error("Failed to load profile:", err);
			setStatus("error");
		});
		return () => {
			cancelled = true;
		};
	}, [userId]);

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

			{status === "ready" && profile && (
				<div className="flex flex-col gap-4 p-6">
					<div className="flex items-center gap-4">
						<Avatar username={username} avatarUrl={profile.user?.avatarUrl} size="lg" />
						<div className="min-w-0">
							<div className="truncate text-xl leading-snug font-semibold">{username}</div>
							<div className="truncate text-sm text-base-content/60">
								{profile.category} · {profile.location ?? "Location TBD"}
							</div>
						</div>
					</div>

					<div className="flex flex-wrap gap-2">
						<span
							className={`badge badge-sm font-medium ${
								profile.role === "artist" ? "badge-primary" : "badge-secondary"
							}`}
						>
							{profile.role === "artist" ? "Artist" : "Hirer"}
						</span>
						{profile.role === "artist" && (
							<span
								className={`badge badge-sm font-medium ${
									profile.availability ? "badge-primary" : "badge-ghost"
								}`}
							>
								{profile.availability ? "Available" : "Unavailable"}
							</span>
						)}
						{profile.role === "hirer" && (
							<span className="badge badge-sm badge-outline border-base-content/15">
								{profile.organizationName}
							</span>
						)}
					</div>

					{profile.bio ? (
						<p className="text-sm leading-relaxed text-base-content/70">{profile.bio}</p>
					) : (
						<p className="text-sm text-base-content/40 italic">No bio provided.</p>
					)}

					{profile.portfolio && profile.portfolio.length > 0 && (
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
