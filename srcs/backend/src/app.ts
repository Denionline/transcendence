import express, { Router } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import gigsRoutes from "./modules/gigs/gigs.routes.js";
import swipesRoutes from "./modules/swipes/swipe.routes.js";
import matchesRoutes from "./modules/matches/matches.routes.js";
import profileRoutes from "./modules/profile/profile.routes.js";
import searchRoutes from "./modules/search/search.routes.js";
import categoriesRoutes from "./modules/categories/categories.routes.js";
import messagesRoutes from "./modules/messages/messages.routes.js";
import notificationsRoutes from "./modules/notifications/notifications.route.js";
import filesRoutes from "./modules/files/files.routes.js";
import friendsRoutes from "./modules/friends/friends.route.js";
import docsRoutes from "./docs/docs.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();
const apiRouter = Router();

// Global middlewares
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use((req, _res, next) => {
	// eslint-disable-next-line no-console
	console.log(`[Http request] ${req.method} ${req.path}`);
	next();
});

// Infrastructure routes
app.get("/health", (_req, res) => {
	res.json({ status: "ok" });
});

apiRouter.use(docsRoutes);

// Modules
apiRouter.use("/auth", authRoutes);
apiRouter.use("/users", usersRoutes);
apiRouter.use("/gigs", gigsRoutes);
apiRouter.use("/swipes", swipesRoutes);
apiRouter.use("/matches", matchesRoutes);
apiRouter.use("/profile", profileRoutes);
apiRouter.use("/search", searchRoutes);
apiRouter.use("/categories", categoriesRoutes);
apiRouter.use("/files", filesRoutes);
apiRouter.use("/matches/:matchId/messages", messagesRoutes);
apiRouter.use("/notifications", notificationsRoutes);
apiRouter.use("/friends", friendsRoutes);

app.use("/api", apiRouter);

app.use(errorHandler);

export default app;
