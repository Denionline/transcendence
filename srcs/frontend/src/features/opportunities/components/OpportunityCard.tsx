import { BadgeCheckIcon } from "lucide-react";
import Avatar from "../../../components/Avatar";
import { useTranslation } from "react-i18next";

export interface OpportunityCardData {
	hirerName: string;
	hirerAvatarUrl?: string | null;
	title: string;
	description: string;
	location: string;
	remoteOk: boolean;
	duration: string;
	tags: string[];
	isNew?: boolean;
	coverPhotoUrl?: string | null;
}

export default function OpportunityCard({
	hirerName,
	hirerAvatarUrl,
	title,
	description,
	location,
	remoteOk,
	duration,
	tags,
	isNew,
	coverPhotoUrl,
}: OpportunityCardData) {
	const { t } = useTranslation();
	return (
		<div className="overflow-hidden rounded-2xl border border-base-content/10 bg-base-100">
			<div className="relative aspect-4/3 bg-[repeating-linear-gradient(45deg,color-mix(in_oklab,var(--color-base-content)_6%,transparent)_0px,color-mix(in_oklab,var(--color-base-content)_6%,transparent)_10px,transparent_10px,transparent_20px)] bg-base-200">
				{isNew && (
					<span className="badge badge-sm badge-primary absolute top-3 left-3 font-medium">
						{t("deck.new")}
					</span>
				)}
				{coverPhotoUrl ? (
					<img src={coverPhotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
				) : (
					<span className="absolute inset-0 flex items-center justify-center text-[10px] tracking-wide text-base-content/40 uppercase">
						{t("common.coverPhoto")}
					</span>
				)}
			</div>

			<div className="flex flex-col gap-3 p-4">
				<div className="flex items-center gap-2 text-sm">
					<Avatar
						username={hirerName || "?"}
						avatarUrl={hirerAvatarUrl}
						size="sm"
						className="shrink-0"
					/>
					<div className="min-w-0">
						<div className="flex items-center gap-1 truncate font-medium">
							<span className="truncate">{hirerName || t("preview.yourBrand")}</span>
							<BadgeCheckIcon className="size-3.5 shrink-0 text-primary" />
						</div>
						<div className="truncate text-xs text-base-content/50">
							{t("deck.verifiedHirer")} ·{" "}
							{remoteOk ? t("deck.remoteOk") : location || t("preview.locationTbd")}
						</div>
					</div>
				</div>

				<h3 className="leading-snug font-semibold">{title || t("preview.titlePlaceholder")}</h3>

				<div className="flex flex-wrap gap-2">
					<span className="badge badge-sm badge-primary">
						{duration || t("preview.durationTbd")}
					</span>
					{remoteOk && (
						<span className="badge badge-sm badge-outline border-base-content/15">Remote</span>
					)}
				</div>

				<p className="line-clamp-2 text-sm text-base-content/60">
					{description ||
						"A short brief describing the work, the vibe, and what a good fit looks like."}
				</p>

				{tags.length > 0 && (
					<div className="flex flex-wrap gap-1.5">
						{tags.map((tag) => (
							<span key={tag} className="badge badge-sm badge-ghost">
								{tag}
							</span>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
