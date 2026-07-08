import { ArrowRight, GraduationCap } from "lucide-react";
import Logo from "../components/Logo";
import Welcome from "../components/Welcome";

export default function LoginPage() {
	return (
		<div className="grid grid-cols-2">
			<Welcome />
			<div className="flex flex-col justify-between items-center min-h-160 h-dvh pt-8 pb-8 pr-8 pl-8">
				<div className="h-full w-full">
					<Logo />
					<h1 className="text-3xl font-extrabold mt-8">Welcome back</h1>
					<p className="text-sm text-base-content opacity-80">
						Log in to pick up where you left off.
					</p>
					<button className="btn bg-neutral mt-5 h-13 w-full rounded-2xl">
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
								<a className="text-primary font-semibold">Forgot?</a>
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
				</div>
				<div className="text-sm">
					<span>New to Artmate? </span>
					<a className="text-primary">Create account</a>
				</div>
			</div>
		</div>
	);
}
