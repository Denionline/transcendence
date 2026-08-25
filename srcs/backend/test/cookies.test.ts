import "./setup.js";
import test, { describe } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";

import {
	OAUTH_STATE_COOKIE,
	REFRESH_COOKIE,
	SESSION_MARKER_COOKIE,
	clearOauthStateCookie,
	clearSessionCookies,
	setOauthStateCookie,
	setSessionCookies,
} from "../src/lib/cookies.js";

function proxiedApp() {
	const app = express();
	app.set("trust proxy", 1);
	return app;
}

async function withServer<T>(app: express.Express, run: (base: string) => Promise<T>): Promise<T> {
	const server = app.listen(0);
	const { port } = server.address() as AddressInfo;
	try {
		return await run(`http://127.0.0.1:${port}`);
	} finally {
		server.close();
	}
}

function cookieNamed(cookies: string[], name: string): string | undefined {
	return cookies.find((cookie) => cookie.startsWith(`${name}=`));
}

function attributesOf(cookie: string): string[] {
	return cookie
		.split(";")
		.slice(1)
		.map((part) => part.trim().toLowerCase());
}

async function setCookiesFrom(
	handler: express.RequestHandler,
	headers: Record<string, string> = {},
): Promise<string[]> {
	const app = proxiedApp();
	app.get("/probe", handler);
	return withServer(app, async (base) => {
		const res = await fetch(`${base}/probe`, { headers });
		return res.headers.getSetCookie();
	});
}

const OVER_TLS = { "X-Forwarded-Proto": "https" };

describe("session cookies", () => {
	test("both cookies are set, and only those two", async () => {
		const cookies = await setCookiesFrom((req, res) => {
			setSessionCookies(req, res, "refresh-token-value");
			res.end();
		});

		assert.equal(cookies.length, 2);
		assert.ok(cookieNamed(cookies, REFRESH_COOKIE));
		assert.ok(cookieNamed(cookies, SESSION_MARKER_COOKIE));
	});

	test("the refresh token is httpOnly, strict, and scoped to /api/auth", async () => {
		const cookies = await setCookiesFrom((req, res) => {
			setSessionCookies(req, res, "refresh-token-value");
			res.end();
		});
		const attributes = attributesOf(cookieNamed(cookies, REFRESH_COOKIE)!);

		assert.ok(attributes.includes("httponly"));
		assert.ok(attributes.includes("samesite=strict"));
		assert.ok(attributes.includes("path=/api/auth"));
	});

	test("the session marker is deliberately readable by JavaScript", async () => {
		const cookies = await setCookiesFrom((req, res) => {
			setSessionCookies(req, res, "refresh-token-value");
			res.end();
		});
		const attributes = attributesOf(cookieNamed(cookies, SESSION_MARKER_COOKIE)!);

		assert.equal(attributes.includes("httponly"), false);
		assert.ok(attributes.includes("path=/"));
	});

	test("the marker carries no part of the token", async () => {
		const cookies = await setCookiesFrom((req, res) => {
			setSessionCookies(req, res, "refresh-token-value");
			res.end();
		});
		assert.equal(
			cookieNamed(cookies, SESSION_MARKER_COOKIE)!.includes("refresh-token-value"),
			false,
		);
	});

	test("clearing agrees with setting on path, sameSite and secure", async () => {
		const set = await setCookiesFrom((req, res) => {
			setSessionCookies(req, res, "refresh-token-value");
			res.end();
		}, OVER_TLS);
		const cleared = await setCookiesFrom((req, res) => {
			clearSessionCookies(req, res);
			res.end();
		}, OVER_TLS);

		for (const name of [REFRESH_COOKIE, SESSION_MARKER_COOKIE]) {
			const setAttributes = attributesOf(cookieNamed(set, name)!).filter(
				(a) => !a.startsWith("max-age") && !a.startsWith("expires"),
			);
			const clearedAttributes = attributesOf(cookieNamed(cleared, name)!).filter(
				(a) => !a.startsWith("max-age") && !a.startsWith("expires"),
			);
			assert.deepEqual(clearedAttributes.sort(), setAttributes.sort(), `${name} attributes differ`);
		}
	});

	test("clearing sends an empty value with an expiry in the past", async () => {
		const cookies = await setCookiesFrom((req, res) => {
			clearSessionCookies(req, res);
			res.end();
		});
		const refresh = cookieNamed(cookies, REFRESH_COOKIE)!;

		assert.ok(refresh.startsWith(`${REFRESH_COOKIE}=;`));
		const expires = /expires=([^;]+)/i.exec(refresh);
		assert.ok(expires, "expected an Expires attribute");
		assert.ok(new Date(expires[1]).getTime() < Date.now());
	});
});

