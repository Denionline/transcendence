import { useEffect, useState } from "react";
import { useAuth } from "../auth/hooks/useAuth";
import { fetchMyProfile, saveMyProfile, type ProfileUpdate } from "../profile/api";
import { notifyProfileUpdated } from "../profile/profileEvents";
import { ApiError } from "../../lib/apiClient";
import ProfileOnboardingModal, {
	type ProfileOnboardingValues,
} from "./components/ProfileOnboardingModal";
import ThemeOnboardingModal from "./components/ThemeOnboardingModal";

type Step = "checking" | "none" | "profile" | "theme";

function themePromptKey(userId: string): string {
	return `artmate_onboarding_theme_seen_${userId}`;
}

/**
 * Artist and hirer onboarding: a brand-new account has no ArtistProfile /
 * HirerProfile yet. For artists that's a hard block — swipe matching is
 * keyed on the category, so there's nothing for that side of the app to show
 * without one. Hirers don't pick a category at all (each gig carries its own,
 * set when it's posted) — for them the mandatory field is organization name,
 * which the backend won't create their profile without. Blocks on that
 * mandatory profile picker until saved, then offers an optional, once-ever
 * theme picker. Renders nothing once both are resolved, and is a no-op for
 * admins.
 */
export default function ProfileOnboardingGate() {
	const { user } = useAuth();
	const [step, setStep] = useState<Step>("checking");
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	useEffect(() => {
		// Nothing to check for admins — the render guard below keeps this gate
		// a no-op for them regardless of `step`, so there's no state to set here.
		if (!user || (user.role !== "artist" && user.role !== "hirer")) return;
		let cancelled = false;
		fetchMyProfile()
			.then((status) => {
				if (cancelled) return;
				// The expected shape for a genuinely new account — no profile at
				// all yet, not an error (GET /profile/me is a 200 either way).
				if (!status.exists) {
					setStep("profile");
					return;
				}
				// A hirer profile never needs a category (see the module comment
				// above), so its mere existence means onboarding is done. An artist
				// profile can't exist without one — categories.length > 0 always
				// holds by the time we get here — but checking it explicitly still
				// guards against a profile that predates that requirement.
				const profileComplete = user.role === "hirer" || status.categories.length > 0;
				setStep(profileComplete ? nextStepAfterProfile(user.id) : "profile");
			})
			.catch(() => {
				if (cancelled) return;
				setStep("none");
			});
		return () => {
			cancelled = true;
		};
	}, [user]);

	function nextStepAfterProfile(userId: string): Step {
		return localStorage.getItem(themePromptKey(userId)) ? "none" : "theme";
	}

	async function handleProfileSubmit(values: ProfileOnboardingValues) {
		if (!user) return;
		setIsSaving(true);
		setSaveError(null);
		try {
			const base = {
				bio: values.bio.trim() || null,
				location: values.location.trim() || null,
			};
			const payload: ProfileUpdate =
				user.role === "hirer"
					? { ...base, organizationName: values.organizationName.trim() }
					: {
							...base,
							categories: [values.category],
							availability: values.availability,
						};
			await saveMyProfile(payload);
			// The page underneath may already be mounted (and have already
			// failed to load, having tried before this profile existed) — let it
			// know a profile is now on record so it can retry.
			notifyProfileUpdated();
			setStep(nextStepAfterProfile(user.id));
		} catch (err) {
			setSaveError(
				err instanceof ApiError ? err.message : "Couldn't save your profile. Please try again.",
			);
		} finally {
			setIsSaving(false);
		}
	}

	function handleThemeDone() {
		if (user) localStorage.setItem(themePromptKey(user.id), "1");
		setStep("none");
	}

	if (!user || (user.role !== "artist" && user.role !== "hirer")) return null;

	if (step === "profile") {
		return (
			<ProfileOnboardingModal
				role={user.role}
				isSaving={isSaving}
				error={saveError}
				onSubmit={handleProfileSubmit}
			/>
		);
	}

	if (step === "theme") {
		return <ThemeOnboardingModal onDone={handleThemeDone} />;
	}

	return null;
}
