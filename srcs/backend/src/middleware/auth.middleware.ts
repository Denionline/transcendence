import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { SECRET } from "../lib/env.js";
import { UserRole } from "../../generated/prisma/client.js";

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

interface TokenPayload {
	userId: string;
	role: UserRole;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
	const header = req.headers.authorization;
	const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
	if (!token) {
		res.status(401).json({ error: "authentication required" });
		return;
	}
	try {
		const payload = jwt.verify(token, SECRET) as TokenPayload;
		req.user = { id: payload.userId, role: payload.role };
		next();
	} catch {
		res.status(401).json({ error: "invalid or expired token" });
	}
}

export function requireRole(...allowedRoles: UserRole[]) {
	return function (req: Request, res: Response, next: NextFunction) {
		if (!req.user) {
			res.status(401).json({ error: "authentication required" });
			return;
		}
		if (!allowedRoles.includes(req.user.role)) {
			res.status(403).json({ error: "insufficient permissions" });
			return;
		}
		next();
	};
}
