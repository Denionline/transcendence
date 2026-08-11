import { ChevronRightIcon } from "lucide-react";
import Avatar from "../../../components/Avatar";
import { formatDate } from "../../../lib/format";
import type { InterestedArtistDto } from "../../swipes/types";

interface InterestedArtistRowProps {
	item: InterestedArtistDto;
	/** Only worth showing when the list spans more than one gig. */
	showGig: boolean;
	onOpenDetails: () => void;
}

export default function InterestedArtistRow({
	item,
	showGig,
	onOpenDetails,
}: InterestedArtistRowProps) {
	const { artist, gig, createdAt } = item;
	const username = artist.user?.username ?? "Unnamed artist";

	return (
		<li>
			<button
				type="button"
				onClick={onOpenDetails}
				className="group flex w-full items-center gap-4 rounded-2xl border border-base-content/10 bg-base-100 p-4 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
			>
				<Avatar username={username} avatarUrl={artist.user?.avatarUrl} size="md" />

				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<h3 className="truncate font-semibold">{username}</h3>
						<span
							className={`badge badge-sm font-medium ${
								artist.availability ? "badge-primary" : "badge-ghost"
							}`}
						>
							{artist.availability ? "Available" : "Unavailable"}
						</span>
					</div>
					<p className="truncate text-sm text-base-content/50">
						{artist.categories[0]?.label ?? "Discipline TBD"} · {artist.location ?? "Location TBD"}
					</p>
					{showGig && (
						<p className="mt-1 truncate text-xs text-base-content/40">
							Interested in <span className="font-medium">{gig.title}</span>
						</p>
					)}
				</div>

				<div className="flex shrink-0 items-center gap-3">
					<span className="hidden text-xs text-base-content/40 sm:inline">
						Interested {formatDate(createdAt)}
					</span>
					<ChevronRightIcon
						className="size-4 text-base-content/30 transition-transform group-hover:translate-x-0.5"
						aria-hidden="true"
					/>
				</div>
			</button>
		</li>
	);
}
