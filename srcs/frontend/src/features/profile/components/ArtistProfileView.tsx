import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
	CheckIcon,
	CircleCheckIcon,
	CircleDashedIcon,
	EyeIcon,
	MapPinIcon,
	PencilLineIcon,
} from "lucide-react";
import { useAuth } from "../../auth/hooks/useAuth";
import { useCategories } from "../../categories/hooks/useCategories";
import Avatar from "../../../components/Avatar";
import ProfileMediaGallery from "../../artists/components/ProfileMediaGallery";
import type { ProfileMediaItem } from "../../artists/types";
import { fileToMediaItem } from "../../files/toMediaItem";
import type { FileDto } from "../../files/types";
import { fetchMyProfile, saveMyProfile, type ProfileUpdate } from "../api";
import { notifyProfileUpdated } from "../profileEvents";
import PortfolioManager from "./PortfolioManager";
import LabeledField from "./LabeledField";
import FieldError from "../../../components/FieldError";
import { fieldErrorsFromApi, validateForm, type FieldErrors } from "../../../lib/formValidation";
import { useTranslation } from "react-i18next";
import {
	MAX_BIO_LENGTH,
	MAX_CATEGORIES,
	artistDetailsSchema,
	type ArtistDetailsValues,
} from "../schemas";

type Status = { type: "success" | "error"; text: string } | null;

/**
 * The artist's own profile: a live preview built from the same
 * ProfileMediaGallery a hirer swipes through, sitting above an editable form.
 * Every field — including the portfolio itself — updates the preview
 * immediately, no separate "how others see me" step needed.
 */
