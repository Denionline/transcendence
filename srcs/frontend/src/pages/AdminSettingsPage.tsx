import { type FormEvent, useState } from "react";
import { KeyRound, UserRound } from "lucide-react";
import { useAuth } from "../features/auth/hooks/useAuth";
import FieldError from "../components/FieldError";
import PasswordStrengthChecklist from "../features/auth/components/PasswordStrengthChecklist";
import { fieldErrorsFromApi, validateForm, type FieldErrors } from "../lib/formValidation";
import { changePasswordSchema, type ChangePasswordValues } from "../features/auth/schemas";
import { accountSchema } from "../features/profile/schemas";
import { useTranslation } from "react-i18next";
import { translateFieldError } from "../i18n/validation";

//	The same account rules as the profile page, minus the avatar this form
//	does not collect.
const profileSchema = accountSchema.omit({ avatarUrl: true });
type ProfileValues = { username: string; email: string };

export default function AdminSettingsPage() {
	const { t } = useTranslation();
	const { user, updateProfile, updatePassword } = useAuth();

	const [username, setUsername] = useState(user?.username ?? "");
	const [email, setEmail] = useState(user?.email ?? "");
	const [profileStatus, setProfileStatus] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);
	const [profileErrors, setProfileErrors] = useState<FieldErrors<ProfileValues>>({});
	const [isSavingProfile, setIsSavingProfile] = useState(false);

	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [passwordStatus, setPasswordStatus] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);
	const [passwordErrors, setPasswordErrors] = useState<FieldErrors<ChangePasswordValues>>({});
	const [isSavingPassword, setIsSavingPassword] = useState(false);

	async function handleProfileSubmit(e: FormEvent) {
		e.preventDefault();

		const checked = validateForm(profileSchema, { username, email });
		if (!checked.ok) {
			setProfileErrors(checked.errors);
			return;
		}

		setProfileStatus(null);
		setProfileErrors({});
		setIsSavingProfile(true);
		try {
			await updateProfile(checked.data);
			setProfileStatus({ type: "success", text: t("profile.updated") });
		} catch (err) {
			const fromServer = fieldErrorsFromApi<ProfileValues>(err);
			if (fromServer) setProfileErrors(fromServer);
			else
				setProfileStatus({
					type: "error",
					text: err instanceof Error ? err.message : t("settings.updateFailed"),
				});
		} finally {
			setIsSavingProfile(false);
		}
	}

	async function handlePasswordSubmit(e: FormEvent) {
		e.preventDefault();

		//	The same schema registration uses. A length check alone was laxer
		//	than the server, which also wants four character classes — so the
		//	only feedback on a weak password was a 400 after submitting.
		const checked = validateForm(changePasswordSchema, {
			currentPassword,
			newPassword,
			confirmPassword,
		});
		if (!checked.ok) {
			setPasswordErrors(checked.errors);
			return;
		}

		setPasswordStatus(null);
		setPasswordErrors({});
		setIsSavingPassword(true);
		try {
			await updatePassword(currentPassword, newPassword);
			setPasswordStatus({ type: "success", text: t("common.passwordChanged") });
			setPasswordErrors({});
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
		} catch (err) {
			setPasswordStatus({
				type: "error",
				text: err instanceof Error ? err.message : t("settings.updateFailed"),
			});
		} finally {
			setIsSavingPassword(false);
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<div>
				<h1 className="text-xl font-bold">Settings</h1>
				<p className="text-sm text-base-content/60">Manage your administrator account.</p>
			</div>

			<div className="rounded-box border border-base-content/10 bg-base-100">
				<div className="flex items-center gap-2 border-b border-base-content/10 p-4">
					<UserRound className="size-5 text-base-content/60" />
					<h2 className="font-semibold">Profile</h2>
				</div>

				<form className="flex flex-col gap-4 p-4" onSubmit={handleProfileSubmit}>
					{profileStatus && (
						<div
							className={`alert ${profileStatus.type === "success" ? "alert-success" : "alert-error"}`}
						>
							<span>{profileStatus.text}</span>
						</div>
					)}

					<label className="fieldset-label flex-col items-start gap-1">
						<span className="text-sm font-medium">{t("settings.username")}</span>
						<input
							type="text"
							className="input w-full max-w-sm"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							aria-invalid={profileErrors.username ? "true" : undefined}
						/>
						<FieldError message={translateFieldError(t, profileErrors.username)} />
					</label>

					<label className="fieldset-label flex-col items-start gap-1">
						<span className="text-sm font-medium">Email</span>
						<input
							type="email"
							className="input w-full max-w-sm"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							aria-invalid={profileErrors.email ? "true" : undefined}
						/>
						<FieldError message={translateFieldError(t, profileErrors.email)} />
					</label>

					<div>
						<button type="submit" className="btn btn-primary btn-sm" disabled={isSavingProfile}>
							{isSavingProfile && <span className="loading loading-spinner loading-xs" />}
							{t("settings.saveChanges")}
						</button>
					</div>
				</form>
			</div>

			<div className="rounded-box border border-base-content/10 bg-base-100">
				<div className="flex items-center gap-2 border-b border-base-content/10 p-4">
					<KeyRound className="size-5 text-base-content/60" />
					<h2 className="font-semibold">Security</h2>
				</div>

				<form className="flex flex-col gap-4 p-4" onSubmit={handlePasswordSubmit}>
					{passwordStatus && (
						<div
							className={`alert ${passwordStatus.type === "success" ? "alert-success" : "alert-error"}`}
						>
							<span>{passwordStatus.text}</span>
						</div>
					)}

					<label className="fieldset-label flex-col items-start gap-1">
						<span className="text-sm font-medium">{t("common.currentPassword")}</span>
						<input
							type="password"
							className="input w-full max-w-sm"
							value={currentPassword}
							onChange={(e) => setCurrentPassword(e.target.value)}
							aria-invalid={passwordErrors.currentPassword ? "true" : undefined}
						/>
						<FieldError message={translateFieldError(t, passwordErrors.currentPassword)} />
					</label>

					<label className="fieldset-label flex-col items-start gap-1">
						<span className="text-sm font-medium">New password</span>
						<input
							type="password"
							className="input w-full max-w-sm"
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							aria-invalid={passwordErrors.newPassword ? "true" : undefined}
						/>
						<FieldError message={translateFieldError(t, passwordErrors.newPassword)} />
						{/*	The same checklist registration shows, so both places
							teach the same rules while you type. */}
						{newPassword !== "" && (
							<PasswordStrengthChecklist password={newPassword} name={username} email={email} />
						)}
					</label>

					<label className="fieldset-label flex-col items-start gap-1">
						<span className="text-sm font-medium">Confirm new password</span>
						<input
							type="password"
							className="input w-full max-w-sm"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							aria-invalid={passwordErrors.confirmPassword ? "true" : undefined}
						/>
						<FieldError message={translateFieldError(t, passwordErrors.confirmPassword)} />
					</label>

					<div>
						<button type="submit" className="btn btn-primary btn-sm" disabled={isSavingPassword}>
							{isSavingPassword && <span className="loading loading-spinner loading-xs" />}
							{t("common.updatePassword")}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
