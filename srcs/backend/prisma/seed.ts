// Must run first: populates process.env from the repo-root .env before
// ../src/lib/prisma.js constructs the client. See docs/db_seeding.md.
import "../test/setup.js";

import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/password.js";
import { upsertArtistProfile, upsertHirerProfile } from "../src/modules/profile/profile.service.js";
import { createGig } from "../src/modules/gigs/gigs.service.js";
import { handleSwipe } from "../src/modules/swipes/swipe.service.js";
import { UserRole } from "../generated/prisma/client.js";
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

async function seedUser(
	input: { email: string; username: string; avatarUrl: string; role: UserRole },
	passwordHash: string,
) {
	return await prisma.user.upsert({
		where: { email: input.email },
		update: { username: input.username, avatarUrl: input.avatarUrl, role: input.role },
		create: { ...input, passwordHash },
	});
}

async function seedPeople(passwordHash: string) {
	await seedUser({ ...seedData.admin, role: UserRole.admin }, passwordHash);

	const actors: Record<string, SeedActor> = {};

	for (const artist of seedData.artists) {
		const user = await seedUser(
			{
				email: artist.email,
				username: artist.username,
				avatarUrl: artist.avatarUrl,
				role: UserRole.artist,
			},
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
			{
				email: hirer.email,
				username: hirer.username,
				avatarUrl: hirer.avatarUrl,
				role: UserRole.hirer,
			},
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