export default function ArtistProfileView() {
	const { t } = useTranslation();
	const { user } = useAuth();
	const { categories: vocabulary, isLoading: isLoadingCategories } = useCategories();

	const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
	const [bio, setBio] = useState("");
	const [location, setLocation] = useState("");
	const [availability, setAvailability] = useState(true);
	const [status, setStatus] = useState<Status>(null);
	const [errors, setErrors] = useState<FieldErrors<ArtistDetailsValues>>({});
	const [isSaving, setIsSaving] = useState(false);

	// The caller's own public files — real uploads via /api/files, fetched
	// alongside the rest of the profile (see profile.service.ts's `portfolio`).
	const [files, setFiles] = useState<FileDto[]>([]);

	useEffect(() => {
		if (!user) return;
		fetchMyProfile()
			.then((status) => {
				// No profile yet (a brand-new account) — leave the form blank,
				// same as it starts. ProfileOnboardingGate is what actually
				// creates the first one; this just previews whatever exists.
				if (!status.exists) return;
				setSelectedSlugs(status.categories.map((category) => category.slug));
				setBio(status.bio ?? "");
				setLocation(status.location ?? "");
				setAvailability(status.availability);
				setFiles(status.portfolio);
			})
			.catch(() => {});
	}, [user]);

	// ProfileMediaGallery speaks ProfileMediaItem (shared with the hirer-facing
	// swipe deck's viewer) — map the real files into that shape rather than
	// teaching the gallery a second one.
	const media = useMemo(
		() => files.map(fileToMediaItem).filter((item): item is ProfileMediaItem => item !== null),
		[files],
	);

	function handleUploaded(file: FileDto) {
		setFiles((previous) => [file, ...previous]);
	}

	function handleDeleted(id: string) {
		setFiles((previous) => previous.filter((file) => file.id !== id));
	}

	if (!user) return null;

	const selectedCategories = vocabulary.filter((option) => selectedSlugs.includes(option.slug));

	// The server caps a profile at MAX_PROFILE_CATEGORIES; mirroring it here
	// turns a 400 into a disabled button.
	function toggleCategory(slug: string) {
		setSelectedSlugs((previous) => {
			if (previous.includes(slug)) return previous.filter((entry) => entry !== slug);
			if (previous.length >= MAX_CATEGORIES) return previous;
			return [...previous, slug];
		});
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();

		const checked = validateForm(artistDetailsSchema, {
			categories: selectedSlugs,
			bio,
			location,
			availability,
		});
		if (!checked.ok) {
			setErrors(checked.errors);
			return;
		}

		setStatus(null);
		setErrors({});
		setIsSaving(true);
		try {
			//	Empty means "cleared", which the API spells null rather than "".
			const payload: ProfileUpdate = {
				...checked.data,
				bio: checked.data.bio || null,
				location: checked.data.location || null,
			};
			await saveMyProfile(payload);
			notifyProfileUpdated();
			setStatus({ type: "success", text: t("profile.updated") });
		} catch (err) {
			const fromServer = fieldErrorsFromApi<ArtistDetailsValues>(err);
			if (fromServer) setErrors(fromServer);
			else
				setStatus({
					type: "error",
					text: err instanceof Error ? err.message : t("profile.updateFailed"),
				});
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<div className="flex flex-col gap-6">
			<p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-base-content/40 uppercase">
				<EyeIcon className="size-3.5" aria-hidden="true" />
				{t("profile.yourPublicProfile")}
			</p>

			<section className="overflow-hidden rounded-2xl border border-base-content/10 bg-base-100 shadow-sm transition-shadow duration-200 hover:shadow-md">
				<ProfileMediaGallery
					key={user.id}
					media={media}
					name={user.username}
					topLeftSlot={
						<button
							type="button"
							onClick={() => setAvailability((current) => !current)}
							aria-pressed={availability}
							className={`badge badge-sm font-medium transition-colors ${
								availability ? "badge-primary" : "badge-warning"
							}`}
						>
							{availability ? t("profile.available") : t("profile.unavailable")}
						</button>
					}
				/>

				<div className="flex flex-col gap-4 p-5">
					<div className="flex items-center gap-3">
						<Avatar
							username={user.username}
							avatarUrl={user.avatarUrl}
							size="lg"
							className="ring-2 ring-base-100 shadow"
						/>
						<div className="min-w-0">
							<h2 className="truncate text-lg leading-snug font-semibold">{user.username}</h2>
							<p className="truncate text-sm text-base-content/60">
								{selectedCategories[0]?.label ?? t("profile.noCategoryYet")}
								{location && ` · ${location}`}
							</p>
						</div>
					</div>

					<div className="flex flex-wrap gap-2">
						{selectedCategories.length > 0 ? (
							selectedCategories.map((category) => (
								<span
									key={category.slug}
									className="badge badge-sm badge-outline border-base-content/15"
								>
									{category.label}
								</span>
							))
						) : (
							<span className="text-sm text-base-content/40">
								{t("profile.noCategoriesSelected")}
							</span>
						)}
					</div>

					{bio && <p className="text-sm leading-relaxed text-base-content/70">{bio}</p>}

					{location && (
						<div className="flex flex-wrap gap-4 text-sm text-base-content/60">
							<span className="inline-flex items-center gap-1.5">
								<MapPinIcon className="size-3.5" aria-hidden="true" />
								{location}
							</span>
						</div>
					)}
				</div>
			</section>

			<PortfolioManager files={files} onUploaded={handleUploaded} onDeleted={handleDeleted} />

			<section className="rounded-2xl border border-base-content/10 bg-base-100 shadow-sm">
				<div className="flex items-center gap-2.5 border-b border-base-content/10 p-4">
					<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-base-200 text-base-content/60">
						<PencilLineIcon className="size-3.5" aria-hidden="true" />
					</span>
					<div>
						<h2 className="text-xs font-semibold tracking-wide text-base-content/50 uppercase">
							{t("profile.editArtistDetails")}
						</h2>
						<p className="mt-0.5 text-sm text-base-content/60">
							Changes above update the preview instantly — hit save to publish them.
						</p>
					</div>
				</div>

				<form className="flex flex-col gap-5 p-4" onSubmit={handleSubmit}>
					{status && (
						<div
							className={`alert alert-soft ${status.type === "success" ? "alert-success" : "alert-error"}`}
						>
							<span>{status.text}</span>
						</div>
					)}

					<fieldset className="fieldset-label flex-col items-start gap-2">
						<legend className="text-sm font-medium">
							{t("profile.categories")}
							<span className="ml-1 font-normal text-base-content/60">
								(pick at least one, up to {MAX_CATEGORIES})
							</span>
						</legend>
						{isLoadingCategories ? (
							<span className="loading loading-spinner loading-sm" />
						) : (
							<div className="flex flex-wrap gap-2">
								{vocabulary.map((option) => {
									const isSelected = selectedSlugs.includes(option.slug);
									return (
										<button
											key={option.slug}
											type="button"
											className={`btn btn-sm gap-1.5 rounded-full transition-transform duration-150 hover:scale-105 ${
												isSelected ? "btn-primary" : "btn-outline border-base-content/20"
											}`}
											aria-pressed={isSelected}
											onClick={() => toggleCategory(option.slug)}
										>
											{isSelected && <CheckIcon className="size-3.5" aria-hidden="true" />}
											{option.label}
										</button>
									);
								})}
							</div>
						)}
						<FieldError message={errors.categories} />
					</fieldset>

					<LabeledField label={t("profile.bio")} hint={`${bio.length}/${MAX_BIO_LENGTH}`}>
						<textarea
							className="textarea w-full"
							rows={3}
							maxLength={MAX_BIO_LENGTH}
							placeholder={t("profile.bioPlaceholderArtist")}
							value={bio}
							onChange={(e) => setBio(e.target.value)}
							aria-invalid={errors.bio ? "true" : undefined}
						/>
						<FieldError message={errors.bio} />
					</LabeledField>

					<LabeledField label={t("profile.location")} icon={MapPinIcon}>
						<input
							type="text"
							className="input w-full max-w-sm pl-9"
							placeholder={t("profile.locationPlaceholder")}
							value={location}
							onChange={(e) => setLocation(e.target.value)}
							aria-invalid={errors.location ? "true" : undefined}
						/>
						<FieldError message={errors.location} />
					</LabeledField>

					<label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-base-content/10 bg-base-200/40 p-3 transition-colors has-checked:border-primary/30 has-checked:bg-primary/5">
						<span className="flex items-center gap-2.5">
							{availability ? (
								<CircleCheckIcon className="size-5 text-primary" aria-hidden="true" />
							) : (
								<CircleDashedIcon className="size-5 text-base-content/40" aria-hidden="true" />
							)}
							<span>
								<span className="block text-sm font-medium">{t("profile.availableForWork")}</span>
								<span className="block text-xs text-base-content/50">
									{t("profile.availabilityHint")}
								</span>
							</span>
						</span>
						<input
							type="checkbox"
							className="toggle toggle-primary"
							checked={availability}
							onChange={(e) => setAvailability(e.target.checked)}
						/>
					</label>

					<div>
						<button
							type="submit"
							className="btn btn-primary btn-sm rounded-full transition-transform duration-150 hover:scale-[1.02]"
							disabled={isSaving}
						>
							{isSaving && <span className="loading loading-spinner loading-xs" />}
							{t("profile.saveChanges")}
						</button>
					</div>
				</form>
			</section>
		</div>
	);
}
