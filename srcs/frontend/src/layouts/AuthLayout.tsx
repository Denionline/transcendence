import { Link, Outlet } from "react-router-dom";
import Logo from "../components/Logo";
import LanguageSwitcher from "../components/LanguageSwitcher";
import Welcome from "../components/Welcome";
import { useTranslation } from "react-i18next";

export default function AuthLayout() {
	const { t } = useTranslation();
	return (
		<div className="grid grid-cols-1 md:grid-cols-2">
			<Welcome />
			<div className="flex flex-col justify-center items-center min-h-160 h-dvh px-8">
				<div className="w-full max-w-sm">
					<div className="md:hidden mb-8">
						<Logo />
					</div>
					<Outlet />
					{/* Signed-out visitors live here, so the legal pages have to be
					    reachable from the auth screens too — kept understated so they
					    don't compete with the form. */}
					{/* Language has to be reachable before signing in — the Settings
					    page that normally hosts it is behind auth. */}
					<div className="mt-8 flex justify-center">
						<LanguageSwitcher />
					</div>

					<nav
						aria-label={t("a11y.legal")}
						className="mt-3 flex justify-center gap-4 text-xs text-base-content/50"
					>
						<Link to="/privacy" className="transition-colors hover:text-base-content">
							{t("legal.privacyPolicy")}
						</Link>
						<Link to="/terms" className="transition-colors hover:text-base-content">
							{t("legal.termsOfService")}
						</Link>
					</nav>
				</div>
			</div>
		</div>
	);
}
