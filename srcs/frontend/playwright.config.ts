import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	workers: 1,
	expect: {
		timeout: 10_000,
	},
	use: {
		baseURL: "https://localhost:8443",
		ignoreHTTPSErrors: true,
		trace: "retain-on-failure",
	},
	// Chrome is the mandatory target; Firefox and WebKit (Safari's engine) cover
	// the "additional browsers" module. Run a single engine with e.g.
	// `npx playwright test --project=firefox`.
	projects: [
		{ name: "chromium", use: { ...devices["Desktop Chrome"] } },
		{ name: "firefox", use: { ...devices["Desktop Firefox"] } },
		{ name: "webkit", use: { ...devices["Desktop Safari"] } },
	],
});
