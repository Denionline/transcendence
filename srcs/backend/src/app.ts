import express, { Router } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import swipersRoutes from "./modules/swipes/swipe.routes.js"
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();
const apiRouter = Router();

// Global middlewares
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(cookieParser());
app.use(express.json());

// Infrastructure routes
app.get("/health", (_req, res) => {
	res.json({ status: "ok" });
});

// Modules
app.use("/api", apiRouter);

apiRouter.use("/auth", authRoutes);
apiRouter.use("/users", usersRoutes);
apiRouter.use("/swipes", usersRoutes);

app.use(errorHandler);

export default app;
