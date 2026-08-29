import { BadgeCheckIcon, XIcon } from "lucide-react";
import Modal from "../../../components/Modal";
import Avatar from "../../../components/Avatar";
import type { GigListing } from "../gigTypes";
import { useTranslation } from "react-i18next";

interface GigDetailsModalProps {
	gig: GigListing | null;
	/** Discipline slugs currently checked in the sidebar filter — the category badge highlights when it's one of them. */
	selectedDisciplines?: Set<string>;
	onClose: () => void;
	onPass: () => void;
	onInterested: () => void;
}

export default function GigDetailsModal({
	gig,
	selectedDisciplines,
	onClose,
	onPass,
	onInterested,
}: GigDetailsModalProps) {
	const { t } = useTranslation();
	return (
		<Modal open={Boolean(gig)} onClose={onClose} labelledBy="gig-details-title">
			{gig && (
				<>
					<div className="relative aspect-16/9 bg-neutral bg-[repeating-linear-gradient(45deg,color-mix(in_oklab,var(--color-primary)_18%,transparent)_0px,color-mix(in_oklab,var(--color-primary)_18%,transparent)_10px,transparent_10px,transparent_20px)]">
						<span
							className={`badge badge-sm absolute top-3 left-3 font-medium ${gig.isNew ? "badge-primary" : "badge-ghost"}`}
						>
							{gig.postedLabel}
						</span>
						{gig.coverPhotoUrl ? (
							<img
								src={gig.coverPhotoUrl}
								alt=""
								className="absolute inset-0 h-full w-full object-cover"
							/>
						) : (
							<span className="absolute inset-0 flex items-center justify-center text-xs tracking-wide text-base-content/40 uppercase">
								Venue / brand shot
							</span>
						)}
					</div>

					<div className="flex flex-col gap-4 p-6">
						<div className="flex items-center gap-2 text-sm">
							<Avatar
								username={gig.hirerName}
								avatarUrl={gig.hirerAvatarUrl}
								size="sm"
								className="shrink-0"
							/>
							<div className="min-w-0">
								<div className="flex items-center gap-1 truncate font-medium">
									<span className="truncate">{gig.hirerName}</span>
									{gig.verified && (
										<BadgeCheckIcon className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
									)}
								</div>
								<div className="truncate text-xs text-base-content/50">
									{t("deck.verifiedHirer")} · {gig.remoteOk ? t("deck.remoteOk") : gig.location}
								</div>
							</div>
						</div>

						<h2 id="gig-details-title" className="text-xl leading-snug font-semibold">
							{gig.title}
						</h2>

						<div className="flex flex-wrap gap-2">
							<span
								className={`badge badge-sm ${
									selectedDisciplines?.has(gig.category)
										? "badge-primary"
										: "badge-outline border-base-content/15"
								}`}
							>
								{gig.categoryLabel}
							</span>
							<span className="badge badge-sm badge-outline border-base-content/15">
								{gig.duration}
							</span>
							<span className="badge badge-sm badge-outline border-base-content/15">
								{gig.remoteOk ? t("deck.remote") : t("deck.onSite")}
							</span>
						</div>

						<p className="text-sm leading-relaxed text-base-content/70">{gig.description}</p>

						{/* <div className="flex flex-wrap gap-1.5">
							{gig.tags.map((tag) => (
								<span key={tag} className="badge badge-sm badge-ghost">
									{tag}
								</span>
							))}
						</div> */}

						<div className="flex items-center gap-2 pt-2">
							<button
								type="button"
								onClick={() => {
									onPass();
									onClose();
								}}
								aria-label={`Pass on ${gig.title}`}
								className="btn btn-circle border border-base-content/15 bg-transparent transition-[background-color,border-color,color,transform] duration-150 hover:scale-110 hover:border-error/50 hover:bg-error/10 hover:text-error"
							>
								<XIcon className="size-5" aria-hidden="true" />
							</button>
							<button
								type="button"
								onClick={() => {
									onInterested();
									onClose();
								}}
								className="btn btn-primary flex-1 rounded-full transition-transform duration-150 hover:scale-[1.02]"
							>
								Interested
							</button>
						</div>
					</div>
				</>
			)}
		</Modal>
	);
}
