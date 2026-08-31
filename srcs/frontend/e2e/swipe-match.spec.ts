import { test, expect } from "@playwright/test";
import { createMatch, cleanupMatch } from "./helpers.js";

test("mutual swipe between a hirer and an artist creates a match", async ({ browser }) => {
	const { hirerPage, artistPage, gigTitle, gigId } = await createMatch(browser);

	// Confirm the match shows up on the artist's Matches page. Asserting on
	// the gig title (unique, has our random UUID in it) instead of the
	// hirer's name avoids matching unrelated older matches.
	await artistPage.goto("/matches");
	await expect(artistPage.getByText(`Matched on ${gigTitle}`)).toBeVisible();

	await cleanupMatch({ hirerPage, artistPage, gigId });
});
