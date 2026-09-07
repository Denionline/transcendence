// Must be first: switches zod to jitless mode before any schema is built, so
// its eval-support probe never runs and never trips the CSP. See the file.
import "./lib/zod-jitless";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./i18n";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
