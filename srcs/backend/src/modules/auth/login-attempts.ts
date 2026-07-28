import { throwError } from "../../lib/http-error.js";
import { prisma } from "../../lib/prisma.js";

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export async function assertNotLockedOut(email: string) {
	const now = Date.now();
	const windowStart = new Date(now - LOCKOUT_WINDOW_MS);
	const lastSuccess = await prisma.loginAttempt.findFirst({
		where: { email, successful: true, createdAt: { gte: windowStart } },
		orderBy: { createdAt: "desc" },
		select: { createdAt: true },
	});
	const failures = await prisma.loginAttempt.findMany({
		where: {
			email,
			successful: false,
			createdAt: { gt: lastSuccess?.createdAt ?? windowStart },
		},
		orderBy: { createdAt: "desc" },
		take: MAX_FAILED_ATTEMPTS,
		select: { createdAt: true },
	});
	if (failures.length < MAX_FAILED_ATTEMPTS) return;

	const unlockAt = failures[0].createdAt.getTime() + LOCKOUT_WINDOW_MS;
	if (unlockAt <= now) return;
	throwError(
		423,
		"ACCOUNT_LOCKED",
		`too many failed login attempts, try again in ${Math.ceil((unlockAt - now) / 60000)} minutes`,
	);
}

export async function recordLoginAttempt(
	email: string,
	successful: boolean,
	ip?: string,
	userId?: string,
) {
	await prisma.loginAttempt.create({
		data: { email, successful, ip: ip ?? null, userId: userId ?? null },
	});
	if (successful)
		await prisma.loginAttempt.deleteMany({
			where: { createdAt: { lt: new Date(Date.now() - RETENTION_MS) } },
		});
}
