import { Outlet } from "react-router-dom";
import Navbar, { type NavbarItem } from "../components/Navbar";
import { useAuth } from "../features/auth/hooks/useAuth";
import ArtistOnboardingGate from "../features/onboarding/ArtistOnboardingGate";

const HIRER_ITEMS: NavbarItem[] = [
	{ to: "/discover", label: "Discover", end: true },
	{ to: "/opportunities/mine", label: "My opportunities" },
	{ to: "/matches", label: "Matches" },
	{ to: "/messages", label: "Messages" },
];

const ARTIST_ITEMS: NavbarItem[] = [
	{ to: "/opportunities", label: "Opportunities", end: true },
	{ to: "/saved", label: "Saved" },
	{ to: "/messages", label: "Messages" },
];

export default function AppLayout() {
	const { user } = useAuth();
	const isHirer = user?.role === "hirer";

	return (
		<div className="min-h-screen bg-base-100">
			<ArtistOnboardingGate />
			<Navbar
				items={isHirer ? HIRER_ITEMS : ARTIST_ITEMS}
				searchPlaceholder={
					isHirer ? "Search artists, skills, cities..." : "Search briefs, brands, cities..."
				}
				action={isHirer ? { to: "/opportunities/new", label: "Post opportunity" } : undefined}
			/>
			<main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
				<Outlet />
			</main>
		</div>
	);
}
