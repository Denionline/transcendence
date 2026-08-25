import type { Request, Response } from "express";

//	The one place that knows how this app's cookies are shaped. Setting and
//	clearing have to agree on path, sameSite and secure — a mismatch leaves the
//	old cookie in the browser and logout silently does nothing — so both live
//	here rather than being respelled at each call site.

//	`secure` follows req.secure, not NODE_ENV: the honest question is whether
//	*this* request arrived over TLS. req.secure answers it from
//	X-Forwarded-Proto, trustworthy only because app.ts trusts exactly one proxy
//	hop — nginx, which sets that header itself.

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const OAUTH_STATE_MS = 10 * 60 * 1000;

//	Scoped to the only routes that read it, so a token that can mint sessions
//	is not attached to every request the app makes.
const REFRESH_PATH = "/api/auth";

export const REFRESH_COOKIE = "refreshToken";
export const SESSION_MARKER_COOKIE = "hasSession";
export const OAUTH_STATE_COOKIE = "oauth_state";

export function setSessionCookies(req: Request, res: Response, refreshToken: string): void {
	const secure = req.secure;

	res.cookie(REFRESH_COOKIE, refreshToken, {
		httpOnly: true,
		secure,
		sameSite: "strict",
		path: REFRESH_PATH,
		maxAge: WEEK_MS,
	});

	//	Readable by JavaScript on purpose: it is how the frontend knows a
	//	refresh is worth attempting before it holds an access token. It carries
	//	no secret — only the fact that a session cookie exists.
	res.cookie(SESSION_MARKER_COOKIE, "1", {
		httpOnly: false,
		secure,
		sameSite: "strict",
		path: "/",
		maxAge: WEEK_MS,
	});
}

export function clearSessionCookies(req: Request, res: Response): void {
	const secure = req.secure;

	res.clearCookie(REFRESH_COOKIE, {
		httpOnly: true,
		secure,
		sameSite: "strict",
		path: REFRESH_PATH,
	});
	res.clearCookie(SESSION_MARKER_COOKIE, {
		httpOnly: false,
		secure,
		sameSite: "strict",
		path: "/",
	});
}

//	Lax, not Strict: the browser arrives at the callback as a top-level
//	navigation from api.intra.42.fr, and a Strict cookie would not be sent with
//	it — which is exactly the request that has to compare the state.
export function setOauthStateCookie(req: Request, res: Response, state: string): void {
	res.cookie(OAUTH_STATE_COOKIE, state, {
		httpOnly: true,
		secure: req.secure,
		sameSite: "lax",
		path: REFRESH_PATH,
		maxAge: OAUTH_STATE_MS,
	});
}

export function clearOauthStateCookie(req: Request, res: Response): void {
	res.clearCookie(OAUTH_STATE_COOKIE, {
		httpOnly: true,
		secure: req.secure,
		sameSite: "lax",
		path: REFRESH_PATH,
	});
}
