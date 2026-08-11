import "./env.js";

import { faker } from "@faker-js/faker";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/password.js";
import { toSlug } from "../src/modules/categories/categories.service.js";
import { GigStatus, UserRole } from "../generated/prisma/client.js";

// A fixed literal seed is what makes every run — on any machine, at any
// time — produce the exact same dataset: @faker-js/faker is a pure,
// versioned PRNG, so the same seed plus the same sequence of calls always
// yields the same output. Every random choice in this file must go through
// `faker`, never `Math.random()` or anything keyed off the clock.
const RNG_SEED = 101010;

// A domain no real registration or hand-created test user would plausibly
// use. This is the entire mechanism that makes `make seed` safe to re-run:
// only rows under this domain are ever deleted, so anything a developer
// created by hand is structurally invisible to that query and survives.
const SEED_EMAIL_DOMAIN = "seed.artmate.test";

const ARTIST_COUNT = 500;
const HIRER_COUNT = 10;
const GIG_COUNT = 30;
const BATCH_SIZE = 25;

// bcrypt (see lib/password.ts) is deliberately slow, so every seeded
// artist/hirer shares one pre-hashed password instead of hashing per user.
const SHARED_PASSWORD = "Seed!Demo225";
const ADMIN_PASSWORD = "Seed!225";

// A fixed subset of the 25 categories migration `20260810120000_categories`
// seeds into every fresh database. Order matters for determinism: position
// N here always maps to the same category on every run, regardless of what
// order Postgres happens to return rows in — see resolveCategoryPool below.
const CATEGORY_POOL_LABELS = [
	"Trumpeter",
	"Illustrator",
	"Photographer",
	"Muralist",
	"Sculptor",
	"Graphic designer",
	"Tattoo artist",
	"Painter",
	"Videographer",
	"Motion designer",
];

interface SeedCategory {
	id: string;
	label: string;
}

// Most of these 10 labels are already among the 25 the migration seeds;
// any that aren't (e.g. one outside that starting vocabulary) are created
// here, the same way an admin adding a category at runtime would — see
// categories.service.ts and test/helpers/categories.ts, which upsert on
// `slug` for the same reason: idempotent, and safe whether or not the row
// already exists.
async function resolveCategoryPool(): Promise<SeedCategory[]> {
	const categories: SeedCategory[] = [];
	for (const label of CATEGORY_POOL_LABELS) {
		const category = await prisma.category.upsert({
			where: { slug: toSlug(label) },
			update: {},
			create: { slug: toSlug(label), label },
			select: { id: true, label: true },
		});
		categories.push(category);
	}
	return categories;
}

async function wipeSeedData(): Promise<number> {
	const { count } = await prisma.user.deleteMany({
		where: { email: { endsWith: `@${SEED_EMAIL_DOMAIN}` } },
	});
	return count;
}

function randomLocation(): string {
	return `${faker.location.city()}, ${faker.location.country()}`;
}

interface ArtistSeed {
	email: string;
	username: string;
	bio: string;
	location: string;
	availability: boolean;
	categoryIds: string[];
}

function buildArtists(categoryPool: SeedCategory[]): ArtistSeed[] {
	const artists: ArtistSeed[] = [];
	for (let i = 1; i <= ARTIST_COUNT; i++) {
		const categories = faker.helpers.arrayElements(categoryPool, { min: 1, max: 3 });
		artists.push({
			email: `artist${String(i).padStart(3, "0")}@${SEED_EMAIL_DOMAIN}`,
			username: faker.person.fullName(),
			bio: faker.lorem.sentences(2),
			location: randomLocation(),
			availability: faker.datatype.boolean({ probability: 0.8 }),
			categoryIds: categories.map((category) => category.id),
		});
	}
	return artists;
}

interface HirerSeed {
	email: string;
	username: string;
	organizationName: string;
	bio: string;
	location: string;
	availability: boolean;
}

function buildHirers(): HirerSeed[] {
	const hirers: HirerSeed[] = [];
	for (let i = 1; i <= HIRER_COUNT; i++) {
		hirers.push({
			email: `hirer${String(i).padStart(2, "0")}@${SEED_EMAIL_DOMAIN}`,
			username: faker.person.fullName(),
			organizationName: faker.company.name(),
			bio: faker.lorem.sentences(2),
			location: randomLocation(),
			availability: faker.datatype.boolean({ probability: 0.8 }),
		});
	}
	return hirers;
}

