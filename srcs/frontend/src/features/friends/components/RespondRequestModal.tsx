import { useState } from "react";
import { Link } from "react-router-dom";
import Modal from "../../../components/Modal";
import Avatar from "../../../components/Avatar";
import { respondToRequest } from "../api";

interface RespondRequestModalProps {
	actor: { id: string; displayName: string; avatarUrl: string | null } | null;
	onClose: () => void;
}

/**
 * The "card" opened by clicking a new_invite notification — accept/decline
 * right where the user already is, without navigating away. Clicking the
 * inviter's name/avatar is the other way to respond: it closes this modal
 * and goes to their profile page instead, which shows the same
 * accept/decline affordance inline via FriendRequestButton.
 */
export default function RespondRequestModal({ actor, onClose }: RespondRequestModalProps) {
	const [pending, setPending] = useState(false);

	async function handleRespond(accepted: boolean) {
		if (!actor) return;
		setPending(true);
		try {
			await respondToRequest(actor.id, accepted);
			onClose();
		} finally {
			setPending(false);
		}
	}

	return (
		<Modal open={Boolean(actor)} onClose={onClose} labelledBy="respond-request-title">
			<div className="flex flex-col items-center gap-4 p-6 text-center">
				<h2 id="respond-request-title" className="text-lg font-semibold">
					Friend request
				</h2>
				{actor && (
					<>
						<Link
							to={`/profile/${actor.id}`}
							onClick={onClose}
							className="flex flex-col items-center gap-2"
						>
							<Avatar username={actor.displayName} avatarUrl={actor.avatarUrl} size="lg" />
							<span className="font-medium hover:underline">{actor.displayName}</span>
						</Link>
						<p className="text-sm text-base-content/60">wants to be your friend.</p>
						<div className="flex gap-3">
							<button
								type="button"
								disabled={pending}
								onClick={() => handleRespond(false)}
								className="btn rounded-full btn-outline disabled:opacity-40"
							>
								Decline
							</button>
							<button
								type="button"
								disabled={pending}
								onClick={() => handleRespond(true)}
								className="btn rounded-full btn-primary disabled:opacity-40"
							>
								Accept
							</button>
						</div>
					</>
				)}
			</div>
		</Modal>
	);
}
