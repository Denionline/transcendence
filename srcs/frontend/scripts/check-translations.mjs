#!/usr/bin/env node
// Compares every locale file against en.json (the reference) and fails if the
// key sets don't match exactly.
//
// Why this exists: i18next silently falls back to English for a missing key,
// or renders the raw key path when there is no fallback either. Both look fine
// in a quick click-through and only show up in front of a user. A missing key
// is a bug, so it should break the build, not wait to be noticed.
//
// Run with: node scripts/check-translations.mjs

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const LOCALES_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "i18n", "locales");
const REFERENCE = "en";

/** Flattens {a: {b: "x"}} into ["a.b"] so nested shapes can be compared as sets. */
function collectKeys(value, prefix = "") {
	if (typeof value !== "object" || value === null) return [prefix];
	return Object.entries(value).flatMap(([key, child]) =>
		collectKeys(child, prefix ? `${prefix}.${key}` : key),
	);
}

function loadLocale(code) {
	return JSON.parse(readFileSync(join(LOCALES_DIR, `${code}.json`), "utf8"));
}

const codes = readdirSync(LOCALES_DIR)
	.filter((file) => file.endsWith(".json"))
	.map((file) => file.replace(/\.json$/, ""));

if (!codes.includes(REFERENCE)) {
	console.error(`Reference locale ${REFERENCE}.json not found in ${LOCALES_DIR}`);
	process.exit(1);
}

const referenceKeys = new Set(collectKeys(loadLocale(REFERENCE)));
let failed = false;

for (const code of codes.filter((c) => c !== REFERENCE)) {
	const keys = new Set(collectKeys(loadLocale(code)));

	const missing = [...referenceKeys].filter((key) => !keys.has(key));
	const extra = [...keys].filter((key) => !referenceKeys.has(key));

	if (missing.length === 0 && extra.length === 0) {
		console.log(`✓ ${code}: ${keys.size} keys, matches ${REFERENCE}`);
		continue;
	}

	failed = true;
	console.error(`✗ ${code}:`);
	// "missing" is the one that reaches users; "extra" is usually a leftover
	// from a key that was renamed in en.json but not here.
	for (const key of missing) console.error(`    missing: ${key}`);
	for (const key of extra) console.error(`    not in ${REFERENCE}: ${key}`);
}

if (failed) {
	console.error("\nTranslation keys are out of sync.");
	process.exit(1);
}

console.log(`\nAll ${codes.length} locales in sync (${referenceKeys.size} keys).`);