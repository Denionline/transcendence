import { GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import RegisterForm from "../features/auth/components/RegisterForm";

export default function RegisterPage() {
	return (
		<>
			<span className="text-xs font-['IBM_Plex_Mono',monospace] uppercase tracking-[0.08em] text-base-content/50">
				Join Artmate
			</span>
			<h1 className="text-3xl font-extrabold mt-1">Create your account</h1>
			<button
				className="btn bg-neutral mt-6 h-13 w-full rounded-2xl"
				onClick={() => {
					window.location.href = "/api/auth/42";
				}}
			>
				<GraduationCap />
				Continue with 42
			</button>
			<div className="divider text-xs opacity-80">OR</div>
			<RegisterForm />
			<div className="text-sm text-center mt-8">
				<span>Already on Artmate? </span>
				<Link to="/login" className="text-primary hover:underline">
					Log in
				</Link>
			</div>
		</>
	);
}
