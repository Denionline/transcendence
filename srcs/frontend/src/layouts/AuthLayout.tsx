import { Link, Outlet } from "react-router-dom";
import Logo from "../components/Logo";
import Welcome from "../components/Welcome";

export default function AuthLayout() {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2">
			<Welcome />
			<div className="flex flex-col justify-center items-center min-h-160 h-dvh px-8">
				<div className="w-full max-w-sm">
					<div className="md:hidden mb-8">
						<Logo />
					</div>
					<Outlet />
					<nav
						aria-label="Legal"
						className="mt-8 flex justify-center gap-4 text-xs text-base-content/50"
					>
						<Link to="/privacy" className="transition-colors hover:text-base-content">
							Privacy Policy
						</Link>
						<Link to="/terms" className="transition-colors hover:text-base-content">
							Terms of Service
						</Link>
					</nav>
				</div>
			</div>
		</div>
	);
}
