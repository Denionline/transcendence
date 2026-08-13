import { HttpError } from "../lib/http-error.js";
import { NextFunction, Request, Response } from "express";

interface RateLimitOptions {
	windowMs: number;
	max: number;
	message?: string;
	keyOf?: (req: Request) => string;
}

interface Bucket {
	count: number;
	resetAt: number;
}

function clientIp(req: Request) {
	return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

export function rateLimit({
	windowMs,
	max,
	message = "too many requests, try again later",
	keyOf = clientIp,
}: RateLimitOptions) {
	const buckets = new Map<string, Bucket>();
	let lastSweep = Date.now();

	function sweep(now: number) {
		for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
		lastSweep = now;
	}

	return function rateLimiter(req: Request, res: Response, next: NextFunction) {
		const now = Date.now();
		if (now - lastSweep >= windowMs) sweep(now);

		const key = keyOf(req);
		const bucket = buckets.get(key);
		if (!bucket || bucket.resetAt <= now) {
			buckets.set(key, { count: 1, resetAt: now + windowMs });
			return next();
		}

		bucket.count += 1;
		if (bucket.count > max) {
			const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
			res.setHeader("Retry-After", String(retryAfter));
			return next(new HttpError(429, "TOO_MANY_REQUESTS", message));
		}
		next();
	};
}
