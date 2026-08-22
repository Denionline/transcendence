import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "./openapi.js";

const router = Router();

// The raw document, for tooling that generates clients or runs contract tests
// against it. Served before the UI mount so `/docs.json` isn't swallowed by
// swagger-ui's own asset handling.
router.get("/docs.json", (_req, res) => {
	res.json(openApiDocument);
});

// swaggerUi.serve is an array of middlewares (it serves the bundled CSS/JS
// assets), hence spreading it rather than passing it as one handler.
router.use(
	"/docs",
	...swaggerUi.serve,
	swaggerUi.setup(openApiDocument, {
		customSiteTitle: "Artmate API docs",
		swaggerOptions: {
			// Collapse the operation list on load — the full expansion is noisy
			// once there is more than a handful of endpoints.
			docExpansion: "list",
			// Keep the bearer token across page reloads so "Try it out" doesn't
			// need re-authorising after every refresh.
			persistAuthorization: true,
		},
	}),
);

export default router;
