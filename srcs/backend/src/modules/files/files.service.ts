import { writeFile } from "node:fs/promises";
import { prisma } from "../../lib/prisma.js";
import { throwError } from "../../lib/http-error.js";
import { FileVisibility, Prisma } from "../../../generated/prisma/client.js";
import { maxBytesFor, typeForMime } from "../../lib/file-limits.js";
import { buildLocation, deleteFile, ensureUploadDir, resolveKey } from "../../lib/storage.js";

//	There is no signing code to go looking for: a file's URL is derivable
//	from its id and identical for every viewer. The id is the capability —
//	`visibility` decides who is told the id, not who may fetch it.
//	See docs/mad/20260819-file-uploads.md.
export function fileUrl(id: string): string {
	return `/api/files/${id}/raw`;
}

const publicFileSelect = {
	id: true,
	type: true,
	mimeType: true,
	sizeBytes: true,
	originalName: true,
	visibility: true,
	createdAt: true,
} satisfies Prisma.FileSelect;

type PublicFile = Prisma.FileGetPayload<{ select: typeof publicFileSelect }>;

export function withUrl<T extends { id: string }>(file: T) {
	return { ...file, url: fileUrl(file.id) };
}

//	`value in FileVisibility` would be wrong: Prisma generates the enum as a
//	plain object, so `in` walks Object.prototype and waves through
//	"constructor", "__proto__" and friends.
export function parseVisibility(value: unknown): FileVisibility {
	if (value === undefined || value === null) return FileVisibility.private;
	if (typeof value !== "string" || !(Object.values(FileVisibility) as string[]).includes(value))
		throwError(400, "VALIDATION_ERROR", "visibility must be 'private' or 'public'");
	return value as FileVisibility;
}

export interface CreateFileInput {
	ownerId: string;
	buffer: Buffer;
	declaredMime: string;
	originalName: string;
	visibility: FileVisibility;
}

export async function createFile(input: CreateFileInput) {
	//	Input validation only: nothing here inspects what the bytes actually
	//	are. See docs/mad/20260819-file-uploads.md.
	const type = typeForMime(input.declaredMime);
	if (type === null)
		throwError(415, "UNSUPPORTED_FILE_TYPE", `${input.declaredMime} is not an accepted file type`);

	const maxBytes = maxBytesFor(type);
	if (input.buffer.byteLength > maxBytes)
		throwError(
			413,
			"FILE_TOO_LARGE",
			`${type} files are limited to ${Math.floor(maxBytes / (1024 * 1024))} MB`,
		);

	await ensureUploadDir();
	const location = buildLocation(input.declaredMime);
	await writeFile(resolveKey(location), input.buffer);

	//	Bytes first, row second — the reverse of delete. An orphaned file is
	//	invisible, whereas a row pointing at nothing is what users see.
	try {
		const file = await prisma.file.create({
			data: {
				ownerId: input.ownerId,
				type,
				mimeType: input.declaredMime,
				sizeBytes: input.buffer.byteLength,
				originalName: input.originalName,
				location,
				visibility: input.visibility,
			},
			select: publicFileSelect,
		});
		return withUrl(file);
	} catch (error) {
		await deleteFile(location);
		throw error;
	}
}

export async function listOwnFiles(
	ownerId: string,
	{ page, pageSize }: { page: number; pageSize: number },
) {
	const where: Prisma.FileWhereInput = { ownerId };

	const [rows, total] = await prisma.$transaction([
		prisma.file.findMany({
			where,
			skip: (page - 1) * pageSize,
			take: pageSize,
			orderBy: { createdAt: "desc" },
			select: publicFileSelect,
		}),
		prisma.file.count({ where }),
	]);

	return { items: rows.map(withUrl), page, pageSize, total };
}

//	The two fields the API never returns but the server always needs: one to
//	authorise, one to reach the bytes.
const internalFileSelect = {
	...publicFileSelect,
	ownerId: true,
	location: true,
} satisfies Prisma.FileSelect;

type InternalFile = Prisma.FileGetPayload<{ select: typeof internalFileSelect }>;

//	Named field by field rather than spread-and-delete: `ownerId` and
//	`location` must never reach a response body.
export function toPublic(file: InternalFile): PublicFile & { url: string } {
	return withUrl({
		id: file.id,
		type: file.type,
		mimeType: file.mimeType,
		sizeBytes: file.sizeBytes,
		originalName: file.originalName,
		visibility: file.visibility,
		createdAt: file.createdAt,
	});
}

export async function getFileOrThrow(fileId: string): Promise<InternalFile> {
	const file = await prisma.file.findUnique({ where: { id: fileId }, select: internalFileSelect });
	if (!file) throwError(404, "FILE_NOT_FOUND", "no file with that id");
	return file;
}

//	404 rather than 403: the id is the secret, so a 403 would confirm that
//	the id names something real.
export async function getFileForViewer(fileId: string, viewerId: string): Promise<InternalFile> {
	const file = await getFileOrThrow(fileId);
	if (file.visibility !== FileVisibility.public && file.ownerId !== viewerId)
		throwError(404, "FILE_NOT_FOUND", "no file with that id");
	return file;
}

//	Row first, then the bytes. Unlinking first would leave a row pointing at
//	nothing, which is the failure users actually see.
export async function deleteFileById(file: InternalFile): Promise<void> {
	try {
		await prisma.file.delete({ where: { id: file.id } });
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025")
			throwError(404, "FILE_NOT_FOUND", "no file with that id");
		throw error;
	}
	await deleteFile(file.location);
}

//	`onDelete: Cascade` from User drops the rows but never the bytes, so the
//	locations have to be read before the user goes. Exported for
//	users.service.ts, which owns the delete itself.
export async function locationsOwnedBy(ownerId: string): Promise<string[]> {
	const rows = await prisma.file.findMany({ where: { ownerId }, select: { location: true } });
	return rows.map((row) => row.location);
}

export async function deleteLocations(locations: string[]): Promise<void> {
	for (const location of locations) await deleteFile(location);
}

//	The portfolio query, and the reason for @@index([ownerId, visibility]).
//	It lives here rather than in profile.service.ts so the `visibility`
//	filter sits in the module that owns the rule.
export async function listPublicFilesFor(ownerId: string) {
	const rows = await prisma.file.findMany({
		where: { ownerId, visibility: FileVisibility.public },
		orderBy: { createdAt: "desc" },
		select: publicFileSelect,
	});
	return rows.map(withUrl);
}
