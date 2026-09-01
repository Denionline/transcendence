import { test, expect } from "@playwright/test";
import { createMatch, cleanupMatch } from "./helpers.js";

test("a message sent by one side arrives live on the other side's screen", async ({ browser }) => {
	const { hirerPage, artistPage, gigTitle, gigId } = await createMatch(browser);

	// Both sides open the chat for this specific match. The matches list still
	// shows "Matched on {gigTitle}" at this point (that subtitle only flips to
	// a message preview once a message actually exists), so scope to the list
	// item that has it — the hirer/artist have older matches too, and every
	// one of them uses the same "Go to chat with ..." link text.
	async function openChat(page: typeof hirerPage) {
		await page.goto("/matches");
		await page
			.locator("li")
			.filter({ hasText: `Matched on ${gigTitle}` })
			.getByRole("link", { name: /^Go to chat with / })
			.click();
	}

	await openChat(artistPage);
	await openChat(hirerPage);

	// Artist sends a message; it should appear live (via WebSocket, no
	// reload) on the hirer's already-open chat panel.
	const artistMessage = `Hello from the artist ${crypto.randomUUID()}`;
	await artistPage.getByLabel("Message", { exact: true }).fill(artistMessage);
	await artistPage.getByRole("button", { name: "Send" }).click();
	// The nav bar also has a (hidden) preview of the latest message, so scope
	// to the chat panel itself (role="main") to avoid matching that too.
	await expect(hirerPage.getByRole("main").getByText(artistMessage)).toBeVisible();

	// And the reverse direction: hirer replies, artist sees it live too.
	const hirerMessage = `Hello from the hirer ${crypto.randomUUID()}`;
	await hirerPage.getByLabel("Message", { exact: true }).fill(hirerMessage);
	await hirerPage.getByRole("button", { name: "Send" }).click();
	await expect(artistPage.getByRole("main").getByText(hirerMessage)).toBeVisible();

	await cleanupMatch({ hirerPage, artistPage, gigId });
});
