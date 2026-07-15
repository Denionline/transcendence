import { Outlet } from "react-router-dom";
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
				</div>
			</div>
		</div>
	);
}
