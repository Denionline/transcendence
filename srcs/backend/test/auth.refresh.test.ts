import "./setup.js";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";

import { R_SECRET } from "../src/lib/env.js";
import { prisma } from "../src/lib/prisma.js";
import { refreshAccessToken } from "../src/modules/auth/auth.service.js";
import { HttpError } from "../src/lib/http-error.js";
import { UserRole } from "../generated/prisma/client.js";

function hashToken(token: string) {
	return crypto.createHash("sha256").update(token).digest("hex");
}

async function seedRefreshToken(userId: string, expiresAt: Date) {
	const refreshToken = jwt.sign({ userId, role: UserRole.artist }, R_SECRET, {
		algorithm: "HS256",
		expiresIn: "7d",
	});
	await prisma.refreshToken.create({
		data: { userId, tokenHash: hashToken(refreshToken), expiresAt },
	});
	return refreshToken;
}

async function makeUser() {
	return prisma.user.create({
		data: {
			email: `refresh-test-${crypto.randomUUID()}@test.local`,
			username: "refresh-test",
			role: UserRole.artist,
		},
	});
}

after(async () => {
	await prisma.$disconnect();
});

test("refreshAccessToken rejects a valid JWT whose stored row has expired", async () => {
	const user = await makeUser();
	try {
		const token = await seedRefreshToken(user.id, new Date(Date.now() - 1000));
		await assert.rejects(
			() => refreshAccessToken(token),
			(err: unknown) =>
				err instanceof HttpError && err.status === 401 && err.code === "INVALID_REFRESH_TOKEN",
		);
		const remaining = await prisma.refreshToken.count({ where: { userId: user.id } });
		assert.equal(remaining, 0, "expired row should have been pruned");
	} finally {
		await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
		await prisma.user.delete({ where: { id: user.id } });
	}
});

test("refreshAccessToken issues a new access token when the stored row is still valid", async () => {
	const user = await makeUser();
	try {
		const token = await seedRefreshToken(user.id, new Date(Date.now() + 60_000));
		const result = await refreshAccessToken(token);
		assert.ok(result.token, "expected a fresh access token");
		const remaining = await prisma.refreshToken.count({ where: { userId: user.id } });
		assert.equal(remaining, 1, "valid row should not be pruned");
	} finally {
		await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
		await prisma.user.delete({ where: { id: user.id } });
	}
});
