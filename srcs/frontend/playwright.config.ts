import { defineConfig } from "@playwright/test";

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
});
