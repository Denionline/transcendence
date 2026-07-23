export class HttpError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

export function throwError(status: number, message: string): never {
	throw new HttpError(status, message);
}