interface GigSeed {
	hirerIndex: number;
	title: string;
	description: string;
	categoryId: string;
	location: string;
	rate: number;
	status: GigStatus;
}

function buildGigs(categoryPool: SeedCategory[]): GigSeed[] {
	const gigs: GigSeed[] = [];
	for (let i = 0; i < GIG_COUNT; i++) {
		const category = faker.helpers.arrayElement(categoryPool);
		gigs.push({
			hirerIndex: faker.number.int({ min: 0, max: HIRER_COUNT - 1 }),
			title: `${category.label} for ${faker.company.name()}`,
			description: faker.lorem.paragraph(),
			categoryId: category.id,
			location: randomLocation(),
			rate: faker.number.int({ min: 50, max: 500 }),
			status: faker.datatype.boolean({ probability: 0.75 }) ? GigStatus.open : GigStatus.closed,
		});
	}
	return gigs;
}

// Runs `fn` over `items` in fixed-size concurrent batches. Safe to
// parallelize here because all the random content was already generated
// synchronously in the build* functions above — batching only affects write
// timing, never which artist gets which name or categories.
async function inBatches<T>(items: T[], size: number, fn: (item: T) => Promise<unknown>) {
	for (let i = 0; i < items.length; i += size) {
		await Promise.all(items.slice(i, i + size).map(fn));
	}
}

async function main() {
	faker.seed(RNG_SEED);

	const categoryPool = await resolveCategoryPool();
	const removed = await wipeSeedData();
	if (removed > 0) console.log(`removed ${removed} previously seeded user(s)`);

	// Build every random value up front, synchronously, in one fixed order,
	// before any write fires — see the comment on inBatches.
	const artists = buildArtists(categoryPool);
	const hirers = buildHirers();
	const gigs = buildGigs(categoryPool);

	const [sharedPasswordHash, adminPasswordHash] = await Promise.all([
		hashPassword(SHARED_PASSWORD),
		hashPassword(ADMIN_PASSWORD),
	]);

	await prisma.user.create({
		data: {
			email: `admin@${SEED_EMAIL_DOMAIN}`,
			username: "Admin",
			passwordHash: adminPasswordHash,
			role: UserRole.admin,
		},
	});

	await inBatches(artists, BATCH_SIZE, (artist) =>
		prisma.user.create({
			data: {
				email: artist.email,
				username: artist.username,
				passwordHash: sharedPasswordHash,
				role: UserRole.artist,
				artistProfile: {
					create: {
						bio: artist.bio,
						location: artist.location,
						availability: artist.availability,
						categories: {
							create: artist.categoryIds.map((categoryId) => ({ categoryId })),
						},
					},
				},
			},
		}),
	);

	// Sequential, not batched: only 10 rows, and gigs below need their ids
	// back in the same order the hirers were generated in.
	const hirerUsers: { id: string }[] = [];
	for (const hirer of hirers) {
		const user = await prisma.user.create({
			data: {
				email: hirer.email,
				username: hirer.username,
				passwordHash: sharedPasswordHash,
				role: UserRole.hirer,
				hirerProfile: {
					create: {
						organizationName: hirer.organizationName,
						bio: hirer.bio,
						location: hirer.location,
						availability: hirer.availability,
					},
				},
			},
			select: { id: true },
		});
		hirerUsers.push(user);
	}

	for (const gig of gigs) {
		await prisma.gig.create({
			data: {
				hirerId: hirerUsers[gig.hirerIndex].id,
				title: gig.title,
				description: gig.description,
				categoryId: gig.categoryId,
				location: gig.location,
				rate: gig.rate,
				status: gig.status,
			},
		});
	}

	console.log("");
	console.log(
		`seeded ${artists.length} artists, ${hirers.length} hirers, ${gigs.length} gigs, 1 admin`,
	);
	console.log(`categories used: ${CATEGORY_POOL_LABELS.join(", ")}`);
	console.log(`admin login:  admin@${SEED_EMAIL_DOMAIN} / ${ADMIN_PASSWORD}`);
	console.log(`shared login: <any artistNNN or hirerNN>@${SEED_EMAIL_DOMAIN} / ${SHARED_PASSWORD}`);
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
