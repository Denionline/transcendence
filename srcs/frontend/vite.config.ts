import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	plugins: [tailwindcss()],
	build: {
		//	Vendor code changes far less often than app code, so splitting it out
		//	keeps its cache entry alive across app deploys. `codeSplitting` and not
		//	`manualChunks` (rolldown types it as a function only) or
		//	`advancedChunks` (deprecated) — this project builds with rolldown-vite.
		rolldownOptions: {
			output: {
				codeSplitting: {
					groups: [
						{ name: "react", test: /node_modules\/(react|react-dom|react-router)/ },
						{ name: "socket", test: /node_modules\/(socket\.io-client|engine\.io-client)/ },
					],
				},
			},
		},
	},
	server: {
		host: "0.0.0.0",
		port: 5173,
		proxy: {
			"/api": {
				target: "http://backend:9000",
				changeOrigin: true,
			},
			"/socket.io": {
				target: "http://backend:9000",
				changeOrigin: true,
				ws: true,
			},
		},
	},
});
