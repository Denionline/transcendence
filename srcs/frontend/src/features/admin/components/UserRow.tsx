import { Pencil, Trash2 } from "lucide-react";
import type { ManagedUser } from "../types";
import { formatDate } from "../../../lib/format";
import { ROLE_BADGE } from "../constants";
import Avatar from "../../../components/Avatar";
import { useTranslation } from "react-i18next";

export default function UserRow({
	user,
	isSelf,
	selected,
	onToggleSelect,
	onEdit,
	onDelete,
}: {
	user: ManagedUser;
	isSelf: boolean;
	selected: boolean;
	onToggleSelect: () => void;
	onEdit: () => void;
	onDelete: () => void;
}) {
	const { t } = useTranslation();
	return (
		<tr className={selected ? "bg-base-200" : undefined}>
			<th>
				<input
					type="checkbox"
					className="checkbox"
					aria-label={`Select ${user.username}`}
					checked={selected}
					disabled={isSelf}
					onChange={onToggleSelect}
				/>
			</th>
			<td>
				<div className="flex items-center gap-3">
					<Avatar username={user.username} avatarUrl={user.avatarUrl} size="md" />
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
			<td>{formatDate(user.createdAt)}</td>
			<td>
				<div className="flex justify-end gap-1">
					<button
						type="button"
						className="btn btn-ghost btn-xs tooltip"
						data-tip={t("admin.editUser")}
						aria-label={t("admin.editUser")}
						onClick={onEdit}
					>
						<Pencil className="size-4" />
					</button>
					<button
						type="button"
						className="btn btn-ghost btn-xs text-error tooltip tooltip-left"
						data-tip={isSelf ? t("admin.cantDeleteSelf") : t("admin.deleteUser")}
						aria-label={isSelf ? t("admin.cantDeleteSelf") : t("admin.deleteUser")}
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
