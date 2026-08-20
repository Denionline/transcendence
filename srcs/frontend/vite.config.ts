import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	plugins: [tailwindcss()],
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
