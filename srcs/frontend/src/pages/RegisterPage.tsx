import { ArrowRight, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";

export default function RegisterPage() {
	return (
		<>
			<span className="text-xs font-['IBM_Plex_Mono',monospace] uppercase tracking-[0.08em] text-base-content/50">
				Join Artmate
			</span>
			<h1 className="text-3xl font-extrabold mt-1">Create your account</h1>
			<button className="btn bg-neutral mt-6 h-13 w-full rounded-2xl">
				<GraduationCap />
				Continue with 42
			</button>
			<div className="divider text-xs opacity-80">OR</div>
			<form className="fieldset w-full">
				<fieldset className="fieldset">
					<label className="label">Name</label>
					<input
						type="text"
						className="input validator w-full"
						placeholder="Fulano de tal"
						required
					/>
					<p className="validator-hint hidden">Required</p>
				</fieldset>

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
					<span className="label">Password</span>
					<input
						type="password"
						className="input validator w-full"
						placeholder="••••••••"
						required
					/>
					<span className="validator-hint hidden">Required</span>
				</label>

				<button className="btn btn-primary mt-4" type="submit">
					Create account
					<ArrowRight size={14} className="my-auto" />
				</button>
				<span className="text-center opacity-80">
					By continuing you agree to our{" "}
					<a href="" className="underline">
						Terms
					</a>{" "}
					&{" "}
					<a href="" className="underline">
						Privacy Policy
					</a>
					.
				</span>
			</form>
			<div className="text-sm text-center mt-8">
				<span>Already on Artmate? </span>
				<Link to="/login" className="text-primary hover:underline">
					Log in
				</Link>
			</div>
		</>
	);
}
