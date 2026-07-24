import { Router } from "express";
import { verifyToken } from "../../middlewares/auth.middleware.js";
import {
	registerUser,
	userLogin,
	refreshAccessToken,
	logoutUser,
	getCurrentUser,
} from "./auth.service.js";

const router = Router();

router.post("/register", async (req, res) => {
	const { email, password, name, role } = req.body;
	const user = await registerUser(email, password, name, role);
	res.status(201).json(user);
});

router.post("/login", async (req, res) => {
	const { email, password } = req.body;
	const { refreshToken, ...user } = await userLogin(email, password);
	res.cookie("refreshToken", refreshToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict",
		path: "/api/auth",
		maxAge: 7 * 24 * 60 * 60 * 1000,
	});
	res.status(200).json(user);
});

router.post("/logout", async (req, res) => {
	await logoutUser(req.cookies.refreshToken);
	res.clearCookie("refreshToken", { path: "/api/auth" });
	res.status(204).send();
});

router.post("/refresh", async (req, res) => {
	const result = await refreshAccessToken(req.cookies.refreshToken);
	res.status(200).json(result);
});

router.get("/me", verifyToken, async (req, res) => {
	const userId =
		(req.user as { userId?: string; id?: string } | undefined)?.userId ??
		(req.user as { userId?: string; id?: string } | undefined)?.id;

	if (!userId) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	const user = await getCurrentUser(userId);
	res.status(200).json(user);
});

export default router;
