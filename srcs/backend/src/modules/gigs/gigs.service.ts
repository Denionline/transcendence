import { throwError } from "../../lib/http-error.js";
import { GigStatus, Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";

// Explicit projection so the response shape stays stable if columns are added
// later (mirrors `publicUserSelect` in the users module).
const publicGigSelect = {
	id: true,
	hirerId: true,
	title: true,
	description: true,
	category: true,
	location: true,
	rate: true,
	status: true,
	createdAt: true,
} satisfies Prisma.GigSelect;

export async function getGigById(id: string) {
	const gig = await prisma.gig.findUnique({
		where: { id },
		select: publicGigSelect,
	});
	if (!gig) throwError(404, "GIG_NOT_FOUND", "gig not found");
	return gig;
}
