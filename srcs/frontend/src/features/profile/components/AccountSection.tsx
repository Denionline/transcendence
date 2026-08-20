import { type FormEvent, useState } from "react";
import { LinkIcon, MailIcon, UserRound, UserRoundIcon } from "lucide-react";
import { useAuth } from "../../auth/hooks/useAuth";
import Avatar from "../../../components/Avatar";
import LabeledField from "./LabeledField";

type Status = { type: "success" | "error"; text: string } | null;

/** Settings → Account: the only fields that describe the *login*, not the
 *  artist/hirer profile — username, email, avatar. Everything role-specific
 *  (bio, categories, rate, …) lives on the dedicated Profile page instead,
 *  reached from the navbar's account menu. */
export default function AccountSection() {
	const { user, updateProfile } = useAuth();

	const [username, setUsername] = useState(user?.username ?? "");
	const [email, setEmail] = useState(user?.email ?? "");
	const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
	const [status, setStatus] = useState<Status>(null);
	const [isSaving, setIsSaving] = useState(false);

	if (!user) return null;

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setStatus(null);
		setIsSaving(true);
		try {
			await updateProfile({
				username: username.trim(),
				email: email.trim(),
				avatarUrl: avatarUrl.trim() || null,
			});
			setStatus({ type: "success", text: "Account updated successfully." });
		} catch (err) {
			setStatus({
				type: "error",
				text: err instanceof Error ? err.message : "Update failed.",
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
				<h2 className="font-semibold">Account</h2>
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
					<Avatar
						username={username || user.username}
						avatarUrl={avatarUrl || null}
						size="lg"
						className="ring-2 ring-base-100 shadow"
					/>
					<p className="text-sm text-base-content/60">
						Paste an image URL below. Leave it blank to use your initials.
					</p>
				</div>

				<LabeledField label="Username" icon={UserRoundIcon} className="max-w-sm">
					<input
						type="text"
						className="input w-full pl-9"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						required
					/>
				</LabeledField>

				<LabeledField label="Email" icon={MailIcon} className="max-w-sm">
					<input
						type="email"
						className="input w-full pl-9"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
					/>
				</LabeledField>

				<LabeledField label="Avatar URL" icon={LinkIcon} hint="optional" className="max-w-sm">
					<input
						type="url"
						className="input w-full pl-9"
						placeholder="https://..."
						value={avatarUrl}
						onChange={(e) => setAvatarUrl(e.target.value)}
					/>
				</LabeledField>

				<div>
					<button
						type="submit"
						className="btn btn-primary btn-sm rounded-full transition-transform duration-150 hover:scale-[1.02]"
						disabled={isSaving}
					>
						{isSaving && <span className="loading loading-spinner loading-xs" />}
						Save changes
					</button>
				</div>
			</form>
		</div>
	);
}
