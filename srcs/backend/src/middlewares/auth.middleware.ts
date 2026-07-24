import { Request, Response, NextFunction } from "express";
import { SECRET } from "../lib/env.js";
import { throwError } from "../lib/http-error.js";
import { UserRole } from "../../generated/prisma/client.js";
import jwt from "jsonwebtoken";

export function verifyToken(req: Request, res: Response, next: NextFunction) {
	const authHeader = req.headers["authorization"];

	if (!authHeader || !authHeader.startsWith("Bearer "))
		throwError(401, "MISSING_TOKEN", "Missing or malformed Authorization header");
	const token: string = authHeader.split(" ")[1];
	try {
		const payload = jwt.verify(token, SECRET, { algorithms: ["HS256"] }) as jwt.JwtPayload & {
			userId: string;
			role: UserRole;
		};
		req.user = payload;
		next();
	} catch (error) {
		if (error instanceof jwt.TokenExpiredError) throwError(401, "TOKEN_EXPIRED", "Token expired");
		throwError(401, "INVALID_TOKEN", "Invalid token");
	}
}
