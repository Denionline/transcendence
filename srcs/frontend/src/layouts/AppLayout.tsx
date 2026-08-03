import { LogOutIcon, UserRoundIcon } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/hooks/useAuth";
import Avatar from "../components/Avatar";

export default function AppLayout() {
	const { user, logout } = useAuth();
	const navigate = useNavigate();

	async function handleLogout() {
		await logout();
		navigate("/login");
	}

	return (
		<div className="flex min-h-screen flex-col">
			<nav className="navbar w-full border-b border-base-content/10 bg-base-100">
				<div className="flex-1 px-4 font-semibold">Artmate</div>
				{user && (
					<div className="flex items-center gap-2 px-4">
						<NavLink to="/discover" className="btn btn-ghost btn-sm">
							Discover
						</NavLink>
						<NavLink to="/profile" className="btn btn-ghost btn-sm">
							<UserRoundIcon className="size-4" />
							Profile
						</NavLink>
						<Avatar username={user.username} avatarUrl={user.avatarUrl} size="sm" />
						<button
							type="button"
							className="btn btn-ghost btn-sm text-error"
							onClick={handleLogout}
						>
							<LogOutIcon className="size-4" />
							Logout
						</button>
					</div>
				)}
			</nav>
			<div className="flex-1 p-4">
				<Outlet />
			</div>
		</div>
	);
}
