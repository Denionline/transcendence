import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Modal from "../../../components/Modal";
import Avatar from "../../../components/Avatar";
import { fetchFriendshipStatus, respondToRequest } from "../api";
import type { FriendshipStatus } from "../types";
import { useTranslation } from "react-i18next";

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
 *
 * A notification is static once created, but the friendship it refers to
 * isn't — the caller may have already accepted or declined this exact
 * request (from this same notification on an earlier click, from their
 * profile page, or it may since have been withdrawn) by the time they click
 * it again. Re-running accept/decline against an already-resolved request
 * is worse than a confusing 404: declining one that's already accepted
 * would unfriend them, since PATCH's accepted:false is a delete keyed only
 * on the original request, blind to its current status. So this checks the
 * live status on open and only offers Accept/Decline while it's still the
 * pending request the notification was about.
 */
export default function RespondRequestModal({ actor, onClose }: RespondRequestModalProps) {
	const { t } = useTranslation();
	const [pending, setPending] = useState(false);
	// Keyed by the actor it was fetched for, not just set to null on every
	// actor change — that let a `setStatus` call fire synchronously inside
	// the effect. A mismatched id means "not fetched for this actor (yet)",
	// which the status lookup below treats the same as still loading.
	const [fetched, setFetched] = useState<{ actorId: string; status: FriendshipStatus } | null>(
		null,
	);

	useEffect(() => {
		if (!actor) return;
		let cancelled = false;
		fetchFriendshipStatus(actor.id)
			.then((result) => {
				if (!cancelled) setFetched({ actorId: actor.id, status: result });
			})
			.catch(() => {
				// Unknown either way — treat like an unresolved fetch, not "still pending".
			});
		return () => {
			cancelled = true;
		};
		// actor.displayName/avatarUrl changing mid-request isn't a reason to
		// refetch — only a different person (a different id) is.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [actor?.id]);

	const status = actor && fetched?.actorId === actor.id ? fetched.status : null;

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

	const isStillPending = status === "pending_received";

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

						{status === null ? (
							<span className="loading loading-spinner loading-sm" aria-label="Loading" />
						) : isStillPending ? (
							<>
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
						) : (
							<>
								<p className="text-sm text-base-content/60">
									{status === "accepted"
										? t("friends.alreadyFriends")
										: t("friends.alreadyResponded")}
								</p>
								<button type="button" onClick={onClose} className="btn rounded-full btn-outline">
									Close
								</button>
							</>
						)}
					</>
				)}
			</div>
		</Modal>
	);
}
