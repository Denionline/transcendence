import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";

const app = express();

// Global middlewares
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(cookieParser());
app.use(express.json()); 

// Infrastructure routes
app.get("/", (_req, res) => {
	res.json({ status: "Hello there!" });
});

app.get("/health", (_req, res) => {
	res.json({ status: "ok" });
});

// Modules
app.use("/auth", authRoutes);
app.use("/users", usersRoutes);

export default app;
