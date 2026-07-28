import "./setup.js";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/password.js";
import { HttpError } from "../src/lib/http-error.js";
import { UserRole } from "../generated/prisma/client.js";
import {
	assertNotLockedOut,
	MAX_FAILED_ATTEMPTS,
	LOCKOUT_WINDOW_MS,
} from "../src/modules/auth/login-attempts.js";
import { userLogin } from "../src/modules/auth/auth.service.js";

const PASSWORD = "Correct#Horse7Battery";

function testEmail() {
	return `attempts-test-${crypto.randomUUID()}@test.local`;
}

async function seedAttempts(email: string, attempts: { successful: boolean; agoMs: number }[]) {
	for (const { successful, agoMs } of attempts)
		await prisma.loginAttempt.create({
			data: { email, successful, createdAt: new Date(Date.now() - agoMs) },
		});
}

function isLocked(err: unknown) {
	return err instanceof HttpError && err.status === 423 && err.code === "ACCOUNT_LOCKED";
}

after(async () => {
	await prisma.$disconnect();
});

test("assertNotLockedOut allows an account one failure short of the limit", async () => {
	const email = testEmail();
	try {
		await seedAttempts(
			email,
			Array.from({ length: MAX_FAILED_ATTEMPTS - 1 }, () => ({ successful: false, agoMs: 1000 })),
		);
		await assert.doesNotReject(() => assertNotLockedOut(email));
	} finally {
		await prisma.loginAttempt.deleteMany({ where: { email } });
	}
});

test("assertNotLockedOut locks an account once the limit is reached", async () => {
	const email = testEmail();
	try {
		await seedAttempts(
			email,
			Array.from({ length: MAX_FAILED_ATTEMPTS }, () => ({ successful: false, agoMs: 1000 })),
		);
		await assert.rejects(() => assertNotLockedOut(email), isLocked);
	} finally {
		await prisma.loginAttempt.deleteMany({ where: { email } });
	}
});

test("assertNotLockedOut ignores failures that happened before the last success", async () => {
	const email = testEmail();
	try {
		await seedAttempts(email, [
			...Array.from({ length: MAX_FAILED_ATTEMPTS }, () => ({ successful: false, agoMs: 60_000 })),
			{ successful: true, agoMs: 30_000 },
		]);
		await assert.doesNotReject(() => assertNotLockedOut(email));
	} finally {
		await prisma.loginAttempt.deleteMany({ where: { email } });
	}
});

test("assertNotLockedOut releases the account once the window has passed", async () => {
	const email = testEmail();
	try {
		await seedAttempts(
			email,
			Array.from({ length: MAX_FAILED_ATTEMPTS }, () => ({
				successful: false,
				agoMs: LOCKOUT_WINDOW_MS + 60_000,
			})),
		);
		await assert.doesNotReject(() => assertNotLockedOut(email));
	} finally {
		await prisma.loginAttempt.deleteMany({ where: { email } });
	}
});

test("assertNotLockedOut locks unknown emails too, so it cannot be used to probe for accounts", async () => {
	const email = testEmail();
	try {
		await seedAttempts(
			email,
			Array.from({ length: MAX_FAILED_ATTEMPTS }, () => ({ successful: false, agoMs: 1000 })),
		);
		await assert.rejects(() => assertNotLockedOut(email), isLocked);
	} finally {
		await prisma.loginAttempt.deleteMany({ where: { email } });
	}
});

test("userLogin records each failure and locks the account, even for the right password", async () => {
	const email = testEmail();
	const user = await prisma.user.create({
		data: {
			email,
			username: "attempts-test",
			passwordHash: await hashPassword(PASSWORD),
			role: UserRole.artist,
		},
	});
	try {
		for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++)
			await assert.rejects(
				() => userLogin(email, "Wrong#Horse7Battery", "203.0.113.7"),
				(err: unknown) =>
					err instanceof HttpError && err.status === 401 && err.code === "INVALID_CREDENTIALS",
			);

		const recorded = await prisma.loginAttempt.findMany({ where: { email } });
		assert.equal(recorded.length, MAX_FAILED_ATTEMPTS);
		assert.ok(
			recorded.every((attempt) => !attempt.successful && attempt.userId === user.id),
			"failures should be recorded against the account, with the caller's IP",
		);
		assert.equal(recorded[0].ip, "203.0.113.7");

		await assert.rejects(() => userLogin(email, PASSWORD, "203.0.113.7"), isLocked);
	} finally {
		await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
		await prisma.loginAttempt.deleteMany({ where: { email } });
		await prisma.user.delete({ where: { id: user.id } });
	}
});

test("userLogin clears the failure streak on a successful login", async () => {
	const email = testEmail();
	const user = await prisma.user.create({
		data: {
			email,
			username: "attempts-test",
			passwordHash: await hashPassword(PASSWORD),
			role: UserRole.artist,
		},
	});
	try {
		for (let i = 0; i < MAX_FAILED_ATTEMPTS - 1; i++)
			await assert.rejects(() => userLogin(email, "Wrong#Horse7Battery"));

		const session = await userLogin(email, PASSWORD);
		assert.ok(session.token, "expected a session for the correct password");
		await assert.doesNotReject(() => assertNotLockedOut(email));
	} finally {
		await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
		await prisma.loginAttempt.deleteMany({ where: { email } });
		await prisma.user.delete({ where: { id: user.id } });
	}
});
