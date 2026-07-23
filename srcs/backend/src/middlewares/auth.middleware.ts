import { Request, Response, NextFunction } from 'express';
import { SECRET } from "../lib/env.js"
import { throwError } from "../lib/http-error.js"
import { UserRole } from "../../generated/prisma/client.js";
import jwt from 'jsonwebtoken';

export function verifyToken(req: Request, res: Response, next: NextFunction)
{
	const authHeader = req.headers["authorization"];
	
	if (!authHeader || !authHeader.startsWith("Bearer "))
		throwError(401, "Missing or malformed Authorization header");
	const token : string = authHeader.split(' ')[1];
	try 
	{
		const playload = jwt.verify(token, SECRET, {algorithms: ['HS256']}) as jwt.JwtPayload & { userId: number; role: UserRole };
		req.user = playload;
		next();
	} catch (error) 
	{
		if (error instanceof jwt.TokenExpiredError)
			throwError(401, "Token expired");
		throwError(401, "Invalid token");
	}
}