import jwt from "jsonwebtoken";
import { SECRET } from "./env.js";
import type { UserRole } from "../../generated/prisma/client.js";

export interface TokenPayload {
	userId: string;
	role: UserRole;
}

export function verifyAccessToken(token: string): TokenPayload {
	return jwt.verify(token, SECRET, { algorithms: ["HS256"] }) as TokenPayload;
}
