import { prisma } from "../../lib/prisma.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { throwError } from "../../lib/http-error.js";
import { buildMeta } from "../../lib/pagination.js";

const friendSelect = {
	userId: true,
	friendId: true,
	status: true,
	user: { select: { id: true, username: true, avatarUrl: true } },
	friend: { select: { id: true, username: true, avatarUrl: true } },
} satisfies Prisma.FriendSelect;

type FriendRow = Prisma.FriendGetPayload<{ select: typeof friendSelect }>;

function toFriendSummary(callerId: string, row: FriendRow) {
	const other = row.userId === callerId ? row.friend : row.user;
	return {
		id: other.id,
		displayName: other.username,
		avatarUrl: other.avatarUrl,
		status: row.status,
	};
}

function whereForCaller(callerId: string): Prisma.FriendWhereInput {
	return {
		status: "accepted",
		OR: [{ userId: callerId }, { friendId: callerId }],
	};
}

export async function getFriendsList(callerId: string, page: number, pageSize: number) {
	const where = whereForCaller(callerId);
	const [items, total] = await prisma.$transaction([
		prisma.friend.findMany({
			where,
			skip: (page - 1) * pageSize,
			take: pageSize,
			select: friendSelect,
		}),
		prisma.friend.count({ where }),
	]);
	return {
		items: items.map((row) => toFriendSummary(callerId, row)),
		...buildMeta(page, pageSize, total),
	};
}

export async function sendInvite(callerId: string, friendId: string) {
	try {
		const existed = await prisma.friend.findUnique({
			where: { userId_friendId: { userId: friendId, friendId: callerId } },
		});
		if (existed)
			throwError(409, "FRIEND_REQUEST_EXISTS", "this user already sent you a friend request");
		const user = await prisma.friend.create({
			data: {
				userId: callerId,
				friendId,
			},
		});
		return { userId: callerId, friendId, status: user.status };
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
			throwError(409, "FRIEND_REQUEST_EXISTS", "you already sent a friend request to this user");
		throw error;
	}
}

export async function updateStatus(callerId: string, requestedId: string, accepted: boolean) {
	try {
		return await prisma.friend.update({
			where: { userId_friendId: { userId: requestedId, friendId: callerId } },
			data: { status: accepted ? "accepted" : "declined" },
		});
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025")
			throwError(404, "FRIEND_REQUEST_NOT_FOUND", "friend request not found");
		throw error;
	}
}

export async function deleteFriend(callerId: string, otherId: string) {
	const result = await prisma.friend.deleteMany({
		where: {
			OR: [
				{ userId: callerId, friendId: otherId },
				{ userId: otherId, friendId: callerId },
			],
		},
	});
	if (result.count === 0) throwError(404, "FRIEND_NOT_FOUND", "friend request not found");
}
