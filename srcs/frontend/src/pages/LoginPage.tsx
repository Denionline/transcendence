import { ArrowRight, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";

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
			<form className="fieldset w-full">
				<fieldset className="fieldset">
					<label className="label">Email</label>
					<input
						type="email"
						className="input validator w-full"
						placeholder="you@email.com"
						required
					/>
					<p className="validator-hint hidden">Required</p>
				</fieldset>

				<label className="fieldset">
					<div className="flex justify-between">
						<span className="label">Password</span>
						<a className="text-primary font-semibold hover:underline">Forgot?</a>
					</div>
					<input
						type="password"
						className="input validator w-full"
						placeholder="••••••••"
						required
					/>
					<span className="validator-hint hidden">Required</span>
				</label>

				<button className="btn btn-primary mt-4" type="submit">
					Log in
					<ArrowRight size={14} className="my-auto" />
				</button>
			</form>
			<div className="text-sm text-center mt-8">
				<span>New to Artmate? </span>
				<Link to="/register" className="text-primary hover:underline">
					Create account
				</Link>
			</div>
		</>
	);
}
