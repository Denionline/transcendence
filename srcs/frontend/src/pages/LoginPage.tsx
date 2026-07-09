import { GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import LoginForm from "../features/auth/components/LoginForm";

export default function LoginPage() {
	return (
		<>
			<span className="text-xs font-['IBM_Plex_Mono',monospace] uppercase tracking-[0.08em] text-base-content/50">
				Welcome back
			</span>
			<h1 className="text-3xl font-extrabold mt-1">Log in to Artmate</h1>
			<button className="btn bg-neutral mt-6 h-13 w-full rounded-2xl">
				<GraduationCap />
				Continue with 42
			</button>
			<div className="divider text-xs opacity-80">OR</div>
			<LoginForm />
			<div className="text-sm text-center mt-8">
				<span>New to Artmate? </span>
				<Link to="/register" className="text-primary hover:underline">
					Create account
				</Link>
			</div>
		</>
	);
}
