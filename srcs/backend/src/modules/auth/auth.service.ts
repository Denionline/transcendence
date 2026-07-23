import { SECRET, R_SECRET, FT_UID, FT_SECRET, FT_CALLBACK_URL } from "../../lib/env.js";
import bcrypt from "bcrypt";
import { throwError } from "../../lib/http-error.js";
import { Prisma, UserRole } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";

const REGISTERABLE_ROLES: UserRole[] = [UserRole.artist, UserRole.hirer];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeCredentials(email: string, password: string) {
	if (!email || !password) throwError(400, "email and password are required");
	if (typeof email !== "string" || typeof password !== "string")
		throwError(400, "email and password must be strings");
	if (password.length < 8 || password.length > 72)
		throwError(400, "password must be between 8 and 72 characters");
	email = email.trim().toLowerCase();
	if (!EMAIL_REGEX.test(email)) throwError(400, "invalid email format");
	return email;
}

function hashToken(token: string) {
	return crypto.createHash("sha256").update(token).digest("hex");
}

// adapted from userLogin bellow
async function issueSession(user: { id: string; email: string; role: UserRole }) {
	const token = jwt.sign({ userId: user.id, role: user.role }, SECRET, {
		algorithm: "HS256",
		expiresIn: "15m",
	});
	const refreshToken = jwt.sign({ userId: user.id, role: user.role }, R_SECRET, {
		algorithm: "HS256",
		expiresIn: "7d",
	});
	await prisma.refreshToken.create({
		data: {
			userId: user.id,
			tokenHash: hashToken(refreshToken),
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
		},
	});
	return { id: user.id, email: user.email, token, refreshToken };
}

export async function registerUser(email: string, password: string, name: string, role: UserRole) {
	if (!name || !role) throwError(400, "email, password, name and role are required");
	if (!REGISTERABLE_ROLES.includes(role))
		throwError(400, "role must be either 'artist' or 'hirer'");
	email = normalizeCredentials(email, password);
	name = name.trim();
	const passwordHash = await bcrypt.hash(password, 10);
	try {
		const user = await prisma.user.create({
			data: { email, username: name, passwordHash, role },
		});
		return { id: user.id, email: user.email };
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
			throwError(409, "email already registered");
		throw error;
	}
}

export async function userLogin(email: string, password: string) {
	email = normalizeCredentials(email, password);
	const user = await prisma.user.findUnique({ where: { email: email } });
	if (!user) throwError(401, "invalid email or password");
	if (!user.passwordHash) throwError(401, "invalid email or password");
	const passwordMatch = await bcrypt.compare(password, user.passwordHash);
	if (!passwordMatch) throwError(401, "invalid email or password");
	const token = jwt.sign({ userId: user.id, role: user.role }, SECRET, {
		algorithm: "HS256",
		expiresIn: "15m",
	});
	const refreshToken = jwt.sign({ userId: user.id, role: user.role }, R_SECRET, {
		algorithm: "HS256",
		expiresIn: "7d",
	});
	await prisma.refreshToken.create({
		data: {
			userId: user.id,
			tokenHash: hashToken(refreshToken),
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
		},
	});
	return { id: user.id, email: user.email, token, refreshToken };
}

export async function loginWith42(code: string) {
	const tokenRes = await fetch("https://api.intra.42.fr/oauth/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "authorization_code",
			client_id: FT_UID,
			client_secret: FT_SECRET,
			code,
			redirect_uri: FT_CALLBACK_URL,
		}),
	});
	if (!tokenRes.ok) throwError(502, "failed to exchange code with 42");
	const { access_token } = await tokenRes.json();
	const tokenRes = await fetch("https://api.intra.42.fr/oauth/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "authorization_code",
			client_id: FT_UID,
			client_secret: FT_SECRET,
			code,
			redirect_uri: FT_CALLBACK_URL,
		}),
	});
	if (!tokenRes.ok) throwError(502, "failed to exchange code with 42");
	const { access_token } = await tokenRes.json();
	const profileRes = await fetch("https://api.intra.42.fr/v2/me", {
		headers: { Authorization: `Bearer ${access_token}` },
	});
	if (!profileRes.ok) throwError(502, "failed to fetch 42 profile");
	const profile = await profileRes.json();
	const email = profile.email.trim().toLowerCase();
	let user = await prisma.user.findUnique({ where: { email } });
	if (!user)
		user = await prisma.user.create({
			data: {
				email,
				username: profile.login,
				avatarUrl: profile.image?.link ?? null,
			},
		});
	return issueSession(user);
}

export async function logoutUser(refreshToken: string) {
	if (!refreshToken) return;
	await prisma.refreshToken.deleteMany({ where: { tokenHash: hashToken(refreshToken) } });
}

export async function refreshAccessToken(refreshToken: string) {
	if (!refreshToken) throwError(401, "Not found refreshToken");
	try {
		const data = jwt.verify(refreshToken, R_SECRET, { algorithms: ["HS256"] }) as jwt.JwtPayload & {
			userId: number;
			role: UserRole;
		};
		const stored = await prisma.refreshToken.findUnique({
			where: { tokenHash: hashToken(refreshToken) },
		});
		if (!stored) throwError(401, "invalid or expired refresh token");
		const newToken = jwt.sign({ userId: data.userId, role: data.role }, SECRET, {
			algorithm: "HS256",
			expiresIn: "15m",
		});
		return { token: newToken };
	} catch (error) {
		throwError(401, "invalid or expired refresh token");
	}
}
