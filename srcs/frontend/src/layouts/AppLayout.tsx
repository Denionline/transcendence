import { Outlet } from "react-router-dom";
import Navbar, { type NavbarItem } from "../components/Navbar";
import { useAuth } from "../features/auth/hooks/useAuth";
import ProfileOnboardingGate from "../features/onboarding/ProfileOnboardingGate";
import LegalFooter from "../components/LegalFooter";

const HIRER_ITEMS: NavbarItem[] = [
	{ to: "/discover", label: "Discover", end: true },
	{ to: "/opportunities/mine", label: "My opportunities" },
	{ to: "/matches", label: "Matches" },
	{ to: "/friends", label: "Friends" },
];

const ARTIST_ITEMS: NavbarItem[] = [
	{ to: "/opportunities", label: "Opportunities", end: true },
	{ to: "/matches", label: "Matches" },
	{ to: "/friends", label: "Friends" },
];

export default function AppLayout() {
	const { user } = useAuth();
	const isHirer = user?.role === "hirer";

	return (
		<div className="flex min-h-screen flex-col bg-base-100">
			<ProfileOnboardingGate />
			<Navbar
				items={isHirer ? HIRER_ITEMS : ARTIST_ITEMS}
				searchPlaceholder={
					isHirer ? "Search artists, skills, cities..." : "Search briefs, brands, cities..."
				}
				action={isHirer ? { to: "/opportunities/new", label: "Post opportunity" } : undefined}
			/>
			<main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
				<Outlet />
			</main>
			<LegalFooter />
		</div>
	);
}
