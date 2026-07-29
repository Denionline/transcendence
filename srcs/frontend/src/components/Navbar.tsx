import { PlusIcon, SearchIcon } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import { useAuth } from "../features/auth/hooks/useAuth";
import { initials } from "../lib/format";

export interface NavbarItem {
	to: string;
	label: string;
	end?: boolean;
}

export interface NavbarAction {
	to: string;
	label: string;
}

interface NavbarProps {
	items: NavbarItem[];
	searchPlaceholder: string;
	action?: NavbarAction;
}

export default function Navbar({ items, searchPlaceholder, action }: NavbarProps) {
	const navigate = useNavigate();
	const { user, logout } = useAuth();

	async function handleLogout() {
		await logout();
		navigate("/login");
	}

	return (
		<nav className="navbar sticky top-0 z-30 gap-4 border-b border-base-content/10 bg-base-100 px-4 sm:px-6">
			<div className="flex-none">
				<Logo />
			</div>

			<div className="hidden flex-1 justify-center md:flex">
				<label className="input w-full max-w-md rounded-full">
					<SearchIcon className="size-4 opacity-50" />
					<input type="search" placeholder={searchPlaceholder} />
				</label>
			</div>

			<div className="flex flex-1 items-center justify-end gap-6 md:flex-none">
				<ul className="hidden items-center gap-6 text-sm font-medium sm:flex">
					{items.map(({ to, label, end }) => (
						<li key={to}>
							<NavLink
								to={to}
								end={end}
								className={({ isActive }) =>
									`border-b-2 pb-1 transition-colors ${
										isActive
											? "border-primary text-primary"
											: "border-transparent text-base-content/60 hover:text-base-content"
									}`
								}
							>
								{label}
							</NavLink>
						</li>
					))}
				</ul>

				{action && (
					<Link to={action.to} className="btn btn-primary btn-sm rounded-full">
						<PlusIcon className="size-4" />
						{action.label}
					</Link>
				)}

				{user && (
					<div className="dropdown dropdown-end">
						<div tabIndex={0} role="button" className="avatar avatar-placeholder">
							<div className="w-10 rounded-full bg-neutral text-neutral-content cursor-pointer">
								<span className="text-xs">{initials(user.username)}</span>
							</div>
						</div>
						<ul
							tabIndex={0}
							className="menu dropdown-content menu-sm z-1 mt-3 w-44 rounded-box bg-base-100 p-2 shadow"
						>
							<li className="menu-title truncate">{user.username}</li>
							<li>
								<button type="button" onClick={handleLogout} className="text-error">
									Logout
								</button>
							</li>
						</ul>
					</div>
				)}
			</div>
		</nav>
	);
}
