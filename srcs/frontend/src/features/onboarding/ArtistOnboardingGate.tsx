import { useEffect, useState } from "react";
import { useAuth } from "../auth/hooks/useAuth";
import { fetchMyProfile, saveMyProfile } from "../profile/api";
import { notifyProfileUpdated } from "../profile/profileEvents";
import { ApiError } from "../../lib/apiClient";
import CategoryOnboardingModal from "./components/CategoryOnboardingModal";
import ThemeOnboardingModal from "./components/ThemeOnboardingModal";

type Step = "checking" | "none" | "category" | "theme";

function themePromptKey(userId: string): string {
	return `artmate_onboarding_theme_seen_${userId}`;
}

/**
 * Artist-only onboarding: a brand-new artist account has no ArtistProfile
 * (and so no category) yet, and swipe matching is keyed on that category —
 * without one there's nothing for the artist side of the app to show. Blocks
 * on a mandatory category picker until one's saved, then offers an optional,
 * once-ever theme picker. Renders nothing once both are resolved.
 */
export default function ArtistOnboardingGate() {
	const { user } = useAuth();
	const [step, setStep] = useState<Step>("checking");
	const [isSavingCategory, setIsSavingCategory] = useState(false);
	const [categoryError, setCategoryError] = useState<string | null>(null);

	useEffect(() => {
		// Nothing to check for non-artists — the render guard below keeps this
		// gate a no-op for them regardless of `step`, so there's no state to
		// set here.
		if (!user || user.role !== "artist") return;
		let cancelled = false;
		fetchMyProfile()
			.then((profile) => {
				if (cancelled) return;
				setStep(profile.category ? nextStepAfterCategory(user.id) : "category");
			})
			.catch((err: unknown) => {
				if (cancelled) return;
				// The expected shape for a genuinely new artist — no profile at all yet.
				if (err instanceof ApiError && err.code === "PROFILE_NOT_FOUND") {
					setStep("category");
					return;
				}
				console.error("Failed to check artist profile for onboarding:", err);
				setStep("none");
			});
		return () => {
			cancelled = true;
		};
	}, [user]);

	function nextStepAfterCategory(userId: string): Step {
		return localStorage.getItem(themePromptKey(userId)) ? "none" : "theme";
	}

	async function handleCategorySubmit(category: string) {
		if (!user) return;
		setIsSavingCategory(true);
		setCategoryError(null);
		try {
			await saveMyProfile({ category });
			// The Opportunities page underneath may already be mounted (and have
			// already failed to load, having tried before this profile existed) —
			// let it know a fresh category is now on record so it can retry
			// instead of sitting on that stale failure until a manual reload.
			notifyProfileUpdated();
			setStep(nextStepAfterCategory(user.id));
		} catch (err) {
			setCategoryError(
				err instanceof ApiError ? err.message : "Couldn't save your category. Please try again.",
			);
		} finally {
			setIsSavingCategory(false);
		}
	}

	function handleThemeDone() {
		if (user) localStorage.setItem(themePromptKey(user.id), "1");
		setStep("none");
	}

	if (!user || user.role !== "artist") return null;

	if (step === "category") {
		return (
			<CategoryOnboardingModal
				isSaving={isSavingCategory}
				error={categoryError}
				onSubmit={handleCategorySubmit}
			/>
		);
	}

	if (step === "theme") {
		return <ThemeOnboardingModal onDone={handleThemeDone} />;
	}

	return null;
}
