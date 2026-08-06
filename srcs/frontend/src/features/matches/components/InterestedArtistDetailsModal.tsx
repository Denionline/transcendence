import Modal from "../../../components/Modal";
import Avatar from "../../../components/Avatar";
import { formatDate } from "../../../lib/format";
import type { InterestedArtistDto } from "../../swipes/types";

interface InterestedArtistDetailsModalProps {
	item: InterestedArtistDto | null;
	onClose: () => void;
}

export default function InterestedArtistDetailsModal({
	item,
	onClose,
}: InterestedArtistDetailsModalProps) {
	const artist = item?.artist;
	const username = artist?.user?.username ?? "Unnamed artist";

	return (
		<Modal open={Boolean(item)} onClose={onClose} labelledBy="interested-artist-title">
			{item && artist && (
				<div className="flex flex-col gap-4 p-6">
					<div className="flex items-center gap-4">
						<Avatar username={username} avatarUrl={artist.user?.avatarUrl} size="lg" />
						<div className="min-w-0">
							<div id="interested-artist-title" className="text-xl leading-snug font-semibold">
								{username}
							</div>
							<div className="text-sm text-base-content/60">
								{artist.category} · {artist.location ?? "Location TBD"}
							</div>
						</div>
					</div>

					<div className="flex flex-wrap gap-2">
						<span
							className={`badge badge-sm font-medium ${
								artist.availability ? "badge-primary" : "badge-ghost"
							}`}
						>
							{artist.availability ? "Available" : "Unavailable"}
						</span>
						<span className="badge badge-sm badge-outline border-base-content/15">
							Interested in {item.gig.title}
						</span>
						<span className="badge badge-sm badge-outline border-base-content/15">
							{formatDate(item.createdAt)}
						</span>
					</div>

					{artist.bio ? (
						<p className="text-sm leading-relaxed text-base-content/70">{artist.bio}</p>
					) : (
						<p className="text-sm text-base-content/40 italic">No bio provided.</p>
					)}
				</div>
			)}
		</Modal>
	);
}
