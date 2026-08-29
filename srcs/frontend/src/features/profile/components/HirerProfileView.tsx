import { type FormEvent, useEffect, useState } from "react";
import { Briefcase, Building2Icon, EyeIcon, MapPinIcon, PencilLineIcon } from "lucide-react";
import { useAuth } from "../../auth/hooks/useAuth";
import Avatar from "../../../components/Avatar";
import type { FileDto } from "../../files/types";
import { fetchMyProfile, saveMyProfile, type ProfileUpdate } from "../api";
import { notifyProfileUpdated } from "../profileEvents";
import LabeledField from "./LabeledField";
import PortfolioManager from "./PortfolioManager";
import FieldError from "../../../components/FieldError";
import { fieldErrorsFromApi, validateForm, type FieldErrors } from "../../../lib/formValidation";
import { MAX_BIO_LENGTH, hirerDetailsSchema, type HirerDetailsValues } from "../schemas";
import { useTranslation } from "react-i18next";

type Status = { type: "success" | "error"; text: string } | null;

/** The hirer's own profile: a live preview card — mirroring how the artist
 *  profile mirrors the swipe deck — sitting above an editable form. */
export default function HirerProfileView() {
	const { t } = useTranslation();
	const { user } = useAuth();

	const [organizationName, setOrganizationName] = useState("");
	const [bio, setBio] = useState("");
	const [location, setLocation] = useState("");
	const [status, setStatus] = useState<Status>(null);
	const [errors, setErrors] = useState<FieldErrors<HirerDetailsValues>>({});
	const [isSaving, setIsSaving] = useState(false);

	// The caller's own public files — same portfolio concept as the artist
	// side, backed by the same /api/files endpoints. Hirers don't get a
	// swipeable gallery preview (no card deck shows them one), just the
	// management grid.
	const [files, setFiles] = useState<FileDto[]>([]);

	useEffect(() => {
		if (!user) return;
		fetchMyProfile()
			.then((status) => {
				// No profile yet (a brand-new account) — leave the form blank,
				// same as it starts. ProfileOnboardingGate is what actually
				// creates the first one; this just previews whatever exists.
				if (!status.exists) return;
				setBio(status.bio ?? "");
				setLocation(status.location ?? "");
				setFiles(status.portfolio);
				if ("organizationName" in status) setOrganizationName(status.organizationName);
			})
			.catch(() => {});
	}, [user]);

	function handleUploaded(file: FileDto) {
		setFiles((previous) => [file, ...previous]);
	}

	function handleDeleted(id: string) {
		setFiles((previous) => previous.filter((file) => file.id !== id));
	}

	if (!user) return null;

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();

		const checked = validateForm(hirerDetailsSchema, { organizationName, bio, location });
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
			const fromServer = fieldErrorsFromApi<HirerDetailsValues>(err);
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
				<div className="h-20 bg-linear-to-r from-primary/15 via-secondary/10 to-transparent" />

				<div className="flex flex-col gap-4 p-5 pt-0">
					<div className="-mt-10 flex items-end gap-3">
						<Avatar
							username={user.username}
							avatarUrl={user.avatarUrl}
							size="lg"
							className="ring-4 ring-base-100 shadow"
						/>
						<div className="min-w-0 pb-1">
							<h2 className="truncate text-lg leading-snug font-semibold">
								{organizationName || user.username}
							</h2>
							<p className="flex items-center gap-1.5 truncate text-sm text-base-content/60">
								<Briefcase className="size-3.5" aria-hidden="true" />
								Hirer{location && ` · ${location}`}
							</p>
						</div>
					</div>

					{bio ? (
						<p className="text-sm leading-relaxed text-base-content/70">{bio}</p>
					) : (
						<p className="text-sm text-base-content/40">{t("profile.noBioYet")}</p>
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
							{t("profile.editHirerDetails")}
						</h2>
						<p className="mt-0.5 text-sm text-base-content/60">
							Shown to artists alongside your opportunities — changes above update instantly.
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

					<LabeledField label={t("profile.organizationName")} icon={Building2Icon}>
						<input
							type="text"
							className="input w-full pl-9"
							value={organizationName}
							onChange={(e) => setOrganizationName(e.target.value)}
							aria-invalid={errors.organizationName ? "true" : undefined}
						/>
						<FieldError message={errors.organizationName} />
					</LabeledField>

					<LabeledField label={t("profile.bio")} hint={`${bio.length}/${MAX_BIO_LENGTH}`}>
						<textarea
							className="textarea w-full"
							rows={3}
							maxLength={MAX_BIO_LENGTH}
							placeholder={t("profile.bioPlaceholderHirer")}
							value={bio}
							onChange={(e) => setBio(e.target.value)}
							aria-invalid={errors.bio ? "true" : undefined}
						/>
						<FieldError message={errors.bio} />
					</LabeledField>

					<LabeledField label={t("profile.location")} icon={MapPinIcon}>
						<input
							type="text"
							className="input w-full pl-9"
							placeholder={t("profile.locationPlaceholder")}
							value={location}
							onChange={(e) => setLocation(e.target.value)}
							aria-invalid={errors.location ? "true" : undefined}
						/>
						<FieldError message={errors.location} />
					</LabeledField>

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