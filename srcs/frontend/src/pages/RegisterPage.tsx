import { ArrowRight, GraduationCap } from "lucide-react";
import Logo from "../components/Logo";

export default function RegisterPage() {
	return (
		<div className="min-h-172 h-dvh pt-8 pb-8 pr-8 pl-8 flex flex-col justify-between items-center">
			<div className="h-full w-full">
				<Logo />
				<h1 className="text-3xl font-extrabold mt-8">Create your account</h1>
				<p className="text-sm text-base-content opacity-80">Join the home for creative work.</p>
				<button className="btn bg-neutral mt-5 h-13 w-full rounded-2xl">
					<GraduationCap />
					Continue with 42
				</button>
				<div className="divider text-xs opacity-80">OR</div>
				<form className="fieldset w-full">
					<fieldset className="fieldset">
						<label className="label">Name</label>
						<input
							type="email"
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
			</div>
			<div className="text-sm">
				<span>Already on Artmate? </span>
				<a className="text-primary">Log in</a>
			</div>
		</div>
	);
}
