// Must run first: populates process.env from the repo-root .env before
// ../src/lib/prisma.js constructs the client, and before ../src/lib/env.js
// reads UPLOAD_DIR. See docs/db_seeding.md.
import "../src/lib/load-dotenv.js";

import { copyFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/password.js";
import { upsertArtistProfile, upsertHirerProfile } from "../src/modules/profile/profile.service.js";
import { createGig } from "../src/modules/gigs/gigs.service.js";
import { handleSwipe } from "../src/modules/swipes/swipe.service.js";
import { fileUrl } from "../src/modules/files/files.service.js";
import { extFor, typeForMime } from "../src/lib/file-limits.js";
import { ensureUploadDir } from "../src/lib/storage.js";
import { UPLOAD_DIR } from "../src/lib/env.js";
import { FileVisibility, UserRole } from "../generated/prisma/client.js";
import seedData from "./seed-data.json" with { type: "json" };

interface SeedActor {
	id: string;
	role: UserRole;
}

async function seedCategories() {
	for (const category of seedData.categories) {
		await prisma.category.upsert({
			where: { slug: category.slug },
			update: { label: category.label },
			create: category,
		});
	}
	console.log(`OK      ${seedData.categories.length} categories`);
}

//	The avatar pool: the File rows seedFiles() plants further down. Their ids
//	are hardcoded in seed-data.json, so the URL is knowable *here* — before the
//	rows or the bytes exist — which is what lets people be seeded first and
//	their files after. Nothing reaches the network: every avatar is served by
//	this app from its own upload volume.
const avatarFiles = seedData.files.filter((file) => file.use === "avatar");
let avatarCursor = 0;

function nextAvatarUrl(): string {
	const file = avatarFiles[avatarCursor % avatarFiles.length];
	avatarCursor += 1;
	return fileUrl(file.id);
}

async function seedUser(
	input: { email: string; username: string; role: UserRole },
	passwordHash: string,
) {
	//	Round-robin, and the cursor restarts every run, so re-seeding hands
	//	each account the same avatar it had before.
	const avatarUrl = nextAvatarUrl();
	return await prisma.user.upsert({
		where: { email: input.email },
		update: { username: input.username, avatarUrl, role: input.role },
		create: { ...input, avatarUrl, passwordHash },
	});
}

async function seedPeople(passwordHash: string) {
	const admin = await seedUser({ ...seedData.admin, role: UserRole.admin }, passwordHash);

	//	The admin is in `actors` only so that seedFiles() can own the shared
	//	avatar files: they belong to everyone and to no artist in particular.
	//	Which means deleting the admin cascades to all six and every seeded
	//	avatar falls back to initials until the next `make seed`. Accepted, and
	//	written down in docs/db_seeding.md rather than left to be discovered.
	const actors: Record<string, SeedActor> = {
		[seedData.admin.email]: { id: admin.id, role: UserRole.admin },
	};

	for (const artist of seedData.artists) {
		const user = await seedUser(
			{ email: artist.email, username: artist.username, role: UserRole.artist },
			passwordHash,
		);
		await upsertArtistProfile(user.id, {
			location: artist.location,
			categories: artist.categories,
		});
		actors[artist.email] = { id: user.id, role: UserRole.artist };
	}
	console.log(`OK      ${seedData.artists.length} artists`);

	for (const hirer of seedData.hirers) {
		const user = await seedUser(
			{ email: hirer.email, username: hirer.username, role: UserRole.hirer },
			passwordHash,
		);
		await upsertHirerProfile(user.id, {
			organizationName: hirer.organizationName,
			location: hirer.location,
			categories: hirer.categories,
		});
		actors[hirer.email] = { id: user.id, role: UserRole.hirer };
	}
	console.log(`OK      ${seedData.hirers.length} hirers`);

	return actors;
}

//	Resolved from this module's own URL, never process.cwd(): the seed runs
//	from srcs/backend on the host (CI) and from /app inside the container.
const ASSETS_DIR = fileURLToPath(new URL("./seed-assets/", import.meta.url));

//	`make seed` writes rows, and rows are not bytes. On a machine that has just
//	cloned the repository the bytes can come from the volume (empty by
//	definition), the network (excluded — the demo must work offline) or the
//	repository. Only the last one is left, so the fixtures are tracked in git
//	and this function plants them. See docs/mad/20260819-file-uploads.md.
async function seedFiles(actors: Record<string, SeedActor>) {
	await ensureUploadDir();

	for (const entry of seedData.files) {
		//	Derived, never hardcoded: a fixture whose MIME is not in FILE_RULES
		//	fails the seed loudly. Nothing can be seeded that the API would
		//	have refused to accept.
		const type = typeForMime(entry.mimeType);
		const extension = extFor(entry.mimeType);
		if (type === null || extension === null)
			throw new Error(`seed-data.json: "${entry.mimeType}" is not in FILE_RULES`);

		const owner = actors[entry.owner];
		if (!owner) throw new Error(`seed-data.json: unknown file owner "${entry.owner}"`);

		const source = join(ASSETS_DIR, entry.asset);
		const location = `${entry.id}.${extension}`;
		const { size } = await stat(source);

		//	Bytes first, row second — the same order as createFile(), so an
		//	interrupted seed leaves an orphaned file rather than a row
		//	pointing at nothing.
		await copyFile(source, join(UPLOAD_DIR, location));

		//	The hardcoded id *is* the idempotency mechanism. A File has no
		//	natural key, so a fixed one supplies it: re-seeding overwrites the
		//	same bytes and upserts the same row instead of accumulating
		//	duplicates. CI runs the seed twice to catch a regression here.
		await prisma.file.upsert({
			where: { id: entry.id },
			update: {
				location,
				mimeType: entry.mimeType,
				sizeBytes: size,
				visibility: entry.visibility as FileVisibility,
			},
			create: {
				id: entry.id,
				ownerId: owner.id,
				type,
				mimeType: entry.mimeType,
				sizeBytes: size,
				originalName: entry.asset,
				location,
				visibility: entry.visibility as FileVisibility,
			},
		});
	}
	console.log(`OK      ${seedData.files.length} files`);
}

async function seedGigs(actors: Record<string, SeedActor>) {
	// No natural key for gigs, so rebuild rather than upsert; cascades to their swipes/matches/chats.
	const hirerIds = seedData.hirers.map((hirer) => actors[hirer.email].id);
	await prisma.gig.deleteMany({ where: { hirerId: { in: hirerIds } } });

	const gigs: Record<string, { id: string }> = {};
	let gigCount = 0;
	for (const hirer of seedData.hirers) {
		for (const gig of hirer.gigs) {
			const created = await createGig(actors[hirer.email].id, gig);
			gigs[gig.title] = { id: created.id };
			gigCount++;
		}
	}
	console.log(`OK      ${gigCount} gigs`);
	return gigs;
}

async function seedSwipes(actors: Record<string, SeedActor>, gigs: Record<string, { id: string }>) {
	const matchIdsByGig: Record<string, string> = {};

	for (const swipe of seedData.swipes) {
		const gig = gigs[swipe.gig];
		if (!gig) throw new Error(`seed-data.json: unknown gig "${swipe.gig}"`);
		const actor = actors[swipe.by];
		if (!actor) throw new Error(`seed-data.json: unknown user "${swipe.by}"`);

		const targetUserId = swipe.onArtist ? actors[swipe.onArtist].id : undefined;
		const { matchId } = await handleSwipe(actor, gig.id, swipe.liked, targetUserId);
		if (matchId) matchIdsByGig[swipe.gig] = matchId;
	}
	console.log(`OK      ${seedData.swipes.length} swipes`);
	return matchIdsByGig;
}

async function seedChats(actors: Record<string, SeedActor>, matchIdsByGig: Record<string, string>) {
	let messageCount = 0;
	for (const chat of seedData.chats) {
		const matchId = matchIdsByGig[chat.gig];
		if (!matchId) {
			console.warn(`WARN    seed-data.json: no match for gig "${chat.gig}", skipping its chat`);
			continue;
		}
		await prisma.chatMessage.createMany({
			data: chat.messages.map((message) => ({
				matchId,
				senderId: actors[message.from].id,
				content: message.content,
			})),
		});
		messageCount += chat.messages.length;
	}
	console.log(`OK      ${messageCount} chat messages`);
}

async function main() {
	await seedCategories();
	const passwordHash = await hashPassword(seedData.password);
	const actors = await seedPeople(passwordHash);
	await seedFiles(actors);
	const gigs = await seedGigs(actors);
	const matchIdsByGig = await seedSwipes(actors, gigs);
	await seedChats(actors, matchIdsByGig);

	console.log(`\nINFO    demo login password for every seeded account: ${seedData.password}`);
	console.log(
		`INFO    e.g. ${seedData.admin.email}, ${seedData.artists[0].email}, ${seedData.hirers[0].email}`,
	);
}

main()
	.catch((error: unknown) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
