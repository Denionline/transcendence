import { type FormEvent, useState } from "react";
import { KeyRound, UserRound } from "lucide-react";
import { useAuth } from "../features/auth/hooks/useAuth";

export default function AdminSettingsPage() {
	const { user, updateProfile, updatePassword } = useAuth();

	const [username, setUsername] = useState(user?.username ?? "");
	const [email, setEmail] = useState(user?.email ?? "");
	const [profileStatus, setProfileStatus] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);
	const [isSavingProfile, setIsSavingProfile] = useState(false);

	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [passwordStatus, setPasswordStatus] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);
	const [isSavingPassword, setIsSavingPassword] = useState(false);

	async function handleProfileSubmit(e: FormEvent) {
		e.preventDefault();
		setProfileStatus(null);
		setIsSavingProfile(true);
		try {
			await updateProfile({ username: username.trim(), email: email.trim() });
			setProfileStatus({ type: "success", text: "Profile updated successfully." });
		} catch (err) {
			setProfileStatus({
				type: "error",
				text: err instanceof Error ? err.message : "Update failed.",
			});
		} finally {
			setIsSavingProfile(false);
		}
	}

	async function handlePasswordSubmit(e: FormEvent) {
		e.preventDefault();
		setPasswordStatus(null);

		// Mirrors updateUser's own bounds on the backend — a mismatch here
		// would just mean the request round-trips to be told the same thing.
		if (newPassword.length < 8 || newPassword.length > 72) {
			setPasswordStatus({
				type: "error",
				text: "New password must be between 8 and 72 characters.",
			});
			return;
		}
		if (newPassword !== confirmPassword) {
			setPasswordStatus({ type: "error", text: "Passwords do not match." });
			return;
		}

		setIsSavingPassword(true);
		try {
			await updatePassword(currentPassword, newPassword);
			setPasswordStatus({ type: "success", text: "Password changed successfully." });
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
		} catch (err) {
			setPasswordStatus({
				type: "error",
				text: err instanceof Error ? err.message : "Update failed.",
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
						<span className="text-sm font-medium">Username</span>
						<input
							type="text"
							className="input w-full max-w-sm"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							required
						/>
					</label>

					<label className="fieldset-label flex-col items-start gap-1">
						<span className="text-sm font-medium">Email</span>
						<input
							type="email"
							className="input w-full max-w-sm"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
						/>
					</label>

					<div>
						<button type="submit" className="btn btn-primary btn-sm" disabled={isSavingProfile}>
							{isSavingProfile && <span className="loading loading-spinner loading-xs" />}
							Save changes
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
						<span className="text-sm font-medium">Current password</span>
						<input
							type="password"
							className="input w-full max-w-sm"
							value={currentPassword}
							onChange={(e) => setCurrentPassword(e.target.value)}
							required
						/>
					</label>

					<label className="fieldset-label flex-col items-start gap-1">
						<span className="text-sm font-medium">New password</span>
						<input
							type="password"
							className="input w-full max-w-sm"
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							required
						/>
					</label>

					<label className="fieldset-label flex-col items-start gap-1">
						<span className="text-sm font-medium">Confirm new password</span>
						<input
							type="password"
							className="input w-full max-w-sm"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							required
						/>
					</label>

					<div>
						<button type="submit" className="btn btn-primary btn-sm" disabled={isSavingPassword}>
							{isSavingPassword && <span className="loading loading-spinner loading-xs" />}
							Update password
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
