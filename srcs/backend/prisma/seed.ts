// Must run first: populates process.env from the repo-root .env before
// ../src/lib/prisma.js constructs the client, and before ../src/lib/env.js
// reads UPLOAD_DIR. See docs/db_seeding.md.
import "../src/lib/load-dotenv.js";

import { createHash } from "node:crypto";
import { copyFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/password.js";
import { upsertArtistProfile, upsertHirerProfile } from "../src/modules/profile/profile.service.js";
import { createGig } from "../src/modules/gigs/gigs.service.js";
import { handleSwipe } from "../src/modules/swipes/swipe.service.js";
import { extFor, typeForMime } from "../src/lib/file-limits.js";
import { ensureUploadDir } from "../src/lib/storage.js";
import { UPLOAD_DIR } from "../src/lib/env.js";
import { FileVisibility, UserRole } from "../generated/prisma/client.js";
import seedData from "./seed-data.json" with { type: "json" };

interface SeedActor {
	id: string;
	role: UserRole;
}

//	A File has no natural key, so re-seeding needs a stable id derived from
//	something that never changes (who owns it, which fixture, which slot) to
//	stay idempotent — the same trick seed-data.json's hardcoded ids play, just
//	computed instead of hand-typed. Hashed, not read as a real UUID.
function deterministicId(seed: string): string {
	const hash = createHash("md5").update(seed).digest("hex");
	return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
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

//	A real photo per account, generated from the email — no fixture files to
//	ship or run out of variety across 200+ seeded people.
function avatarUrlFor(email: string): string {
	return `https://i.pravatar.cc/300?u=${email}`;
}

async function seedUser(
	input: { email: string; username: string; role: UserRole },
	passwordHash: string,
) {
	const avatarUrl = avatarUrlFor(input.email);
	return await prisma.user.upsert({
		where: { email: input.email },
		update: { username: input.username, avatarUrl, role: input.role },
		create: { ...input, avatarUrl, passwordHash },
	});
}

async function seedPeople(passwordHash: string) {
	const admin = await seedUser({ ...seedData.admin, role: UserRole.admin }, passwordHash);

	//	The admin owns the shared avatar files, so deleting the admin cascades
	//	to all six. See docs/db_seeding.md.
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
//	from srcs/backend on the host and from /app inside the container.
const ASSETS_DIR = fileURLToPath(new URL("./seed-assets/", import.meta.url));

//	Rows are not bytes. The demo must work offline from a bare clone, so the
//	fixtures are tracked in git and this function plants them.
async function seedFiles(actors: Record<string, SeedActor>) {
	await ensureUploadDir();

	for (const entry of seedData.files) {
		//	Derived, never hardcoded: nothing can be seeded that the API would
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

		//	Bytes first, row second — the same order as createFile().
		await copyFile(source, join(UPLOAD_DIR, location));

		//	The hardcoded id is the idempotency mechanism: a File has no natural
		//	key, so re-seeding upserts the same row instead of accumulating
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

const PORTFOLIO_ASSETS: { asset: string; mimeType: string }[] = [
	{ asset: "portfolio-01.jpg", mimeType: "image/jpeg" },
	{ asset: "portfolio-02.jpg", mimeType: "image/jpeg" },
	{ asset: "portfolio-03.jpg", mimeType: "image/jpeg" },
	{ asset: "demo-reel.mp4", mimeType: "video/mp4" },
	{ asset: "demo-track.mp3", mimeType: "audio/mpeg" },
];

//	Every seeded artist and hirer gets a couple more portfolio pieces on top
//	of whatever seed-data.json's "files" section already gave them —
//	otherwise almost all 200+ artists would show an empty portfolio. Ids are
//	deterministic, so re-seeding tops the same accounts up again instead of
//	piling up duplicates.
async function seedPortfolios(actors: Record<string, SeedActor>) {
	await ensureUploadDir();

	const owners = [...seedData.artists, ...seedData.hirers];
	let fileCount = 0;
	for (let i = 0; i < owners.length; i++) {
		const owner = actors[owners[i].email];
		//	Offsetting the starting index per account, rather than picking the
		//	same first two assets for everyone, is what makes portfolios look
		//	varied instead of identical.
		const picks = [
			PORTFOLIO_ASSETS[i % PORTFOLIO_ASSETS.length],
			PORTFOLIO_ASSETS[(i + 2) % PORTFOLIO_ASSETS.length],
		];

		for (const pick of picks) {
			const type = typeForMime(pick.mimeType);
			const extension = extFor(pick.mimeType);
			if (type === null || extension === null)
				throw new Error(`seedPortfolios: "${pick.mimeType}" is not in FILE_RULES`);

			const id = deterministicId(`portfolio:${owners[i].email}:${pick.asset}`);
			const location = `${id}.${extension}`;
			const source = join(ASSETS_DIR, pick.asset);
			const { size } = await stat(source);
			await copyFile(source, join(UPLOAD_DIR, location));

			await prisma.file.upsert({
				where: { id },
				update: {
					location,
					mimeType: pick.mimeType,
					sizeBytes: size,
					visibility: FileVisibility.public,
				},
				create: {
					id,
					ownerId: owner.id,
					type,
					mimeType: pick.mimeType,
					sizeBytes: size,
					originalName: pick.asset,
					location,
					visibility: FileVisibility.public,
				},
			});
			fileCount++;
		}
	}
	console.log(`OK      ${fileCount} portfolio files across ${owners.length} artists/hirers`);
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
	await seedPortfolios(actors);
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
