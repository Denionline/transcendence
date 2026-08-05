import { Link } from "react-router-dom";
import Modal from "../../../components/Modal";
import type { GigDto } from "../../gigs/types";
import type { Artist } from "../types";

interface PickGigModalProps {
	artist: Artist | null;
	gigs: GigDto[];
	onPick: (gigId: string) => void;
	onClose: () => void;
}

export default function PickGigModal({ artist, gigs, onPick, onClose }: PickGigModalProps) {
	return (
		<Modal open={Boolean(artist)} onClose={onClose} labelledBy="pick-gig-title">
			{artist && (
				<div className="flex flex-col gap-4 p-6">
					<h2 id="pick-gig-title" className="text-lg font-semibold">
						Which opportunity is this for?
					</h2>

					{gigs.length === 0 ? (
						<>
							<p className="text-sm text-base-content/60">
								You need an open opportunity before you can express interest in{" "}
								<span className="font-medium">{artist.name}</span>.
							</p>
							<Link
								to="/opportunities/new"
								onClick={onClose}
								className="btn btn-primary w-full rounded-full"
							>
								Post an opportunity
							</Link>
						</>
					) : (
						<>
							<p className="text-sm text-base-content/60">
								Pick which of your opportunities {artist.name} is a fit for.
							</p>
							<ul className="flex flex-col gap-2">
								{gigs.map((gig) => (
									<li key={gig.id}>
										<button
											type="button"
											onClick={() => onPick(gig.id)}
											className="btn btn-outline w-full justify-start rounded-xl border-base-content/15 font-normal"
										>
											{gig.title}
										</button>
									</li>
								))}
							</ul>
						</>
					)}
				</div>
			)}
		</Modal>
	);
}
