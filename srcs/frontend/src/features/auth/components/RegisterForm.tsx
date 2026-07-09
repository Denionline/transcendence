import { ArrowRight } from "lucide-react";

export default function RegisterForm() {
	return (
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
				<input type="password" className="input validator w-full" placeholder="••••••••" required />
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
	);
}
