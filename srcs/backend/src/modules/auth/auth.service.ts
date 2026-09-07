import { SECRET, R_SECRET, FT_UID, FT_SECRET, FT_CALLBACK_URL } from "../../lib/env.js";
import { assertPasswordPolicy, hashPassword, verifyPassword } from "../../lib/password.js";
import { assertNotLockedOut, recordLoginAttempt } from "./login-attempts.js";
import { throwError } from "../../lib/http-error.js";
import { Prisma, User, UserRole } from "../../../generated/prisma/client.js";
import { FileVisibility } from "../../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { authEvents } from "../../lib/auth-events.js";
import { createFile } from "../files/files.service.js";
import { sniffMime } from "../../lib/file-signature.js";

const REGISTERABLE_ROLES: UserRole[] = [UserRole.artist, UserRole.hirer];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeCredentials(email: string, password: string) {
	if (!email || !password) throwError(400, "VALIDATION_ERROR", "email and password are required");
	if (typeof email !== "string" || typeof password !== "string")
		throwError(400, "VALIDATION_ERROR", "email and password must be strings");
	email = email.trim().toLowerCase();
	if (!EMAIL_REGEX.test(email)) throwError(400, "VALIDATION_ERROR", "invalid email format");
	return email;
}

function hashToken(token: string) {
	return crypto.createHash("sha256").update(token).digest("hex");
}

function toPublicUser(user: User) {
	return {
		id: user.id,
		email: user.email,
		username: user.username,
		role: user.role,
		avatarUrl: user.avatarUrl,
		createdAt: user.createdAt,
	};
}

// Issues our own access+refresh JWTs and persists the refresh-token hash for
// revocability. Shared by both password login (userLogin) and 42 OAuth
// (loginWith42), so both flows return the same session shape.
async function issueSession(user: User) {
	const refreshToken = jwt.sign({ userId: user.id, role: user.role }, R_SECRET, {
		algorithm: "HS256",
		expiresIn: "7d",
	});
	const token = jwt.sign(
		{ userId: user.id, role: user.role, sessionId: hashToken(refreshToken) },
		SECRET,
		{
			algorithm: "HS256",
			expiresIn: "15m",
		},
	);
	await prisma.refreshToken.create({
		data: {
			userId: user.id,
			tokenHash: hashToken(refreshToken),
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
		},
	});
	return { ...toPublicUser(user), token, refreshToken };
}

export async function registerUser(email: string, password: string, name: string, role: UserRole) {
	if (!name || !role)
		throwError(400, "VALIDATION_ERROR", "email, password, name and role are required");
	if (!REGISTERABLE_ROLES.includes(role))
		throwError(400, "VALIDATION_ERROR", "role must be either 'artist' or 'hirer'");
	email = normalizeCredentials(email, password);
	name = name.trim();
	assertPasswordPolicy(password, { email, username: name });
	const passwordHash = await hashPassword(password);
	try {
		const user = await prisma.user.create({
			data: { email, username: name, passwordHash, role },
		});
		return toPublicUser(user);
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
			throwError(409, "EMAIL_EXISTS", "email already registered");
		throw error;
	}
}

export async function userLogin(email: string, password: string, ip?: string) {
	email = normalizeCredentials(email, password);
	await assertNotLockedOut(email);
	const user = await prisma.user.findUnique({ where: { email: email } });
	const passwordMatch = await verifyPassword(password, user?.passwordHash ?? null);
	if (!user || !passwordMatch) {
		await recordLoginAttempt(email, false, ip, user?.id);
		throwError(401, "INVALID_CREDENTIALS", "invalid email or password");
	}
	await recordLoginAttempt(email, true, ip, user.id);
	return issueSession(user);
}

interface FtTokenResponse {
	access_token: string;
}

interface FtProfile {
	email: string;
	login: string;
	image?: { link?: string | null };
}

const FT_AVATAR_EXTENSIONS: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
};

