import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar, { type NavbarItem } from "../components/Navbar";
import { useAuth } from "../features/auth/hooks/useAuth";
import ProfileOnboardingGate from "../features/onboarding/ProfileOnboardingGate";
import LegalFooter from "../components/LegalFooter";

export default function AppLayout() {
	const { user } = useAuth();
	const { t } = useTranslation();
	const isHirer = user?.role === "hirer";

	const hirerItems: NavbarItem[] = [
		{ to: "/discover", label: t("nav.discover"), end: true },
		{ to: "/opportunities/mine", label: t("nav.myOpportunities") },
		{ to: "/matches", label: t("nav.matches") },
		{ to: "/friends", label: t("nav.friends") },
	];

	const artistItems: NavbarItem[] = [
		{ to: "/opportunities", label: t("nav.opportunities"), end: true },
		{ to: "/matches", label: t("nav.matches") },
		{ to: "/friends", label: t("nav.friends") },
	];

	return (
		<div className="flex min-h-screen flex-col bg-base-100">
			<ProfileOnboardingGate />
			<Navbar
				items={isHirer ? hirerItems : artistItems}
				searchPlaceholder={isHirer ? t("nav.searchAsHirer") : t("nav.searchAsArtist")}
				action={isHirer ? { to: "/opportunities/new", label: t("nav.postOpportunity") } : undefined}
			/>
			{/* flex-1 pushes the footer to the bottom on short pages instead of
			    leaving it floating mid-screen. */}
			<main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
				<Outlet />
			</main>
			<LegalFooter />
		</div>
	);
}
