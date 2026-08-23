import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowLeftIcon } from "lucide-react";
import { useAuth } from "../features/auth/hooks/useAuth";
import ArtistProfileView from "../features/profile/components/ArtistProfileView";
import HirerProfileView from "../features/profile/components/HirerProfileView";
import PublicProfileView from "../features/search/components/PublicProfileView";
import { fetchPublicProfile } from "../features/search/api";
import type { PublicProfileDto } from "../features/search/types";
import FriendRequestButton from "../features/friends/components/FriendRequestButton";
import type { FriendshipStatus } from "../features/friends/types";
import { ApiError } from "../lib/apiClient";

/**
 * Both `/profile` and `/profile/:id` render this page (see Router.tsx) — the
 * presence of `:id` is what tells the two cases apart: no id is "my own
 * profile" (editable), an id is someone else's (read-only, with a friend
 * request affordance).
 */
export default function ProfilePage() {
	const { id } = useParams<{ id: string }>();
	return id ? <PublicProfile id={id} /> : <OwnProfile />;
}

function OwnProfile() {
	const navigate = useNavigate();
	const { user } = useAuth();

	return (
		<div className="min-h-screen bg-base-100">
			<header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-base-content/10 bg-base-100 px-4 py-3 sm:px-6">
				<div className="flex min-w-0 items-center gap-3">
					<button
						type="button"
						onClick={() => navigate(-1)}
						className="btn btn-ghost btn-circle btn-sm"
						aria-label="Go back"
					>
						<ArrowLeft className="size-4" />
					</button>
					<h1 className="truncate font-bold">Profile</h1>
				</div>
			</header>

			<div className="mx-auto max-w-2xl animate-[fade-in_200ms_ease-out] px-4 py-6 sm:px-6">
				{user?.role === "artist" && <ArtistProfileView />}
				{user?.role === "hirer" && <HirerProfileView />}
				{user?.role === "admin" && (
					<div className="rounded-2xl border border-base-content/10 bg-base-100 p-4 text-sm text-base-content/60">
						Administrator accounts don&apos;t have an artist/hirer profile.
					</div>
				)}
			</div>
		</div>
	);
}

function PublicProfile({ id }: { id: string }) {
	const navigate = useNavigate();
	const [profile, setProfile] = useState<PublicProfileDto | null>(null);
	const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>("none");
	const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setStatus("loading");
			const dto = await fetchPublicProfile(id);
			if (cancelled) return;
			setProfile(dto);
			setFriendshipStatus(dto.friendshipStatus ?? "none");
			setStatus("ready");
		})().catch((err: unknown) => {
			if (cancelled) return;
			setError(err instanceof ApiError ? err.message : "Couldn't load this profile.");
			setStatus("error");
		});
		return () => {
			cancelled = true;
		};
	}, [id]);

	return (
		<div className="mx-auto max-w-2xl">
			<button
				type="button"
				onClick={() => navigate(-1)}
				className="mb-4 inline-flex items-center gap-1.5 text-sm text-base-content/60 hover:text-base-content"
			>
				<ArrowLeftIcon className="size-4" aria-hidden="true" />
				Back
			</button>

			{status === "loading" && (
				<div className="flex h-64 items-center justify-center">
					<span className="loading loading-spinner" aria-label="Loading" />
				</div>
			)}

			{status === "error" && (
				<div className="rounded-2xl border border-error/30 bg-error/10 p-4 text-sm text-error">
					{error}
				</div>
			)}

			{status === "ready" && profile && (
				<div className="rounded-2xl border border-base-content/10 p-6">
					<PublicProfileView
						profile={profile}
						friendSlot={
							<FriendRequestButton
								userId={id}
								status={friendshipStatus}
								onStatusChange={setFriendshipStatus}
							/>
						}
					/>
				</div>
			)}
		</div>
	);
}
