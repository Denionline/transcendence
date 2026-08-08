import { useEffect, useState } from "react";
import { LogOutIcon, MenuIcon, PlusIcon, SearchIcon, SettingsIcon, XIcon } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import Avatar from "./Avatar";
import { useAuth } from "../features/auth/hooks/useAuth";

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
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	useEffect(() => {
		if (!isMenuOpen) return;
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") setIsMenuOpen(false);
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isMenuOpen]);

	async function handleLogout() {
		setIsMenuOpen(false);
		await logout();
		navigate("/login");
	}

	return (
		<header className="sticky top-0 z-30 border-b border-base-content/10 bg-base-100">
			<nav className="navbar gap-2 px-4 sm:gap-4 sm:px-6">
				<div className="flex flex-none items-center gap-1">
					<button
						type="button"
						className="btn btn-ghost btn-circle lg:hidden"
						aria-label={isMenuOpen ? "Close menu" : "Open menu"}
						aria-expanded={isMenuOpen}
						aria-controls="navbar-mobile-menu"
						onClick={() => setIsMenuOpen((open) => !open)}
					>
						{isMenuOpen ? (
							<XIcon className="size-5" aria-hidden="true" />
						) : (
							<MenuIcon className="size-5" aria-hidden="true" />
						)}
					</button>

					<Link to="/" aria-label="Go to homepage" onClick={() => setIsMenuOpen(false)}>
						<Logo />
					</Link>
				</div>

				<div className="hidden flex-1 justify-center lg:flex">
					<label className="input w-full max-w-md rounded-full">
						<SearchIcon className="size-4 opacity-50" aria-hidden="true" />
						<input type="search" placeholder={searchPlaceholder} aria-label={searchPlaceholder} />
					</label>
				</div>

				<div className="flex flex-1 items-center justify-end gap-3 sm:gap-6 lg:flex-none">
					<ul className="hidden items-center gap-6 text-sm font-medium lg:flex">
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
							<PlusIcon className="size-4" aria-hidden="true" />
							<span className="hidden sm:inline">{action.label}</span>
						</Link>
					)}

					{user && (
						<div className="dropdown dropdown-end">
							<div tabIndex={0} role="button" aria-label="Account menu" className="cursor-pointer">
								<Avatar username={user.username} avatarUrl={user.avatarUrl} size="sm" />
							</div>
							<ul
								tabIndex={0}
								className="menu dropdown-content menu-sm z-1 mt-3 w-44 rounded-box bg-base-100 p-2 shadow"
							>
								<li className="menu-title truncate">{user.username}</li>
								<li>
									<Link to="/settings">
										<SettingsIcon className="size-4" aria-hidden="true" />
										Settings
									</Link>
								</li>
								<li>
									<button type="button" onClick={handleLogout} className="text-error">
										<LogOutIcon className="size-4" aria-hidden="true" />
										Logout
									</button>
								</li>
							</ul>
						</div>
					)}
				</div>
			</nav>

			{isMenuOpen && (
				<div
					id="navbar-mobile-menu"
					className="border-t border-base-content/10 px-4 py-4 lg:hidden"
				>
					<label className="input mb-4 w-full rounded-full">
						<SearchIcon className="size-4 opacity-50" aria-hidden="true" />
						<input type="search" placeholder={searchPlaceholder} aria-label={searchPlaceholder} />
					</label>

					<ul className="flex flex-col gap-1 text-sm font-medium">
						{items.map(({ to, label, end }) => (
							<li key={to}>
								<NavLink
									to={to}
									end={end}
									onClick={() => setIsMenuOpen(false)}
									className={({ isActive }) =>
										`block rounded-box px-3 py-2 transition-colors ${
											isActive
												? "bg-primary/10 text-primary"
												: "text-base-content/70 hover:bg-base-200"
										}`
									}
								>
									{label}
								</NavLink>
							</li>
						))}
					</ul>
				</div>
			)}
		</header>
	);
}
