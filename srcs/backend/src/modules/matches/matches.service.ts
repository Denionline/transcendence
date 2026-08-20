import { prisma } from "../../lib/prisma.js";
import { throwError } from "../../lib/http-error.js";
import { AuthenticatedUser } from "../../middlewares/auth.middleware.js";
import { UserRole } from "../../../generated/prisma/enums.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { buildMeta } from "../../lib/pagination.js";
import { isUserOnline } from "../websocket/websocket.gateway.js";

export interface MatchListOptions {
	page: number;
	pageSize: number;
	gigId?: string;
}

export interface MatchDetail {
	matchId: string;
	otherUser: { id: string; displayName: string; avatarUrl: string | null; online: boolean };
	gig: { id: string; title: string };
	lastMessage: { content: string; createdAt: Date; senderId: string } | null;
}

//	One select serves every read: it carries enough of both sides (artist and
//	the gig's hirer) to derive the counterpart no matter which role is asking,
//	plus the ownership fields (artistId, gig.hirerId) authorization needs.
const matchSelect = {
	id: true,
	artistId: true,
	artist: { select: { id: true, username: true, avatarUrl: true } },
	gig: {
		select: {
			id: true,
			title: true,
			hirerId: true,
			hirer: {
				select: {
					id: true,
					avatarUrl: true,
					hirerProfile: { select: { organizationName: true } },
				},
			},
		},
	},
} satisfies Prisma.MatchSelect;

type MatchRow = Prisma.MatchGetPayload<{ select: typeof matchSelect }>;

//	One query for however many matches are on the page, instead of one COUNT
//	per match — groupBy hands back a row per matchId with unread messages, and
//	matches with none simply don't appear (hence the `?? 0` at the call site).
async function getUnreadCounts(userId: string, matchIds: string[]): Promise<Map<string, number>> {
	if (matchIds.length === 0) return new Map();
	const rows = await prisma.chatMessage.groupBy({
		by: ["matchId"],
		where: { matchId: { in: matchIds }, senderId: { not: userId }, isRead: false },
		_count: true,
	});
	return new Map(rows.map((row) => [row.matchId, row._count]));
}

type LastMessage = { content: string; createdAt: Date; senderId: string };

//	Same two-query shape as getUnreadCounts: groupBy finds each match's latest
//	timestamp, then one follow-up findMany resolves those timestamps to their
//	messages — avoids both an N+1 and a raw "DISTINCT ON" query.
async function getLastMessages(matchIds: string[]): Promise<Map<string, LastMessage>> {
	if (matchIds.length === 0) return new Map();
	const latest = await prisma.chatMessage.groupBy({
		by: ["matchId"],
		where: { matchId: { in: matchIds } },
		_max: { createdAt: true },
	});
	const cutoffs = latest.filter(
		(row): row is typeof row & { _max: { createdAt: Date } } => row._max.createdAt !== null,
	);
	if (cutoffs.length === 0) return new Map();
	const rows = await prisma.chatMessage.findMany({
		where: { OR: cutoffs.map((row) => ({ matchId: row.matchId, createdAt: row._max.createdAt })) },
	});
	return new Map(
		rows.map((row) => [
			row.matchId,
			{ content: row.content, createdAt: row.createdAt, senderId: row.senderId },
		]),
	);
}

//	Neither side of a match ever sees "itself" in the response — an artist gets
//	the hirer's identity (their org name doubles as a display name) and vice
//	versa. This is what the chat sidebar needs and nothing more.
function toDetail(
	user: AuthenticatedUser,
	match: MatchRow,
	lastMessage: LastMessage | null,
): MatchDetail {
	const otherUser =
		user.role === UserRole.artist
			? {
					id: match.gig.hirer.id,
					displayName: match.gig.hirer.hirerProfile?.organizationName ?? "",
					avatarUrl: match.gig.hirer.avatarUrl,
					online: isUserOnline(match.gig.hirer.id, match.id),
				}
			: {
					id: match.artist.id,
					displayName: match.artist.username,
					avatarUrl: match.artist.avatarUrl,
					online: isUserOnline(match.artist.id, match.id),
				};

	return {
		matchId: match.id,
		otherUser,
		gig: { id: match.gig.id, title: match.gig.title },
		lastMessage,
	};
}

function requireParticipant(user: AuthenticatedUser) {
	if (user.role !== UserRole.artist && user.role !== UserRole.hirer) {
		throwError(403, "FORBIDDEN", "only artists and hirers have matches");
	}
}

function ownsMatch(user: AuthenticatedUser, match: { artistId: string; gig: { hirerId: string } }) {
	if (user.role === UserRole.artist) return match.artistId === user.id;
	return match.gig.hirerId === user.id;
}

//	A match belongs to the artist who was chosen and, via the gig, to the
//	hirer who posted it — never to anyone else.
function whereForCaller(user: AuthenticatedUser, gigId?: string): Prisma.MatchWhereInput {
	if (user.role === UserRole.artist) return { artistId: user.id };
	return {
		gig: { hirerId: user.id },
		...(gigId !== undefined ? { gigId } : {}),
	};
}

export async function listMatches(user: AuthenticatedUser, options: MatchListOptions) {
	requireParticipant(user);
	const where = whereForCaller(user, options.gigId);

	const [items, total] = await prisma.$transaction([
		prisma.match.findMany({
			where,
			skip: (options.page - 1) * options.pageSize,
			take: options.pageSize,
			orderBy: { createdAt: "desc" },
			select: matchSelect,
		}),
		prisma.match.count({ where }),
	]);

	const matchIds = items.map((match) => match.id);
	const [unreadCounts, lastMessages] = await Promise.all([
		getUnreadCounts(user.id, matchIds),
		getLastMessages(matchIds),
	]);
	return {
		items: items.map((match) => ({
			...toDetail(user, match, lastMessages.get(match.id) ?? null),
			unreadCount: unreadCounts.get(match.id) ?? 0,
		})),
		...buildMeta(options.page, options.pageSize, total),
	};
}

export async function getMatchById(user: AuthenticatedUser, id: string) {
	requireParticipant(user);

	const match = await prisma.match.findUnique({ where: { id }, select: matchSelect });
	if (!match) throwError(404, "MATCH_NOT_FOUND", "match not found");
	if (ownsMatch(user, match) === false)
		throwError(403, "FORBIDDEN", "this match doesn't belong to you");

	const lastMessages = await getLastMessages([id]);
	return toDetail(user, match, lastMessages.get(id) ?? null);
}

export async function deleteMatch(user: AuthenticatedUser, id: string) {
	requireParticipant(user);

	const match = await prisma.match.findUnique({
		where: { id },
		select: { artistId: true, gig: { select: { hirerId: true } } },
	});
	if (!match) throwError(404, "MATCH_NOT_FOUND", "match not found");
	if (ownsMatch(user, match) === false)
		throwError(403, "FORBIDDEN", "this match doesn't belong to you");

	//	Unmatching cascades ChatMessage rows via onDelete: Cascade on the schema;
	//	the gig itself is left closed — there is no "reopen" flow.
	await prisma.match.delete({ where: { id } });
}

//	The WebSocket gateway needs every match id a user belongs to, unpaginated, to
//	join all of their chat rooms on connect — it only needs the ids, not the
//	full summary (unread counts, other-user info) the UI-facing endpoints return.
export async function getMatchIdsForUser(user: AuthenticatedUser): Promise<string[]> {
	requireParticipant(user);
	const where = whereForCaller(user);
	const matches = await prisma.match.findMany({ where, select: { id: true } });
	return matches.map((match) => match.id);
}
