import { ArrowRight } from "lucide-react";
import { useState } from "react";
import type { ChangeEvent, SubmitEvent } from "react";
import { flattenError } from "zod";
import { loginSchema, type LoginFormValues } from "../schemas";

type FieldErrors = Partial<Record<keyof LoginFormValues, string>>;

export default function LoginForm() {
	const [values, setValues] = useState<LoginFormValues>({ email: "", password: "" });
	const [errors, setErrors] = useState<FieldErrors>({});

	function handleChange(e: ChangeEvent<HTMLInputElement>) {
		const { name, value } = e.target;
		setValues((prev) => ({ ...prev, [name]: value }));
	}

	function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
		e.preventDefault();

		const result = loginSchema.safeParse(values);
		if (!result.success) {
			const fieldErrors = flattenError(result.error).fieldErrors;
			setErrors({
				email: fieldErrors.email?.[0],
				password: fieldErrors.password?.[0],
			});
			return;
		}

		setErrors({});
		console.log(result.data);
	}

	return (
		<form className="fieldset w-full" onSubmit={handleSubmit} noValidate>
			<fieldset className="fieldset">
				<label className="label">Email</label>
				<input
					type="email"
					name="email"
					className="input validator w-full"
					placeholder="you@email.com"
					value={values.email}
					onChange={handleChange}
				/>
				<p className={`validator-hint ${errors.email ? "" : "hidden"}`}>{errors.email}</p>
			</fieldset>

			<label className="fieldset">
				<div className="flex justify-between">
					<span className="label">Password</span>
					<a className="text-primary font-semibold hover:underline">Forgot?</a>
				</div>
				<input
					type="password"
					name="password"
					className="input validator w-full"
					placeholder="••••••••"
					value={values.password}
					onChange={handleChange}
				/>
				<span className={`validator-hint ${errors.password ? "" : "hidden"}`}>
					{errors.password}
				</span>
			</label>

			<button className="btn btn-primary mt-4" type="submit">
				Log in
				<ArrowRight size={14} className="my-auto" />
			</button>
		</form>
	);
}
