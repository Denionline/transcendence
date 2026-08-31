import { ArrowRight, Pencil, Search } from "lucide-react";
import { useState } from "react";
import type { ChangeEvent, SubmitEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { flattenError } from "zod";
import { registerSchema, type RegisterFormValues } from "../schemas";
import { useAuth } from "../hooks/useAuth";
import { defaultPathForRole } from "../../../Router";
import PasswordStrengthChecklist from "./PasswordStrengthChecklist";
import { translateFieldError } from "../../../i18n/validation";

type FieldErrors = Partial<Record<keyof RegisterFormValues, string>>;

export default function RegisterForm() {
	const { t } = useTranslation();
	const { register, isLoading } = useAuth();
	const navigate = useNavigate();
	const [values, setValues] = useState<RegisterFormValues>({
		name: "",
		email: "",
		password: "",
		role: "artist",
	});
	const [errors, setErrors] = useState<FieldErrors>({});
	const [formError, setFormError] = useState<string | null>(null);

	function handleChange(e: ChangeEvent<HTMLInputElement>) {
		const { name, value } = e.target;
		setValues((prev) => ({ ...prev, [name]: value }));
	}

	function handleRoleChange(role: RegisterFormValues["role"]) {
		setValues((prev) => ({ ...prev, role }));
	}

	async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
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
		setFormError(null);
		try {
			const user = await register(result.data);
			navigate(defaultPathForRole(user.role), { replace: true });
		} catch (error) {
			setFormError(error instanceof Error ? error.message : t("auth.registerFailed"));
		}
	}

	return (
		<form className="fieldset w-full" onSubmit={handleSubmit} noValidate>
			<fieldset className="fieldset">
				<label className="label" htmlFor="register-name">
					{t("auth.name")}
				</label>
				<input
					id="register-name"
					type="text"
					name="name"
					className="input validator w-full"
					placeholder={t("auth.namePlaceholder")}
					value={values.name}
					onChange={handleChange}
					aria-invalid={errors.name ? "true" : undefined}
				/>
				<p className={`validator-hint ${errors.name ? "" : "hidden"}`}>
					{translateFieldError(t, errors.name)}
				</p>
			</fieldset>

			<fieldset className="fieldset">
				<label className="label" htmlFor="register-email">
					{t("auth.email")}
				</label>
				<input
					id="register-email"
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
				<label className="label" htmlFor="register-password">
					{t("auth.password")}
				</label>
				<input
					id="register-password"
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
				<PasswordStrengthChecklist
					password={values.password}
					name={values.name}
					email={values.email}
				/>
			</fieldset>

			<fieldset className="fieldset">
				<label className="label">{t("auth.signingUpAs")}</label>
				<div className="flex w-full gap-3">
					<button
						type="button"
						className={`btn flex-1 rounded-full border-none ${
							values.role === "artist" ? "btn-primary" : "bg-base-200 text-base-content/50"
						}`}
						onClick={() => handleRoleChange("artist")}
						aria-pressed={values.role === "artist"}
					>
						<Pencil size={14} />
						{t("auth.artist")}
					</button>
					<button
						type="button"
						className={`btn flex-1 rounded-full border-none ${
							values.role === "hirer" ? "btn-primary" : "bg-base-200 text-base-content/50"
						}`}
						onClick={() => handleRoleChange("hirer")}
						aria-pressed={values.role === "hirer"}
					>
						<Search size={14} />
						{t("auth.hirer")}
					</button>
				</div>
			</fieldset>

			{formError && <p className="text-error text-sm mt-2">{formError}</p>}

			<button className="btn btn-primary mt-4" type="submit" disabled={isLoading}>
				{isLoading
					? t("auth.creatingAccount")
					: values.role === "artist"
						? t("auth.createAccountAsArtist")
						: t("auth.createAccountAsHirer")}
				<ArrowRight size={14} className="my-auto" />
			</button>
			{/* <Trans> keeps the sentence whole in the locale file and slots the
			    links into the <terms>/<privacy> placeholders, so each language can
			    put them wherever its own grammar needs them. */}
			<span className="text-center opacity-80">
				<Trans
					i18nKey="auth.agreeToTerms"
					components={{
						terms: <Link to="/terms" className="underline" />,
						privacy: <Link to="/privacy" className="underline" />,
					}}
				/>
			</span>
		</form>
	);
}
