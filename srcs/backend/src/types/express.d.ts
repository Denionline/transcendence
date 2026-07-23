import { UserRole } from "../../generated/prisma/client.js";

declare global {
	namespace Express {
		interface Request {
			user?: { userId: number; role: UserRole; iat?: number; exp?: number };
		}
	}
}
