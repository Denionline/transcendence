import bcrypt from "bcrypt";
import { throwError } from "../../lib/http-error.js";
import { Prisma, UserRole } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";

const REGISTERABLE_ROLES: UserRole[] = [UserRole.artist, UserRole.hirer];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeCredentials(email: string, password: string) {
	if (!email || !password)
		throwError(400, "email and password are required");
	if (typeof email !== "string" || typeof password !== "string")
		throwError(400, "email and password must be strings");
	if (password.length < 8 || password.length > 72)
		throwError(400, "password must be between 8 and 72 characters");
	email = email.trim().toLowerCase();
	if (!EMAIL_REGEX.test(email))
		throwError(400, "invalid email format");
	return email;
}

export async function registerUser(
	email: string,
	password: string,
	name: string,
	role: UserRole
) {
	if (!name || !role)
		throwError(400, "email, password, name and role are required");
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

export async function login(email: string, password: string)
{
	email = normalizeCredentials(email, password);
}