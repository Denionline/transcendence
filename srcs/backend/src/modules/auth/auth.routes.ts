import {
	registerUser,
	userLogin,
	refreshAccessToken,
	logoutUser,
	loginWith42,
	getCurrentUser,
} from "./auth.service.js";
import { HttpError, throwError } from "../../lib/http-error.js";
import { Router, type NextFunction, type Request, type Response } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { rateLimit } from "../../middlewares/rate.limit.middleware.js";
import crypto from "node:crypto";
import { FT_UID, FT_CALLBACK_URL, FRONTEND_URL } from "../../lib/env.js";
import { loginBody, registerBody } from "./auth.schema.js";
import {
	OAUTH_STATE_COOKIE,
	REFRESH_COOKIE,
	clearOauthStateCookie,
	clearSessionCookies,
	setOauthStateCookie,
	setSessionCookies,
} from "../../lib/cookies.js";

const router = Router();

const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 10,
	message: "too many login attempts from this address, try again later",
});

// rateLimit runs as middleware, so its 429 is thrown before the /login handler's
// try/catch can reshape it. Intercept it here and hand back the same soft
// `ok: false` body the handler uses for the other expected login failures (see
// SOFT_LOGIN_FAILURES) — a 4xx would make the browser log a console error.
// `retryAfter` (seconds) rides in the body instead of the Retry-After header so
// the response has nothing that reads as an error.
function softLoginRateLimit(req: Request, res: Response, next: NextFunction) {
	loginLimiter(req, res, (err: unknown) => {
		if (err instanceof HttpError && err.status === 429) {
			const retryAfter = Number(res.getHeader("Retry-After")) || undefined;
			res.removeHeader("Retry-After");
			res.status(200).json({
				ok: false,
				code: "TOO_MANY_REQUESTS",
				message: err.message,
				retryAfter,
			});
			return;
		}
		next(err);
	});
}

const registerLimiter = rateLimit({
	windowMs: 60 * 60 * 1000,
	max: 5,
	message: "too many accounts created from this address, try again later",
});

router.get("/42", (req, res) => {
	const state = crypto.randomBytes(16).toString("hex");
	setOauthStateCookie(req, res, state);
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
		const storedState = req.cookies[OAUTH_STATE_COOKIE];
		clearOauthStateCookie(req, res);

		if (typeof code !== "string" || typeof state !== "string")
			throwError(400, "OAUTH_INVALID_REQUEST", "missing code or state");
		if (state !== storedState) throwError(400, "OAUTH_STATE_INVALID", "invalid oauth state");

		const { refreshToken } = await loginWith42(code);
		setSessionCookies(req, res, refreshToken);
		res.redirect(FRONTEND_URL);
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error("42 callback failed:", error); // for debugging purposes
		res.redirect(`${FRONTEND_URL}/login?error=oauth`);
	}
});

router.post("/register", registerLimiter, async (req, res) => {
	const { email, password, name, role } = registerBody.parse(req.body);
	const user = await registerUser(email, password, name, role);
	res.status(201).json(user);
});

// A wrong password or a locked-out account is the expected outcome of using a
// login form, not an exceptional one. Sent as a 4xx it would make the browser
// log a console error for every mistyped password — which the subject forbids
// ("no browser console warnings/errors") — so these two land as a 200 whose
// body carries `ok: false` and the reason (hitting the rate limit is folded in
// by softLoginRateLimit above). Every other failure (validation, an unexpected
// throw) stays a real HTTP error.
const SOFT_LOGIN_FAILURES = new Set(["INVALID_CREDENTIALS", "ACCOUNT_LOCKED"]);

router.post("/login", softLoginRateLimit, async (req, res) => {
	const { email, password } = loginBody.parse(req.body);
	try {
		const { refreshToken, ...user } = await userLogin(email, password, req.ip);
		setSessionCookies(req, res, refreshToken);
		res.status(200).json({ ok: true, ...user });
	} catch (err) {
		if (err instanceof HttpError && SOFT_LOGIN_FAILURES.has(err.code)) {
			res.status(200).json({ ok: false, code: err.code, message: err.message });
			return;
		}
		throw err;
	}
});

router.post("/logout", async (req, res) => {
	await logoutUser(req.cookies[REFRESH_COOKIE]);
	clearSessionCookies(req, res);
	res.status(204).send();
});

// A missing, expired or otherwise invalid refresh cookie is the normal state
// of a returning visitor whose 7-day session has simply lapsed — the frontend
// calls this once on every page load. Sent as a 401 it makes the browser log a
// console error on a plain page load, which the subject forbids ("no browser
// console warnings/errors"), so it lands as a 200 whose body carries
// `ok: false`; the stale client-side cookies are cleared at the same time so
// the next load short-circuits before it ever calls this again. The frontend
// turns `ok: false` back into a thrown error (see features/auth/api.ts), so
// fetchMe() and apiClient's retry keep treating it as "logged out". Every
// other failure (an unexpected throw) stays a real HTTP error.
router.post("/refresh", async (req, res) => {
	try {
		const { token } = await refreshAccessToken(req.cookies[REFRESH_COOKIE]);
		res.status(200).json({ ok: true, token });
	} catch (err) {
		if (err instanceof HttpError && err.status === 401) {
			clearSessionCookies(req, res);
			res.status(200).json({ ok: false, code: err.code, message: err.message });
			return;
		}
		throw err;
	}
});

router.get("/me", requireAuth, async (req, res) => {
	const userId =
		(req.user as { userId?: string; id?: string } | undefined)?.userId ??
		(req.user as { userId?: string; id?: string } | undefined)?.id;

	if (!userId) throwError(401, "UNAUTHENTICATED", "authentication required");

	const user = await getCurrentUser(userId);
	res.status(200).json(user);
});

export default router;
