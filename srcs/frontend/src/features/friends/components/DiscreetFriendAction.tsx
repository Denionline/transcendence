import { useEffect, useState } from "react";
import { fetchFriendshipStatus } from "../api";
import type { FriendshipStatus } from "../types";
import FriendRequestButton from "./FriendRequestButton";

interface DiscreetFriendActionProps {
	userId: string;
}

/**
 * A compact Add Friend action for a details popup that isn't a "profile
 * fetch" to begin with — a swipe candidate's card, opened from Discover.
 * Unlike ProfileResultModal (which already has friendshipStatus from
 * GET /profile/:id), the candidate carries none, so this fetches just that
 * one field on mount. Renders nothing while loading or once it's the
 * caller's own card — no layout shift once the button appears.
 */
export default function DiscreetFriendAction({ userId }: DiscreetFriendActionProps) {
	const [status, setStatus] = useState<FriendshipStatus | null>(null);

	useEffect(() => {
		let cancelled = false;
		fetchFriendshipStatus(userId)
			.then((result) => {
				if (!cancelled) setStatus(result);
			})
			.catch(() => {
				// No status to show — the button just never appears for this card.
			});
		return () => {
			cancelled = true;
		};
	}, [userId]);

	if (status === null) return null;
	return <FriendRequestButton userId={userId} status={status} onStatusChange={setStatus} compact />;
}
