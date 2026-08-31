import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	workers: 1,
	use: {
		baseURL: "https://localhost:8443",
		ignoreHTTPSErrors: true,
	},
});
