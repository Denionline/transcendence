import { Request, Response, NextFunction } from "express";
import { throwError } from "../lib/http-error.js";
import { UserRole } from "../../generated/prisma/client.js";
import jwt from "jsonwebtoken";
import { verifyAccessToken } from "../lib/jwt.js";

export interface AuthenticatedUser {
	id: string;
	role: UserRole;
}

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace Express {
		interface Request {
			user?: AuthenticatedUser;
		}
	}
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
	const authHeader = req.headers.authorization;
	if (!authHeader || !authHeader.startsWith("Bearer "))
		throwError(401, "MISSING_TOKEN", "Missing or malformed Authorization header");

	const token = authHeader.slice("Bearer ".length);
	try {
		const payload = verifyAccessToken(token);
		req.user = { id: payload.userId, role: payload.role };
		next();
	} catch (error) {
		if (error instanceof jwt.TokenExpiredError) throwError(401, "TOKEN_EXPIRED", "Token expired");
		throwError(401, "INVALID_TOKEN", "Invalid token");
	}
}

export function requireRole(...allowedRoles: UserRole[]) {
	return function (req: Request, _res: Response, next: NextFunction) {
		if (!req.user) throwError(401, "UNAUTHENTICATED", "authentication required");
		if (!allowedRoles.includes(req.user.role))
			throwError(403, "FORBIDDEN", "insufficient permissions");
		next();
	};
}
