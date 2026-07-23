export class HttpError extends Error {
	status: number;
	code: string;

	constructor(status: number, code: string, message: string) {
		super(message);
		this.status = status;
		this.code = code;
	}
}

export function throwError(status: number, code: string, message: string): never {
	throw new HttpError(status, code, message);
}
