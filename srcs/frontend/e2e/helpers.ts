import type { Browser, Page } from "@playwright/test";

// Every seeded account (srcs/backend/prisma/seed-data.json) shares this one
// password — a single place to update it if the seed data ever changes.
export const SEED_PASSWORD = "Pass-225";

// Reused seeded accounts — both already have a completed profile, so neither
// hits the onboarding modal that a freshly-registered account would (see
// ProfileOnboardingGate.tsx).
export const HIRER = { email: "porto.live.bar@artmate.dev", password: SEED_PASSWORD };
export const ARTIST = { email: "aria.souza@artmate.dev", password: SEED_PASSWORD };
const CATEGORY_LABEL = "Musician"; // both accounts share this category in the seed data

export async function login(page: Page, email: string, password: string) {
	await page.goto("/login");
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(password);
	await page.getByRole("button", { name: "Log in" }).click();

	// Wait for the redirect before doing anything else — the next step is
	// often page.goto(), a real browser navigation that would otherwise cut
	// the in-flight login request short.
	await page.waitForURL((url) => !url.pathname.startsWith("/login"));

	// First protected page ever rendered in a fresh browser context always
	// shows the one-time theme picker (it's gated on localStorage, which a
	// brand new context never has) — dismiss it so it doesn't block clicks.
	// locator.waitFor (unlike isVisible) actually polls, so this only takes
	// the 3s hit when the modal genuinely never shows up.
	const continueButton = page.getByRole("button", { name: "Continue" });
	await continueButton
		.waitFor({ state: "visible", timeout: 3000 })
		.then(() => continueButton.click())
		.catch(() => {});
}

/**
 * Logs in a seeded hirer and artist, has the hirer post a fresh gig, and has
 * both sides like each other on it — the precondition swipe-match.spec.ts
 * and chat.spec.ts both need before they can test anything of their own.
 *
 * Call cleanupMatch() with the returned value once the test is done with it.
 */
export async function createMatch(
	browser: Browser,
): Promise<{ hirerPage: Page; artistPage: Page; gigTitle: string; gigId: string }> {
	const hirerPage = await (await browser.newContext()).newPage();
	const artistPage = await (await browser.newContext()).newPage();

	// A fresh title per run: a gig can only be swiped on once per artist
	// (409 SWIPE_EXISTS otherwise), so reusing an old gig would break on the
	// second run onward.
	const gigTitle = `E2E test ${crypto.randomUUID()}`;

	await login(hirerPage, HIRER.email, HIRER.password);
	await hirerPage.goto("/opportunities/new");
	await hirerPage.getByLabel("Title").fill(gigTitle);
	await hirerPage.getByLabel("Category").selectOption({ label: CATEGORY_LABEL });
	// Capture the created gig's id from the network response — we need it
	// later to delete the gig (and, by cascade, the match/messages it grows)
	// in cleanupMatch(), and the UI never shows it anywhere.
	const [gigResponse] = await Promise.all([
		hirerPage.waitForResponse(
			(res) => res.request().method() === "POST" && res.url().includes("/api/gigs"),
		),
		hirerPage.getByRole("button", { name: "Publish opportunity" }).click(),
	]);
	const { id: gigId } = (await gigResponse.json()) as { id: string };

	// The hirer has several open gigs, so the "reviewing for" default could
	// be any of them — pick the new one explicitly instead of assuming it.
	await hirerPage.goto("/discover");
	await hirerPage.getByRole("button", { name: "Reviewing for opportunity" }).click();
	await hirerPage.getByRole("button", { name: gigTitle }).click();

	// Every deck slot has its own hidden (hover-only) "Interested" button
	// behind the scenes, so once the details dialog is open, scope to it —
	// the unscoped role query matches all of them and strict mode refuses
	// to guess.
	await hirerPage.getByRole("button", { name: "View details for Aria Souza" }).click();
	await hirerPage.getByRole("dialog").getByRole("button", { name: "Interested" }).click();

	// The artist needs to find this exact gig in their swipe feed — it only
	// renders a few cards at a time and can hold plenty of older seeded gigs
	// ahead of ours, so pass on cards until ours turns up.
	await login(artistPage, ARTIST.email, ARTIST.password);
	const artistDialog = artistPage.getByRole("dialog");
	const gigHeading = artistDialog.getByRole("heading", { name: gigTitle, exact: true });
	for (let attempt = 0; !(await gigHeading.isVisible()); attempt++) {
		if (attempt >= 25) throw new Error(`Gig "${gigTitle}" never showed up in the artist's feed`);
		await artistPage.locator('[aria-label^="View details for "]').first().click();
		if (await gigHeading.isVisible()) break;
		await artistDialog.getByRole("button", { name: /^Pass on /, exact: false }).click();
	}
	await artistDialog.getByRole("button", { name: "Interested" }).click();

	return { hirerPage, artistPage, gigTitle, gigId };
}

/**
 * Deletes `path` via the API. `page` must already be logged in through the
 * UI. The app's access token only ever lives in an in-memory JS variable
 * inside the page (see features/auth/api.ts) — page.request shares cookies
 * with the page, but not that in-memory state — so a plain
 * page.request.delete() has no Authorization header and 401s. POST
 * /api/auth/refresh mints a fresh one from the (cookie-based) session
 * instead of logging in again — it isn't rate-limited, unlike /auth/login,
 * so cleanup here doesn't eat into the 10-attempts-per-15-minutes budget
 * the real login flows in these tests already spend.
 */
export async function apiDelete(page: Page, path: string) {
	const refreshResponse = await page.request.post("/api/auth/refresh");
	const { token } = (await refreshResponse.json()) as { token: string };
	await page.request.delete(path, { headers: { Authorization: `Bearer ${token}` } });
}

/**
 * Deletes the gig createMatch() posted (cascades to the Match and any
 * Messages sent on it — see the onDelete: Cascade chain in schema.prisma)
 * and closes both browser contexts it opened.
 */
export async function cleanupMatch({
	hirerPage,
	artistPage,
	gigId,
}: {
	hirerPage: Page;
	artistPage: Page;
	gigId: string;
}) {
	await apiDelete(hirerPage, `/api/gigs/${gigId}`);
	await hirerPage.context().close();
	await artistPage.context().close();
}
