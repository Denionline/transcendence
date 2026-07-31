import { ArrowRight } from "lucide-react";
import { useState } from "react";
import type { ChangeEvent, SubmitEvent } from "react";
import { useLocation, useNavigate, type Location } from "react-router-dom";
import { flattenError } from "zod";
import { loginSchema, type LoginFormValues } from "../schemas";
import { useAuth } from "../hooks/useAuth";
import { defaultPathForRole } from "../../../Router";

type FieldErrors = Partial<Record<keyof LoginFormValues, string>>;

export default function LoginForm() {
	const { login, isLoading } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [values, setValues] = useState<LoginFormValues>({ email: "", password: "" });
	const [errors, setErrors] = useState<FieldErrors>({});
	const [formError, setFormError] = useState<string | null>(null);

	function handleChange(e: ChangeEvent<HTMLInputElement>) {
		const { name, value } = e.target;
		setValues((prev) => ({ ...prev, [name]: value }));
	}

	async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
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
		setFormError(null);
		try {
			const user = await login(result.data);
			const from = (location.state as { from?: Location } | null)?.from;
			const to = from
				? `${from.pathname}${from.search}${from.hash}`
				: defaultPathForRole(user.role);
			navigate(to, { replace: true });
		} catch (error) {
			setFormError(error instanceof Error ? error.message : "Failed to log in");
		}
	}

	return (
		<form className="fieldset w-full" onSubmit={handleSubmit} noValidate>
			<fieldset className="fieldset">
				<label className="label" htmlFor="login-email">
					Email
				</label>
				<input
					id="login-email"
					type="email"
					name="email"
					className="input validator w-full"
					placeholder="you@email.com"
					value={values.email}
					onChange={handleChange}
					aria-invalid={errors.email ? "true" : "false"}
				/>
				<p className={`validator-hint ${errors.email ? "" : "hidden"}`}>{errors.email}</p>
			</fieldset>

			<fieldset className="fieldset">
				<div className="flex justify-between">
					<label className="label" htmlFor="login-password">
						Password
					</label>
					<button type="button" className="text-primary font-semibold hover:underline">
						Forgot?
					</button>
				</div>
				<input
					id="login-password"
					type="password"
					name="password"
					className="input validator w-full"
					placeholder="••••••••"
					value={values.password}
					onChange={handleChange}
					aria-invalid={errors.password ? "true" : "false"}
				/>
				<span className={`validator-hint ${errors.password ? "" : "hidden"}`}>
					{errors.password}
				</span>
			</fieldset>

			{formError && <p className="text-error text-sm mt-2">{formError}</p>}

			<button className="btn btn-primary mt-4" type="submit" disabled={isLoading}>
				{isLoading ? "Logging in…" : "Log in"}
				<ArrowRight size={14} className="my-auto" />
			</button>
		</form>
	);
}
