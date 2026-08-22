import { useState } from "react";
import { CheckIcon, Trash2Icon, UserPlusIcon, XIcon } from "lucide-react";
import { useAuth } from "../../auth/hooks/useAuth";
import { sendFriendRequest, respondToRequest, removeFriend } from "../api";
import type { FriendshipStatus } from "../types";

interface FriendRequestButtonProps {
	userId: string;
	status: FriendshipStatus;
	onStatusChange: (status: FriendshipStatus) => void;
}

/**
 * Controlled by the caller: `status` comes from the profile fetch that
 * already carries it (see GET /profile/:id's `friendshipStatus`), and
 * `onStatusChange` updates that same local state — no separate fetch here.
 */
export default function FriendRequestButton({
	userId,
	status,
	onStatusChange,
}: FriendRequestButtonProps) {
	const { user } = useAuth();
	const [pending, setPending] = useState(false);

	// Never shown on your own profile, and admins have no friends per the API.
	if (!user || user.id === userId || user.role === "admin") return null;

	async function handleSend() {
		setPending(true);
		try {
			await sendFriendRequest(userId);
			onStatusChange("pending_sent");
		} finally {
			setPending(false);
		}
	}

	async function handleRespond(accepted: boolean) {
		setPending(true);
		try {
			await respondToRequest(userId, accepted);
			onStatusChange(accepted ? "accepted" : "none");
		} finally {
			setPending(false);
		}
	}

	async function handleRemove() {
		setPending(true);
		try {
			await removeFriend(userId);
			onStatusChange("none");
		} finally {
			setPending(false);
		}
	}

	if (status === "accepted") {
		return (
			<div className="flex items-center gap-2">
				<span className="badge gap-1.5 badge-outline badge-success">
					<CheckIcon className="size-3.5" aria-hidden="true" />
					Friends
				</span>
				<button
					type="button"
					aria-label="Remove friend"
					disabled={pending}
					onClick={handleRemove}
					className="btn btn-circle btn-ghost btn-xs text-error disabled:opacity-30"
				>
					<Trash2Icon className="size-3.5" aria-hidden="true" />
				</button>
			</div>
		);
	}

	if (status === "pending_sent") {
		return (
			<button type="button" disabled className="btn btn-sm rounded-full">
				Request Sent
			</button>
		);
	}

	if (status === "pending_received") {
		return (
			<div className="flex items-center gap-2">
				<span className="text-sm text-base-content/60">Sent you a friend request</span>
				<button
					type="button"
					aria-label="Decline friend request"
					disabled={pending}
					onClick={() => handleRespond(false)}
					className="btn btn-circle btn-outline btn-sm border-base-content/15 text-base-content/50 hover:border-error hover:bg-error hover:text-error-content disabled:opacity-30"
				>
					<XIcon className="size-4" aria-hidden="true" />
				</button>
				<button
					type="button"
					aria-label="Accept friend request"
					disabled={pending}
					onClick={() => handleRespond(true)}
					className="btn btn-circle btn-sm btn-primary disabled:opacity-30"
				>
					<CheckIcon className="size-4" aria-hidden="true" />
				</button>
			</div>
		);
	}

	return (
		<button
			type="button"
			disabled={pending}
			onClick={handleSend}
			className="btn btn-sm gap-1.5 rounded-full btn-primary"
		>
			<UserPlusIcon className="size-4" aria-hidden="true" />
			Add Friend
		</button>
	);
}
