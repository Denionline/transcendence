import { test, expect } from "@playwright/test";
import { login, ARTIST, apiDelete } from "./helpers.js";

// A real (if tiny) 1x1 transparent PNG — the backend only trusts the
// declared multipart Content-Type (see files.routes.ts), but the browser's
// own File object still needs valid bytes to exist at all.
const ONE_PIXEL_PNG = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
	"base64",
);

test("artist can upload a portfolio photo and see it persist", async ({ page }) => {
	await login(page, ARTIST.email, ARTIST.password);
	await page.goto("/profile");

	const fileName = `e2e-upload-${crypto.randomUUID()}.png`;

	// The "Add photo" tile's <input type="file"> is visually hidden (the
	// visible control is the button next to it) — setInputFiles works on a
	// hidden input directly, no need to click the button first. Capture the
	// created file's id from the network response so it can be deleted
	// afterwards — the UI never shows it anywhere.
	const [uploadResponse] = await Promise.all([
		page.waitForResponse(
			(res) => res.request().method() === "POST" && res.url().includes("/api/files"),
		),
		page
			.locator("li")
			.filter({ has: page.getByRole("button", { name: "Add photo" }) })
			.locator('input[type="file"]')
			.setInputFiles({ name: fileName, mimeType: "image/png", buffer: ONE_PIXEL_PNG }),
	]);
	const { id: fileId } = (await uploadResponse.json()) as { id: string };

	// A second, larger preview elsewhere on the page reuses this alt text
	// with a "Name's " prefix — exact: true keeps this pinned to the
	// portfolio grid tile specifically. A generous timeout here: this step
	// follows real file I/O (network + disk on the server), which is far
	// more sensitive to a loaded CI runner than a plain UI interaction is —
	// the default 5s was enough locally but not always in CI.
	const uploadedImage = page.getByAltText(fileName, { exact: true });
	await expect(uploadedImage).toBeVisible({ timeout: 15_000 });

	// Reload to make sure this is a real, saved file — not just optimistic
	// local state that would vanish the moment the page refreshes.
	await page.reload();
	await expect(uploadedImage).toBeVisible({ timeout: 15_000 });

	await apiDelete(page, `/api/files/${fileId}`);
});
