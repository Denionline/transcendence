import { HomeIcon, LogOutIcon, SettingsIcon, SidebarIcon, UsersIcon } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/hooks/useAuth";
import { initials } from "../lib/format";

const NAV_ITEMS = [
	{ to: "/admin", label: "Dashboard", icon: HomeIcon, end: true },
	{ to: "/admin/users", label: "Users", icon: UsersIcon, end: false },
	{ to: "/admin/settings", label: "Settings", icon: SettingsIcon, end: false },
];

export default function AdminLayout() {
	const navigate = useNavigate();
	const { user, logout } = useAuth();

	async function handleLogout() {
		await logout();
		navigate("/login");
	}

	return (
		<div className="drawer lg:drawer-open">
			<input id="my-drawer-4" type="checkbox" className="drawer-toggle" />
			<div className="drawer-content">
				{/* Navbar */}
				<nav className="navbar w-full border-b border-base-content/10 bg-base-100">
					<label
						htmlFor="my-drawer-4"
						aria-label="open sidebar"
						className="btn btn-square btn-ghost"
					>
						{/* Sidebar toggle icon */}
						<SidebarIcon />
					</label>
					<div className="px-4 font-semibold">Administrator Management</div>
				</nav>
				{/* Page content here */}
				<div className="p-4">
					<Outlet />
				</div>
			</div>

			<div className="drawer-side is-drawer-close:overflow-visible">
				<label htmlFor="my-drawer-4" aria-label="close sidebar" className="drawer-overlay"></label>
				<div className="flex min-h-full flex-col items-start border-r border-base-content/10 bg-base-200 is-drawer-close:w-16 is-drawer-open:w-64">
					{/* Brand */}

					<div className="w-full px-2">
						<div className="border-t border-base-content/10" />
					</div>

					{/* User card */}
					{user && (
						<>
							<div className="flex w-full items-center gap-3 p-4">
								<div className="avatar avatar-placeholder shrink-0">
									<div className="w-9 rounded-full bg-neutral text-neutral-content">
										<span className="text-xs">{initials(user.username)}</span>
									</div>
								</div>
								<div className="min-w-0 flex-1 is-drawer-close:hidden">
									<div className="truncate text-sm font-medium">{user.username}</div>
									<div className="truncate text-xs text-base-content/60">{user.email}</div>
								</div>
							</div>

							<div className="w-full px-2">
								<div className="border-t border-base-content/10" />
							</div>
						</>
					)}

					{/* Nav */}
					<ul className="menu w-full grow p-2">
						{NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
							<li key={to}>
								<NavLink
									to={to}
									end={end}
									className={({ isActive }) =>
										`is-drawer-close:tooltip is-drawer-close:tooltip-right ${isActive ? "menu-active" : ""}`
									}
									data-tip={label}
								>
									<Icon className="size-5" />
									<span className="is-drawer-close:hidden">{label}</span>
								</NavLink>
							</li>
						))}
					</ul>

					{/* Logout */}
					<div className="w-full p-2">
						<div className="mb-2 border-t border-base-content/10" />
						<button
							type="button"
							className="btn btn-ghost is-drawer-close:btn-square w-full justify-start gap-2 text-error hover:bg-error/10 is-drawer-close:tooltip is-drawer-close:tooltip-right"
							data-tip="Logout"
							onClick={handleLogout}
						>
							<LogOutIcon className="size-5" />
							<span className="is-drawer-close:hidden">Logout</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
