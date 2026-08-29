import { GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import RegisterForm from "../features/auth/components/RegisterForm";

export default function RegisterPage() {
	const { t } = useTranslation();

	return (
		<>
			<span className="text-xs font-['IBM_Plex_Mono',monospace] uppercase tracking-[0.08em] text-base-content/50">
				{t("auth.joinArtmate")}
			</span>
			<h1 className="text-3xl font-extrabold mt-1">{t("auth.createYourAccount")}</h1>
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
			<RegisterForm />
			<div className="text-sm text-center mt-8">
				<span>{t("auth.alreadyOnArtmate")} </span>
				<Link to="/login" className="text-primary hover:underline">
					{t("auth.logIn")}
				</Link>
			</div>
		</>
	);
}
