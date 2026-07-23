import { HttpError } from "../lib/http-error.js";
import { NextFunction, Request, Response } from "express";

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
	if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
	res.status(500).json({ error: "Internal server error" });
}
