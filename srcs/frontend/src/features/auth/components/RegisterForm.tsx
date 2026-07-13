import { ArrowRight } from "lucide-react";
import { useState } from "react";
import type { ChangeEvent, SubmitEvent } from "react";
import { flattenError } from "zod";
import { registerSchema, type RegisterFormValues } from "../schemas";

type FieldErrors = Partial<Record<keyof RegisterFormValues, string>>;

export default function RegisterForm() {
	const [values, setValues] = useState<RegisterFormValues>({ name: "", email: "", password: "" });
	const [errors, setErrors] = useState<FieldErrors>({});

	function handleChange(e: ChangeEvent<HTMLInputElement>) {
		const { name, value } = e.target;
		setValues((prev) => ({ ...prev, [name]: value }));
	}

	function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
		e.preventDefault();

		const result = registerSchema.safeParse(values);
		if (!result.success) {
			const fieldErrors = flattenError(result.error).fieldErrors;
			setErrors({
				name: fieldErrors.name?.[0],
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
				<label className="label">Name</label>
				<input
					type="text"
					name="name"
					className="input validator w-full"
					placeholder="Fulano de tal"
					value={values.name}
					onChange={handleChange}
				/>
				<p className={`validator-hint ${errors.name ? "" : "hidden"}`}>{errors.name}</p>
			</fieldset>

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
				<span className="label">Password</span>
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
