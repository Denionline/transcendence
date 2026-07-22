import { throwError } from "../../lib/http-error.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";

export async function getUserById(id: string) {
	const user = await prisma.user.findUnique({ where: { id } });
	if (!user) throwError(404, "user not found");
	return {
		id: user.id,
		email: user.email,
		username: user.username,
		role: user.role,
	};
}

export async function listUsers() {
	return prisma.user.findMany({
		select: { id: true, email: true, username: true, role: true, createdAt: true },
	});
}
