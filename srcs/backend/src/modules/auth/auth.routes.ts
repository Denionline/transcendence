import {
	registerUser,
	userLogin,
	refreshAccessToken,
	logoutUser,
	loginWith42,
	getCurrentUser,
} from "./auth.service.js";
import { throwError } from "../../lib/http-error.js";
import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { rateLimit } from "../../middlewares/rate-limit.middleware.js";
import crypto from "node:crypto";
import { FT_UID, FT_CALLBACK_URL, FRONTEND_URL } from "../../lib/env.js";

const router = Router();

const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 10,
	message: "too many login attempts from this address, try again later",
});

const registerLimiter = rateLimit({
	windowMs: 60 * 60 * 1000,
	max: 5,
	message: "too many accounts created from this address, try again later",
});

router.get("/42", (req, res) => {
	const state = crypto.randomBytes(16).toString("hex");
	res.cookie("oauth_state", state, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/api/auth",
		maxAge: 10 * 60 * 1000,
	});
	const params = new URLSearchParams({
		client_id: FT_UID,
		redirect_uri: FT_CALLBACK_URL,
		response_type: "code",
		scope: "public",
		state,
	});
	res.redirect(`https://api.intra.42.fr/oauth/authorize?${params.toString()}`);
});

// Keeps its own try/catch on purpose: on error this route must REDIRECT the
// browser (OAuth is a full-page navigation), not return the JSON error that the
// errorHandler middleware would produce for the other routes.
router.get("/42/callback", async (req, res) => {
	try {
		const { code, state } = req.query;
		const storedState = req.cookies.oauth_state;
		res.clearCookie("oauth_state", { path: "/api/auth" });

		if (typeof code !== "string" || typeof state !== "string")
			throwError(400, "OAUTH_INVALID_REQUEST", "missing code or state");
		if (state !== storedState) throwError(400, "OAUTH_STATE_INVALID", "invalid oauth state");

		const { refreshToken } = await loginWith42(code);
		res.cookie("refreshToken", refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			path: "/api/auth",
			maxAge: 7 * 24 * 60 * 60 * 1000,
		});
		res.redirect(FRONTEND_URL);
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("42 callback failed:", error); // for debugging purposes
		res.redirect(`${FRONTEND_URL}/login?error=oauth`);
	}
});

router.post("/register", registerLimiter, async (req, res) => {
	const { email, password, name, role } = req.body;
	const user = await registerUser(email, password, name, role);
	res.status(201).json(user);
});

router.post("/login", loginLimiter, async (req, res) => {
	const { email, password } = req.body;
	const { refreshToken, ...user } = await userLogin(email, password, req.ip);
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

router.get("/me", requireAuth, async (req, res) => {
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
