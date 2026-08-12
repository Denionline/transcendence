import { useMemo } from "react";
import { ShieldCheck, Users2 } from "lucide-react";
import { useAuth } from "../features/auth/hooks/useAuth";
import { useUsers } from "../features/admin/hooks/useUsers";
import { ROLE_BADGE } from "../features/admin/constants";
import { formatDate } from "../lib/format";
import Avatar from "../components/Avatar";

export default function AdminDashboardPage() {
	const { user } = useAuth();
	const { users, isLoading, error } = useUsers();

	const stats = useMemo(() => {
		const admins = users.filter((u) => u.role === "admin").length;
		return {
			total: users.length,
			admins,
		};
	}, [users]);

	const recentUsers = useMemo(
		() =>
			[...users]
				.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
				.slice(0, 5),
		[users],
	);

	return (
		<div className="flex flex-col gap-4">
			<div>
				<h1 className="text-xl font-bold">Welcome back{user ? `, ${user.username}` : ""}</h1>
				<p className="text-sm text-base-content/60">
					Here&apos;s what&apos;s happening across the platform.
				</p>
			</div>

			{error && (
				<div className="alert alert-error">
					<span>{error}</span>
				</div>
			)}

			{isLoading ? (
				<div className="flex justify-center py-16">
					<span className="loading loading-spinner loading-md" />
				</div>
			) : (
				<>
					<div className="stats stats-vertical border border-base-content/10 bg-base-100 shadow-sm sm:stats-horizontal">
						<div className="stat">
							<div className="stat-figure text-primary">
								<Users2 className="size-8" />
							</div>
							<div className="stat-title">Total users</div>
							<div className="stat-value">{stats.total}</div>
						</div>

						<div className="stat">
							<div className="stat-figure text-secondary">
								<ShieldCheck className="size-8" />
							</div>
							<div className="stat-title">Admins</div>
							<div className="stat-value text-secondary">{stats.admins}</div>
						</div>
					</div>

					<div className="rounded-box border border-base-content/10 bg-base-100">
						<div className="flex items-center justify-between p-4 pb-0">
							<h2 className="font-semibold">Recently joined</h2>
						</div>

						{recentUsers.length === 0 ? (
							<p className="p-4 text-sm text-base-content/60">No users yet.</p>
						) : (
							<ul>
								{recentUsers.map((u) => (
									<li
										key={u.id}
										className="flex items-center gap-3 border-t border-base-content/10 p-4 first:border-t-0"
									>
										<Avatar username={u.username} avatarUrl={u.avatarUrl} size="md" />
										<div className="min-w-0 flex-1">
											<div className="truncate font-medium">{u.username}</div>
											<div className="truncate text-sm text-base-content/60">{u.email}</div>
										</div>
										<span className={`badge badge-sm ${ROLE_BADGE[u.role]}`}>{u.role}</span>
										<span className="hidden text-sm text-base-content/60 sm:inline">
											{formatDate(u.createdAt)}
										</span>
									</li>
								))}
							</ul>
						)}
					</div>
				</>
			)}
		</div>
	);
}
