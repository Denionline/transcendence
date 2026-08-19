import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { open, stat } from "node:fs/promises";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { extFor, maxBytesFor, typeForMime } from "../src/lib/file-limits.js";
import seedData from "../prisma/seed-data.json" with { type: "json" };

//	These tests deliberately do not call seedFiles(). Its File ids are
//	hardcoded — that is the idempotency mechanism — so running it here would
//	upsert over the real seeded rows in the shared development database.
//	What is checked instead is the contract seedFiles() depends on and
//	cannot check for itself: the fixtures exist, they are what they claim to
//	be, and every row it is about to write is one the API would accept.

const ASSETS_DIR = fileURLToPath(new URL("../prisma/seed-assets/", import.meta.url));

//	Just the leading bytes every decoder uses to recognise the container —
//	enough to catch a fixture regenerated, renamed or replaced.
const SIGNATURES: Record<string, { offset: number; bytes: Buffer[] }> = {
	"image/jpeg": { offset: 0, bytes: [Buffer.from([0xff, 0xd8, 0xff])] },
	"image/png": { offset: 0, bytes: [Buffer.from([0x89, 0x50, 0x4e, 0x47])] },
	"image/webp": { offset: 8, bytes: [Buffer.from("WEBP")] },
	//	Either an ID3 tag or a bare frame sync; both are legal starts for an MP3.
	"audio/mpeg": { offset: 0, bytes: [Buffer.from("ID3"), Buffer.from([0xff, 0xfb])] },
	"audio/mp4": { offset: 4, bytes: [Buffer.from("ftyp")] },
	"video/mp4": { offset: 4, bytes: [Buffer.from("ftyp")] },
};

async function head(path: string, length: number): Promise<Buffer> {
	const handle = await open(path, "r");
	try {
		const buffer = Buffer.alloc(length);
		const { bytesRead } = await handle.read(buffer, 0, length, 0);
		return buffer.subarray(0, bytesRead);
	} finally {
		await handle.close();
	}
}

const seededEmails = new Set([
	seedData.admin.email,
	...seedData.artists.map((artist) => artist.email),
	...seedData.hirers.map((hirer) => hirer.email),
]);

test("every fixture seed-data.json names is present and non-empty", async () => {
	for (const entry of seedData.files) {
		//	A fixture in the working tree but not in git, or not in the Docker
		//	build context: `make seed` dies on a fresh clone.
		const { size } = await stat(join(ASSETS_DIR, entry.asset));
		assert.ok(size > 0, `${entry.asset} is empty`);
	}
});

test("every fixture's bytes match the MIME type it is seeded as", async () => {
	for (const entry of seedData.files) {
		const signature = SIGNATURES[entry.mimeType];
		//	A fixture in a format nobody wrote a check for. Add the signature
		//	rather than deleting this assertion.
		assert.ok(signature, `no signature known for "${entry.mimeType}"`);

		const bytes = await head(join(ASSETS_DIR, entry.asset), signature.offset + 8);
		const matched = signature.bytes.some(
			(magic) =>
				bytes.subarray(signature.offset, signature.offset + magic.length).compare(magic) === 0,
		);
		//	Nothing in the upload path sniffs content, so the seed is otherwise
		//	free to plant a mislabelled file.
		assert.ok(matched, `${entry.asset} does not look like ${entry.mimeType}`);
	}
});

test("every seeded file is one the API itself would have accepted", () => {
	for (const entry of seedData.files) {
		//	Mirrors seedFiles()'s own throw, but before it has written any rows.
		assert.ok(typeForMime(entry.mimeType), `"${entry.mimeType}" is not in FILE_RULES`);
		assert.ok(extFor(entry.mimeType), `"${entry.mimeType}" has no extension in FILE_RULES`);
		assert.ok(
			["public", "private"].includes(entry.visibility),
			`${entry.asset} has visibility "${entry.visibility}", which is not a FileVisibility`,
		);
	}
});

test("no fixture exceeds the per-type cap the upload route enforces", async () => {
	for (const entry of seedData.files) {
		const type = typeForMime(entry.mimeType);
		assert.ok(type);
		const cap = maxBytesFor(type);
		const { size } = await stat(join(ASSETS_DIR, entry.asset));
		//	A fixture over the cap would seed fine and then be impossible to
		//	re-upload through the UI.
		assert.ok(size <= cap, `${entry.asset} is ${size} bytes, over the ${cap} cap for ${type}`);
	}
});

test("every file owner is an account the seed creates", () => {
	for (const entry of seedData.files)
		assert.ok(seededEmails.has(entry.owner), `unknown file owner "${entry.owner}"`);
});

test("seeded file ids are unique", () => {
	const ids = seedData.files.map((entry) => entry.id);
	//	A copy-pasted id would make one fixture silently overwrite another, and
	//	the seed would still report the full count.
	assert.equal(new Set(ids).size, ids.length, "duplicate id in seed-data.json files");
});

test("the avatar pool is not empty", () => {
	//	nextAvatarUrl() does `% avatarFiles.length`. With no avatars that is
	//	NaN, and every seeded user gets `undefined` as an avatar id.
	const avatars = seedData.files.filter((entry) => entry.use === "avatar");
	assert.ok(avatars.length > 0, "seed-data.json has no avatar files");
});

test("no fixture ships without being seeded", () => {
	//	An asset nothing references is dead weight in the image and in git.
	//	`generate.py` and the README are the two deliberate exceptions.
	const referenced = new Set(seedData.files.map((entry) => entry.asset));
	const orphans = readdirSync(ASSETS_DIR).filter(
		(name) => name !== "generate.py" && name !== "README.md" && !referenced.has(name),
	);
	assert.deepEqual(orphans, [], "unreferenced files in prisma/seed-assets/");
});
