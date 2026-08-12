// Broadcasts that the caller's own profile (category, location, etc.) just
// changed server-side. Profile data gets cached into local state by whatever
// page reads it (e.g. Opportunities mirrors it into its discipline/location
// filters on mount) — a page that mounted *before* the profile existed (an
// artist finishing the mandatory onboarding category picker, still sitting
// on the page underneath) would otherwise keep showing its first, failed
// attempt until a manual reload. Anything that caches profile-derived data
// should subscribe via `onProfileUpdated` and refetch.
const PROFILE_UPDATED_EVENT = "artmate:profile-updated";

export function notifyProfileUpdated(): void {
	window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
}

/** Returns an unsubscribe function, ready to hand straight to a `useEffect` cleanup. */
export function onProfileUpdated(handler: () => void): () => void {
	window.addEventListener(PROFILE_UPDATED_EVENT, handler);
	return () => window.removeEventListener(PROFILE_UPDATED_EVENT, handler);
}
