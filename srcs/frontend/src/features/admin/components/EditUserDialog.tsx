import { type FormEvent, useEffect, useRef, useState } from "react";
import type { User, UserRole } from "../../auth/types";

const ROLES: UserRole[] = ["artist", "hirer", "admin"];

interface EditUserDialogProps {
	user: User | null;
	onClose: () => void;
	onSave: (
		id: string,
		updates: { username: string; email: string; role: UserRole },
	) => Promise<void>;
}

export default function EditUserDialog({ user, onClose, onSave }: EditUserDialogProps) {
	const dialogRef = useRef<HTMLDialogElement>(null);

	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<UserRole>("artist");
	const [error, setError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	const [dialogUser, setDialogUser] = useState<User | null>(null);
	if (user !== dialogUser) {
		setDialogUser(user);
		if (user) {
			setUsername(user.username);
			setEmail(user.email);
			setRole(user.role);
			setError(null);
		}
	}

	useEffect(() => {
		if (user) {
			dialogRef.current?.showModal();
		} else {
			dialogRef.current?.close();
		}
	}, [user]);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!user) return;

		setError(null);
		setIsSaving(true);
		try {
			await onSave(user.id, { username: username.trim(), email: email.trim(), role });
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Update failed.");
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<dialog ref={dialogRef} className="modal" onClose={onClose}>
			<div className="modal-box">
				<h3 className="text-lg font-bold">Edit user</h3>

				<form className="flex flex-col gap-4 pt-4" onSubmit={handleSubmit}>
					{error && (
						<div className="alert alert-error">
							<span>{error}</span>
						</div>
					)}

					<label className="fieldset-label flex-col items-start gap-1">
						<span className="text-sm font-medium">Username</span>
						<input
							type="text"
							className="input w-full"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							required
						/>
					</label>

					<label className="fieldset-label flex-col items-start gap-1">
						<span className="text-sm font-medium">Email</span>
						<input
							type="email"
							className="input w-full"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
						/>
					</label>

					<label className="fieldset-label flex-col items-start gap-1">
						<span className="text-sm font-medium">Role</span>
						<select
							className="select w-full"
							value={role}
							onChange={(e) => setRole(e.target.value as UserRole)}
						>
							{ROLES.map((r) => (
								<option key={r} value={r}>
									{r}
								</option>
							))}
						</select>
					</label>

					<div className="modal-action">
						<button type="button" className="btn" onClick={onClose} disabled={isSaving}>
							Cancel
						</button>
						<button type="submit" className="btn btn-primary" disabled={isSaving}>
							{isSaving && <span className="loading loading-spinner loading-xs" />}
							Save changes
						</button>
					</div>
				</form>
			</div>
			<form method="dialog" className="modal-backdrop">
				<button>close</button>
			</form>
		</dialog>
	);
}
