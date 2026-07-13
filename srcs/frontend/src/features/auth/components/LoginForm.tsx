import { ArrowRight } from "lucide-react";
// Implement Zod
export default function LoginForm() {
	function handleSubmit(e: any) {
		e.preventDefault();
		console.log(e.target)
	}
	return (
		<form className="fieldset w-full" onSubmit={handleSubmit}>
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
				<input type="password" className="input validator w-full" placeholder="••••••••" required />
				<span className="validator-hint hidden">Required</span>
			</label>

			<button className="btn btn-primary mt-4" type="submit">
				Log in
				<ArrowRight size={14} className="my-auto" />
			</button>
		</form>
	);
}
