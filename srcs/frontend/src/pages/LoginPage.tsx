import { GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LoginForm from "../features/auth/components/LoginForm";
import { useAuth } from "../features/auth/hooks/useAuth";

export default function LoginPage() {
	const { t } = useTranslation();
	const { sessionExpired } = useAuth();

	return (
		<>
			<span className="text-xs font-['IBM_Plex_Mono',monospace] uppercase tracking-[0.08em] text-base-content/50">
				{t("auth.welcomeBack")}
			</span>
			<h1 className="text-3xl font-extrabold mt-1">{t("auth.logInToArtmate")}</h1>
			{sessionExpired && (
				<div className="alert alert-warning mt-4 py-2 text-sm">
					<span>{t("auth.sessionExpired")}</span>
				</div>
			)}
			<button
				className="btn bg-neutral mt-6 h-13 w-full rounded-2xl"
				onClick={() => {
					window.location.href = "/api/auth/42";
				}}
			>
				<GraduationCap />
				{t("auth.continueWith42")}
			</button>
			<div className="divider text-xs opacity-80">{t("auth.or")}</div>
			<LoginForm />
			<div className="text-sm text-center mt-8">
				<span>{t("auth.newToArtmate")} </span>
				<Link to="/register" className="text-primary hover:underline">
					{t("auth.createAccount")}
				</Link>
			</div>
		</>
	);
}