//	42 hands us the profile photo as a `cdn.intra.42.fr` URL. Storing that URL
//	straight on `avatarUrl` makes the browser load a cross-origin image, which
//	the enforcing CSP (`img-src 'self' data: blob:`) blocks. Instead we pull the
//	bytes once, server-side, into our own file store — exactly where an uploaded
//	avatar lives — so the account ends up with a same-origin `/api/files/:id/raw`
//	URL like every other avatar. A 42 photo is a nice-to-have: any failure here
//	(network, an unexpected format, too large) just leaves the account on its
//	generated initials.
async function importFtAvatar(link: string, ownerId: string): Promise<string | null> {
	try {
		const res = await fetch(link, { signal: AbortSignal.timeout(5000) });
		if (!res.ok) return null;
		const buffer = Buffer.from(await res.arrayBuffer());
		const [mime] = sniffMime(buffer) ?? [];
		const extension = mime ? FT_AVATAR_EXTENSIONS[mime] : undefined;
		if (!mime || !extension) return null;
		const file = await createFile({
			ownerId,
			buffer,
			declaredMime: mime,
			originalName: `42-avatar.${extension}`,
			visibility: FileVisibility.public,
		});
		return file.url;
	} catch {
		return null;
	}
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
	if (!tokenRes.ok) throwError(502, "FT_EXCHANGE_FAILED", "failed to exchange code with 42");
	const { access_token } = (await tokenRes.json()) as FtTokenResponse;
	const profileRes = await fetch("https://api.intra.42.fr/v2/me", {
		headers: { Authorization: `Bearer ${access_token}` },
	});
	if (!profileRes.ok) throwError(502, "FT_PROFILE_FAILED", "failed to fetch 42 profile");
	const profile = (await profileRes.json()) as FtProfile;
	const email = profile.email.trim().toLowerCase();
	let user = await prisma.user.findUnique({ where: { email } });
	const justCreated = !user;
	if (!user)
		user = await prisma.user.create({
			data: { email, username: profile.login, avatarUrl: null },
		});

	//	Fetch the 42 photo into our own file store on the first 42 login, and
	//	also heal any account still carrying a raw `https://cdn.intra.42.fr/...`
	//	URL from before this was done — the CSP blocks that image in the browser.
	const link = profile.image?.link;
	const hasExternalAvatar = user.avatarUrl?.startsWith("http") ?? false;
	if (justCreated || hasExternalAvatar) {
		const localUrl = link ? await importFtAvatar(link, user.id) : null;
		if (localUrl) {
			user = await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: localUrl } });
		} else if (hasExternalAvatar) {
			//	The download failed but the stored URL is the cross-origin one the
			//	CSP blocks. Drop it so the account falls back to its initials
			//	rather than a broken image plus a console violation on every page.
			user = await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: null } });
		}
	}

	return issueSession(user);
}

export async function logoutUser(refreshToken: string) {
	if (!refreshToken) return;
	await prisma.refreshToken.deleteMany({ where: { tokenHash: hashToken(refreshToken) } });
	const sessionId = hashToken(refreshToken);
	authEvents.emit("logout", { sessionId });
}

export async function refreshAccessToken(refreshToken: string) {
	if (!refreshToken) throwError(401, "MISSING_TOKEN", "Not found refreshToken");
	try {
		const data = jwt.verify(refreshToken, R_SECRET, { algorithms: ["HS256"] }) as jwt.JwtPayload & {
			userId: string;
			role: UserRole;
		};
		const stored = await prisma.refreshToken.findUnique({
			where: { tokenHash: hashToken(refreshToken) },
		});
		if (!stored) throwError(401, "INVALID_REFRESH_TOKEN", "invalid or expired refresh token");

		if (stored.expiresAt <= new Date()) {
			await prisma.refreshToken.deleteMany({
				where: { userId: data.userId, expiresAt: { lt: new Date() } },
			});
			throwError(401, "INVALID_REFRESH_TOKEN", "invalid or expired refresh token");
		}

		const newToken = jwt.sign(
			{ userId: data.userId, role: data.role, sessionId: hashToken(refreshToken) },
			SECRET,
			{ algorithm: "HS256", expiresIn: "15m" },
		);
		return { token: newToken };
	} catch {
		throwError(401, "INVALID_REFRESH_TOKEN", "invalid or expired refresh token");
	}
}

export async function getCurrentUser(userId: string) {
	const user = await prisma.user.findUnique({ where: { id: userId } });
	if (!user) throwError(404, "NOT_FOUND", "user not found");
	return toPublicUser(user);
}
