import { ZodError } from "zod";
import { HttpError } from "../lib/http-error.js";
import { NextFunction, Request, Response } from "express";

export interface ErrorDetail {
	path: string;
	message: string;
}

const BODY_PARSER_FAILURES: Record<string, { status: number; code: string; message: string }> = {
	"entity.parse.failed": {
		status: 400,
		code: "MALFORMED_JSON",
		message: "request body is not valid JSON",
	},
	"entity.too.large": {
		status: 413,
		code: "PAYLOAD_TOO_LARGE",
		message: "request body is too large",
	},
	"encoding.unsupported": {
		status: 415,
		code: "UNSUPPORTED_ENCODING",
		message: "unsupported content encoding",
	},
	"request.aborted": {
		status: 400,
		code: "REQUEST_ABORTED",
		message: "request aborted before it finished sending",
	},
};

function detailsOf(error: ZodError): ErrorDetail[] {
	return error.issues.map((issue) => ({
		path: issue.path.join("."),
		message: issue.message,
	}));
}

function bodyParserFailure(error: unknown) {
	if (typeof error !== "object" || error === null || !("type" in error)) return undefined;
	const { type } = error as { type?: unknown };
	return typeof type === "string" ? BODY_PARSER_FAILURES[type] : undefined;
}

// A 4xx from a library we do not own (multer, send, http-errors) keeps its
// status, but never its message — that can carry internals.
function clientStatusOf(error: unknown): number | undefined {
	if (typeof error !== "object" || error === null) return undefined;
	const { status, statusCode } = error as { status?: unknown; statusCode?: unknown };
	const value = typeof status === "number" ? status : statusCode;
	if (typeof value !== "number" || value < 400 || value > 499) return undefined;
	return value;
}

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
	next(new HttpError(404, "NOT_FOUND", "no route matches that path"));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
	if (err instanceof HttpError)
		return res.status(err.status).json({ error: err.code, message: err.message });

	if (err instanceof ZodError)
		return res.status(400).json({
			error: "VALIDATION_ERROR",
			message: "request failed validation",
			details: detailsOf(err),
		});

	const parseFailure = bodyParserFailure(err);
	if (parseFailure)
		return res
			.status(parseFailure.status)
			.json({ error: parseFailure.code, message: parseFailure.message });

	const clientStatus = clientStatusOf(err);
	if (clientStatus)
		return res
			.status(clientStatus)
			.json({ error: "REQUEST_FAILED", message: "the request could not be processed" });

	// eslint-disable-next-line no-console
	console.error("Unhandled error:", err);
	res.status(500).json({ error: "INTERNAL_ERROR", message: "Internal server error" });
}
