import type { ReactNode } from "react";
import Avatar from "../../../components/Avatar";
import FileGallery from "../../files/components/FileGallery";
import { profileDisplayName } from "../utils";
import type { PublicProfileDto } from "../types";
import { useTranslation } from "react-i18next";

interface PublicProfileViewProps {
	profile: PublicProfileDto;
	/** Rendered next to the name — the Add Friend button/state, when shown. */
	friendSlot?: ReactNode;
}

/** Read-only rendering of another user's artist/hirer profile — shared by
 *  the search-result modal and the full profile page so the two stay in sync. */
export default function PublicProfileView({ profile, friendSlot }: PublicProfileViewProps) {
	const { t } = useTranslation();
	const username = profileDisplayName(profile);
	const categoryLabel = profile.categories.map((category) => category.label).join(", ") || "";
	// The avatar above already shows this photo — an artist can upload the
	// same file both as their avatar and into their portfolio, so without
	// this it would render a second time in the grid below.
	const avatarUrl = profile.user?.avatarUrl;
	const portfolioFiles = avatarUrl
		? profile.portfolio.filter((file) => file.url !== avatarUrl)
		: profile.portfolio;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-start gap-4">
				<Avatar username={username} avatarUrl={profile.user?.avatarUrl} size="lg" />
				<div className="min-w-0 flex-1">
					<div className="truncate text-xl leading-snug font-semibold">{username}</div>
					<div className="truncate text-sm text-base-content/60">
						{categoryLabel && `${categoryLabel} · `}
						{profile.location ?? t("profile.locationTbd")}
					</div>
				</div>
				{friendSlot}
			</div>

			<div className="flex flex-wrap gap-2">
				<span
					className={`badge badge-sm font-medium ${
						profile.role === "artist" ? "badge-primary" : "badge-secondary"
					}`}
				>
					{profile.role === "artist" ? t("profile.artist") : t("profile.hirer")}
				</span>
				{profile.role === "artist" && (
					<span
						className={`badge badge-sm font-medium ${
							profile.availability ? "badge-primary" : "badge-ghost"
						}`}
					>
						{profile.availability ? t("profile.available") : t("profile.unavailable")}
					</span>
				)}
			</div>

			{profile.bio ? (
				<p className="text-sm leading-relaxed text-base-content/70">{profile.bio}</p>
			) : (
				<p className="text-sm text-base-content/40 italic">{t("profile.noBio")}</p>
			)}

			{portfolioFiles.length > 0 && (
				<div className="flex flex-col gap-2">
					<h3 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
						{t("profile.portfolio")}
					</h3>
					{/* Read-only: no `onDelete`. These are someone else's files. */}
					<FileGallery files={portfolioFiles} />
				</div>
			)}
		</div>
	);
}
