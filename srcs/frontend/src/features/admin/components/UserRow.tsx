import { Ban, CircleCheck, Pencil, Trash2 } from "lucide-react";
import type { User, UserRole } from "../../auth/types";

const ROLE_BADGE: Record<UserRole, string> = {
	admin: "badge-primary",
	hirer: "badge-secondary",
	artist: "badge-accent",
};

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function initials(username: string): string {
	return username.slice(0, 2).toUpperCase();
}

export default function UserRow({
	user,
	isSelf,
	selected,
	onToggleSelect,
	onToggleActive,
	onEdit,
	onDelete,
}: {
	user: User;
	isSelf: boolean;
	selected: boolean;
	onToggleSelect: () => void;
	onToggleActive: () => void;
	onEdit: () => void;
	onDelete: () => void;
}) {
	return (
		<tr className={selected ? "bg-base-200" : undefined}>
			<th>
				<input
					type="checkbox"
					className="checkbox"
					checked={selected}
					disabled={isSelf}
					onChange={onToggleSelect}
				/>
			</th>
			<td>
				<div className="flex items-center gap-3">
					<div className="avatar avatar-placeholder">
						<div className="w-10 rounded-full bg-neutral text-neutral-content">
							<span className="text-xs">{initials(user.username)}</span>
						</div>
					</div>
					<div>
						<div className="font-bold">
							{user.username}
							{isSelf && <span className="badge badge-ghost badge-sm ml-2">You</span>}
						</div>
						<div className="text-sm opacity-50">{user.email}</div>
					</div>
				</div>
			</td>
			<td>
				<span className={`badge badge-sm ${ROLE_BADGE[user.role]}`}>{user.role}</span>
			</td>
			<td>
				<span className={`badge badge-sm ${user.isActive ? "badge-success" : "badge-error"}`}>
					{user.isActive ? "active" : "disabled"}
				</span>
			</td>
			<td>{formatDate(user.createdAt)}</td>
			<td>
				<div className="flex justify-end gap-1">
					<button
						className="btn btn-ghost btn-xs tooltip"
						data-tip="Edit user"
						onClick={onEdit}
					>
						<Pencil className="size-4" />
					</button>
					<button
						className={`btn btn-ghost btn-xs tooltip ${isSelf ? "tooltip-left" : ""}`}
						data-tip={
							isSelf
								? "You can't modify your own account"
								: user.isActive
									? "Disable user"
									: "Enable user"
						}
						disabled={isSelf}
						onClick={onToggleActive}
					>
						{user.isActive ? <Ban className="size-4" /> : <CircleCheck className="size-4" />}
					</button>
					<button
						className="btn btn-ghost btn-xs text-error tooltip tooltip-left"
						data-tip={isSelf ? "You can't delete your own account" : "Delete user"}
						disabled={isSelf}
						onClick={onDelete}
					>
						<Trash2 className="size-4" />
					</button>
				</div>
			</td>
		</tr>
	);
}
