import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import type { ChangeEvent, SubmitEvent } from "react";
import { useLocation, useNavigate, type Location } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { flattenError } from "zod";
import { loginSchema, type LoginFormValues } from "../schemas";
import { useAuth } from "../hooks/useAuth";
import { translateFieldError } from "../../../i18n/validation";
import { defaultPathForRole } from "../../../Router";

type FieldErrors = Partial<Record<keyof LoginFormValues, string>>;

//	If the server rate-limits login but sends no Retry-After we can read, hold
//	the button for this long rather than leaving it enabled to be hammered.
const RATE_LIMIT_FALLBACK_SECONDS = 60;
//	Survives a page reload so a refresh does not re-enable the button while the
//	server would still answer 429.
const COOLDOWN_STORAGE_KEY = "login_cooldown_until";

function readStoredCooldown(): number {
	try {
		const until = Number(sessionStorage.getItem(COOLDOWN_STORAGE_KEY));
		return Number.isFinite(until) && until > Date.now() ? until : 0;
	} catch {
		return 0;
	}
}

function formatCooldown(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const rest = seconds % 60;
	return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`;
}

export default function LoginForm() {
	const { t } = useTranslation();
	const { login, isLoading } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [values, setValues] = useState<LoginFormValues>({ email: "", password: "" });
	const [errors, setErrors] = useState<FieldErrors>({});
	const [formError, setFormError] = useState<string | null>(null);
	const [cooldownUntil, setCooldownUntil] = useState<number>(readStoredCooldown);
	const [now, setNow] = useState<number>(() => Date.now());

	const cooldownSeconds = cooldownUntil > now ? Math.ceil((cooldownUntil - now) / 1000) : 0;
	const isCoolingDown = cooldownSeconds > 0;

	//	Tick once a second while the cooldown runs so the countdown updates and
	//	the button re-enables the moment it reaches zero.
	useEffect(() => {
		if (!isCoolingDown) return;
		const id = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(id);
	}, [isCoolingDown]);

	useEffect(() => {
		try {
			if (cooldownUntil > Date.now())
				sessionStorage.setItem(COOLDOWN_STORAGE_KEY, String(cooldownUntil));
			else sessionStorage.removeItem(COOLDOWN_STORAGE_KEY);
		} catch {
			//	sessionStorage unavailable (private mode, storage disabled) — the
			//	cooldown still works for this page view, it just won't survive a reload.
		}
	}, [cooldownUntil]);

	function handleChange(e: ChangeEvent<HTMLInputElement>) {
		const { name, value } = e.target;
		setValues((prev) => ({ ...prev, [name]: value }));
	}

	async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
		e.preventDefault();
		if (isCoolingDown) return;

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
			const { status, code, retryAfter } = (error ?? {}) as {
				status?: number;
				code?: string;
				retryAfter?: number;
			};
			if (status === 429 || code === "TOO_MANY_REQUESTS") {
				const seconds = retryAfter && retryAfter > 0 ? retryAfter : RATE_LIMIT_FALLBACK_SECONDS;
				setCooldownUntil(Date.now() + seconds * 1000);
				setNow(Date.now());
				setFormError(null);
				return;
			}
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

			{isCoolingDown ? (
				<p className="text-error text-sm mt-2" role="alert">
					{t("auth.tooManyAttempts", { time: formatCooldown(cooldownSeconds) })}
				</p>
			) : (
				formError && <p className="text-error text-sm mt-2">{formError}</p>
			)}

			<button className="btn btn-primary mt-4" type="submit" disabled={isLoading || isCoolingDown}>
				{isCoolingDown
					? t("auth.tryAgainIn", { time: formatCooldown(cooldownSeconds) })
					: isLoading
						? t("auth.loggingIn")
						: t("auth.logIn")}
				{!isCoolingDown && <ArrowRight size={14} className="my-auto" />}
			</button>
		</form>
	);
}
