import { HomeIcon, SidebarIcon, UsersIcon } from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";

export default function AdminLayout() {
	const navigate = useNavigate();

	return (
		<div className="drawer lg:drawer-open">
			<input id="my-drawer-4" type="checkbox" className="drawer-toggle" />
			<div className="drawer-content">
				{/* Navbar */}
				<nav className="navbar w-full bg-base-300">
					<label
						htmlFor="my-drawer-4"
						aria-label="open sidebar"
						className="btn btn-square btn-ghost"
					>
						{/* Sidebar toggle icon */}
						<SidebarIcon />
					</label>
					<div className="px-4">Administrator Management</div>
				</nav>
				{/* Page content here */}
				<div className="p-4">
					<Outlet />
				</div>
			</div>

			<div className="drawer-side is-drawer-close:overflow-visible">
				<label htmlFor="my-drawer-4" aria-label="close sidebar" className="drawer-overlay"></label>
				<div className="flex min-h-full flex-col items-start bg-base-200 is-drawer-close:w-14 is-drawer-open:w-64">
					{/* Sidebar content here */}
					<ul className="menu w-full grow">
						{/* List item */}
						<li>
							<button
								className="is-drawer-close:tooltip is-drawer-close:tooltip-right"
								data-tip="Dashboard"
								onClick={() => navigate("/admin")}
							>
								{/* Home icon */}
								<HomeIcon />
								<span className="is-drawer-close:hidden">Dashboard</span>
							</button>
						</li>

						{/* List item */}
						<li>
							<button
								className="is-drawer-close:tooltip is-drawer-close:tooltip-right"
								data-tip="Users"
								onClick={() => navigate("/admin/users")}
							>
								{/* Settings icon */}
								<UsersIcon />
								<span className="is-drawer-close:hidden">Users</span>
							</button>
						</li>
					</ul>
				</div>
			</div>
		</div>
	);
}