describe("secure follows the request, not the environment", () => {
	test("a request forwarded as https gets Secure cookies", async () => {
		const cookies = await setCookiesFrom((req, res) => {
			setSessionCookies(req, res, "t");
			res.end();
		}, OVER_TLS);

		for (const name of [REFRESH_COOKIE, SESSION_MARKER_COOKIE]) {
			assert.ok(attributesOf(cookieNamed(cookies, name)!).includes("secure"), `${name} not Secure`);
		}
	});

	test("a plain HTTP request does not, since the browser would reject it", async () => {
		const cookies = await setCookiesFrom((req, res) => {
			setSessionCookies(req, res, "t");
			res.end();
		});

		for (const name of [REFRESH_COOKIE, SESSION_MARKER_COOKIE]) {
			assert.equal(attributesOf(cookieNamed(cookies, name)!).includes("secure"), false);
		}
	});

	test("NODE_ENV has no say in it", async () => {
		const previous = process.env.NODE_ENV;
		process.env.NODE_ENV = "production";
		try {
			const cookies = await setCookiesFrom((req, res) => {
				setSessionCookies(req, res, "t");
				res.end();
			});
			assert.equal(
				attributesOf(cookieNamed(cookies, REFRESH_COOKIE)!).includes("secure"),
				false,
				"production alone should not mark a plain-HTTP cookie Secure",
			);
		} finally {
			process.env.NODE_ENV = previous;
		}
	});
});

describe("oauth state cookie", () => {
	test("is Lax so it survives the navigation back from 42", async () => {
		const cookies = await setCookiesFrom((req, res) => {
			setOauthStateCookie(req, res, "state-value");
			res.end();
		});
		const attributes = attributesOf(cookieNamed(cookies, OAUTH_STATE_COOKIE)!);

		assert.ok(attributes.includes("samesite=lax"));
		assert.equal(attributes.includes("samesite=strict"), false);
		assert.ok(attributes.includes("httponly"));
	});

	test("expires in minutes, not weeks", async () => {
		const cookies = await setCookiesFrom((req, res) => {
			setOauthStateCookie(req, res, "state-value");
			res.end();
		});
		const maxAge = /max-age=(\d+)/i.exec(cookieNamed(cookies, OAUTH_STATE_COOKIE)!);

		assert.ok(maxAge, "expected a Max-Age");
		assert.ok(Number(maxAge[1]) <= 10 * 60, "oauth state should be short-lived");
	});

	test("clearing agrees with setting", async () => {
		const set = await setCookiesFrom((req, res) => {
			setOauthStateCookie(req, res, "s");
			res.end();
		}, OVER_TLS);
		const cleared = await setCookiesFrom((req, res) => {
			clearOauthStateCookie(req, res);
			res.end();
		}, OVER_TLS);

		const strip = (cookie: string) =>
			attributesOf(cookie)
				.filter((a) => !a.startsWith("max-age") && !a.startsWith("expires"))
				.sort();

		assert.deepEqual(
			strip(cookieNamed(cleared, OAUTH_STATE_COOKIE)!),
			strip(cookieNamed(set, OAUTH_STATE_COOKIE)!),
		);
	});
});

describe("trust proxy", () => {
	async function ipSeenWith(headers: Record<string, string>): Promise<string> {
		const app = proxiedApp();
		app.get("/ip", (req, res) => {
			res.json({ ip: req.ip, secure: req.secure });
		});
		return withServer(app, async (base) => {
			const res = await fetch(`${base}/ip`, { headers });
			return ((await res.json()) as { ip: string }).ip;
		});
	}

	test("a single forwarded hop is trusted, so req.ip is the real caller", async () => {
		assert.equal(await ipSeenWith({ "X-Forwarded-For": "203.0.113.7" }), "203.0.113.7");
	});

	test("a client cannot forge an earlier hop to escape its rate-limit bucket", async () => {
		const forged = await ipSeenWith({ "X-Forwarded-For": "1.1.1.1, 203.0.113.7" });
		assert.equal(forged, "203.0.113.7");
		assert.notEqual(forged, "1.1.1.1");
	});

	test("with no forwarded header at all, req.ip is the socket address", async () => {
		const ip = await ipSeenWith({});
		assert.match(ip, /127\.0\.0\.1|::ffff:127\.0\.0\.1|::1/);
	});

	test("req.secure reads X-Forwarded-Proto", async () => {
		const app = proxiedApp();
		app.get("/s", (req, res) => res.json({ secure: req.secure }));
		const secure = await withServer(app, async (base) => {
			const res = await fetch(`${base}/s`, { headers: OVER_TLS });
			return ((await res.json()) as { secure: boolean }).secure;
		});
		assert.equal(secure, true);
	});
});
