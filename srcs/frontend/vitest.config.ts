import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

//	Separate from vite.config.ts on purpose: that file configures the dev
//	server and the production build, including a proxy to a container that is
//	not running during a test. This one only has to turn TSX into JS and give
//	the tests a DOM.
export default defineConfig({
	plugins: [react()],
	test: {
		environment: "jsdom",
		include: ["src/**/*.test.{ts,tsx}"],
		setupFiles: ["src/test/setup.ts"],
		restoreMocks: true,
	},
});
