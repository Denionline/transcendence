import { type ChangeEvent, type FormEvent, useRef, useState } from "react";
import { CameraIcon, LinkIcon, MailIcon, UserRound, UserRoundIcon } from "lucide-react";
import { useAuth } from "../../auth/hooks/useAuth";
import Avatar from "../../../components/Avatar";
import { uploadFile } from "../../files/api";
import { FILE_RULES } from "../../files/constants";
import { validationErrorFor } from "../../files/schemas";
import FieldError from "../../../components/FieldError";
import { fieldErrorsFromApi, validateForm, type FieldErrors } from "../../../lib/formValidation";
import { accountSchema, type AccountValues } from "../schemas";
import LabeledField from "./LabeledField";
import { useTranslation } from "react-i18next";

type Status = { type: "success" | "error"; text: string } | null;

/** Settings → Account: the only fields that describe the *login*, not the
 *  artist/hirer profile — username, email, avatar. Everything role-specific
 *  (bio, categories, rate, …) lives on the dedicated Profile page instead,
 *  reached from the navbar's account menu. */
export default function AccountSection() {
	const { t } = useTranslation();
	const { user, updateProfile } = useAuth();

	const [username, setUsername] = useState(user?.username ?? "");
	const [email, setEmail] = useState(user?.email ?? "");
	const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
	const [status, setStatus] = useState<Status>(null);
	const [errors, setErrors] = useState<FieldErrors<AccountValues>>({});
	const [isSaving, setIsSaving] = useState(false);

	const avatarInputRef = useRef<HTMLInputElement>(null);
	const [avatarProgress, setAvatarProgress] = useState<number | null>(null);
	const [avatarError, setAvatarError] = useState<string | null>(null);

	if (!user) return null;

	// The upload itself is real and immediate — it's only *this account*
	// that doesn't have the new photo until Save changes is clicked, same as
	// typing a URL into the field below always worked.
	function handleAvatarFileChange(e: ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;

		const problem = validationErrorFor(file);
		if (problem || !file.type.startsWith("image/")) {
			setAvatarError(problem ?? t("settings.chooseImage"));
			return;
		}

		setAvatarError(null);
		setAvatarProgress(0);
		uploadFile(file, { visibility: "public", onProgress: setAvatarProgress })
			.then((uploaded) => setAvatarUrl(uploaded.url))
			.catch((err: unknown) => {
				setAvatarError(err instanceof Error ? err.message : t("settings.uploadFailed"));
			})
			.finally(() => setAvatarProgress(null));
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();

		const checked = validateForm(accountSchema, { username, email, avatarUrl });
		if (!checked.ok) {
			setErrors(checked.errors);
			return;
		}

		setStatus(null);
		setErrors({});
		setIsSaving(true);
		try {
			//	"" is this form's way of saying "no avatar"; the API wants null.
			await updateProfile({ ...checked.data, avatarUrl: checked.data.avatarUrl || null });
			setStatus({ type: "success", text: t("settings.accountUpdated") });
		} catch (err) {
			//	A rule only the server knows — this email already belongs to
			//	someone — belongs under its input, not in the banner.
			const fromServer = fieldErrorsFromApi<AccountValues>(err);
			if (fromServer) setErrors(fromServer);
			else
				setStatus({
					type: "error",
					text: err instanceof Error ? err.message : t("settings.updateFailed"),
				});
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<div className="rounded-2xl border border-base-content/10 bg-base-100 shadow-sm">
			<div className="flex items-center gap-2.5 border-b border-base-content/10 p-4">
				<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-base-200 text-base-content/60">
					<UserRound className="size-3.5" aria-hidden="true" />
				</span>
				<h2 className="font-semibold">{t("profile.account")}</h2>
			</div>

			<form className="flex flex-col gap-5 p-4" onSubmit={handleSubmit}>
				{status && (
					<div
						className={`alert alert-soft ${status.type === "success" ? "alert-success" : "alert-error"}`}
					>
						<span>{status.text}</span>
					</div>
				)}

				<div className="flex items-center gap-4">
					<div className="relative shrink-0">
						<Avatar
							username={username || user.username}
							avatarUrl={avatarUrl || null}
							size="lg"
							className="ring-2 ring-base-100 shadow"
						/>
						<input
							ref={avatarInputRef}
							type="file"
							className="hidden"
							accept={FILE_RULES.image.mimeTypes.join(",")}
							onChange={handleAvatarFileChange}
						/>
						<button
							type="button"
							onClick={() => avatarInputRef.current?.click()}
							disabled={avatarProgress !== null}
							aria-label={t("settings.changePhoto")}
							className="btn btn-circle btn-primary btn-xs absolute -right-1 -bottom-1 shadow ring-2 ring-base-100 transition-transform duration-150 hover:scale-110 disabled:opacity-70"
						>
							{avatarProgress !== null ? (
								<span className="loading loading-spinner loading-xs" />
							) : (
								<CameraIcon className="size-3.5" aria-hidden="true" />
							)}
						</button>
					</div>
					<div className="flex flex-col gap-1">
						<p className="text-sm text-base-content/60">{t("profile.avatarHint")}</p>
						{avatarError && <p className="text-xs text-error">{avatarError}</p>}
					</div>
				</div>

				<LabeledField label={t("settings.username")} icon={UserRoundIcon} className="max-w-sm">
					<input
						type="text"
						className="input w-full pl-9"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						aria-invalid={errors.username ? "true" : undefined}
					/>
					<FieldError message={errors.username} />
				</LabeledField>

				<LabeledField label={t("settings.email")} icon={MailIcon} className="max-w-sm">
					<input
						type="email"
						className="input w-full pl-9"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						aria-invalid={errors.email ? "true" : undefined}
					/>
					<FieldError message={errors.email} />
				</LabeledField>

				<LabeledField
					label={t("settings.avatarUrl")}
					icon={LinkIcon}
					hint={t("settings.optional")}
					className="max-w-sm"
				>
					{/* type="text", not "url": an upload above fills this with a
					    relative /api/files/... path, which the browser's built-in
					    URL validation would otherwise reject on submit. */}
					<input
						type="text"
						className="input w-full pl-9"
						placeholder={t("settings.avatarUrlPlaceholder")}
						value={avatarUrl}
						onChange={(e) => setAvatarUrl(e.target.value)}
						aria-invalid={errors.avatarUrl ? "true" : undefined}
					/>
					<FieldError message={errors.avatarUrl} />
				</LabeledField>

				<div>
					<button
						type="submit"
						className="btn btn-primary btn-sm rounded-full transition-transform duration-150 hover:scale-[1.02]"
						disabled={isSaving}
					>
						{isSaving && <span className="loading loading-spinner loading-xs" />}
						{t("settings.saveChanges")}
					</button>
				</div>
			</form>
		</div>
	);
}
