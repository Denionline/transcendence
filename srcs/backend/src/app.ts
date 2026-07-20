import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes.js";

const app = express();

// Global middlewares
app.use(cors()); // allow requests from the frontend's origin
// app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json()); // parse JSON request bodies

// Infrastructure routes
app.get("/", (_req, res) => {
	res.json({ status: "Hello there!" });
});

app.get("/health", (_req, res) => {
	res.json({ status: "ok" });
});

// Modules
app.use("/auth", authRoutes);

export default app;
