import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon } from "lucide-react";
import PublicProfileView from "../features/search/components/PublicProfileView";
import { fetchPublicProfile } from "../features/search/api";
import type { PublicProfileDto } from "../features/search/types";
import FriendRequestButton from "../features/friends/components/FriendRequestButton";
import type { FriendshipStatus } from "../features/friends/types";
import { ApiError } from "../lib/apiClient";

export default function ProfilePage() {
	const navigate = useNavigate();
	const { id } = useParams<{ id: string }>();
	const [profile, setProfile] = useState<PublicProfileDto | null>(null);
	const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>("none");
	const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!id) return;
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

			{status === "ready" && profile && id && (
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
