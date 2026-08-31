import { ArrowRight } from "lucide-react";
import { useState } from "react";
import type { ChangeEvent, SubmitEvent } from "react";
import { useLocation, useNavigate, type Location } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { flattenError } from "zod";
import { loginSchema, type LoginFormValues } from "../schemas";
import { useAuth } from "../hooks/useAuth";
import { translateFieldError } from "../../../i18n/validation";
import { defaultPathForRole } from "../../../Router";

type FieldErrors = Partial<Record<keyof LoginFormValues, string>>;

export default function LoginForm() {
	const { t } = useTranslation();
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
			setFormError(error instanceof Error ? error.message : t("auth.loginFailed"));
		}
	}

	return (
		<form className="fieldset w-full" onSubmit={handleSubmit} noValidate>
			<fieldset className="fieldset">
				<label className="label" htmlFor="login-email">
					{t("auth.email")}
				</label>
				<input
					id="login-email"
					type="email"
					name="email"
					className="input validator w-full"
					placeholder={t("auth.emailPlaceholder")}
					value={values.email}
					onChange={handleChange}
					aria-invalid={errors.email ? "true" : undefined}
				/>
				<p className={`validator-hint ${errors.email ? "" : "hidden"}`}>
					{translateFieldError(t, errors.email)}
				</p>
			</fieldset>

			<fieldset className="fieldset">
				<div className="flex justify-between">
					<label className="label" htmlFor="login-password">
						{t("auth.password")}
					</label>
					<button type="button" className="text-primary font-semibold hover:underline">
						{t("auth.forgot")}
					</button>
				</div>
				<input
					id="login-password"
					type="password"
					name="password"
					className="input validator w-full"
					placeholder={t("auth.passwordPlaceholder")}
					value={values.password}
					onChange={handleChange}
					aria-invalid={errors.password ? "true" : undefined}
				/>
				<span className={`validator-hint ${errors.password ? "" : "hidden"}`}>
					{translateFieldError(t, errors.password)}
				</span>
			</fieldset>

			{formError && <p className="text-error text-sm mt-2">{formError}</p>}

			<button className="btn btn-primary mt-4" type="submit" disabled={isLoading}>
				{isLoading ? t("auth.loggingIn") : t("auth.logIn")}
				<ArrowRight size={14} className="my-auto" />
			</button>
		</form>
	);
}
