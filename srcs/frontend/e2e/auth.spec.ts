import { test, expect } from "@playwright/test";
import { SEED_PASSWORD } from "./helpers.js";

test("user can register a new account", async ({ page }) => {
	// A fresh email per run — registration creates a real row in the database,
	// so reusing one email across runs would fail on the second run onward.
	const email = `e2e-${crypto.randomUUID()}@artmate.dev`;

	await page.goto("/register");
	await page.getByLabel("Name").fill("E2E Test User");
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(SEED_PASSWORD);
	await page.getByRole("button", { name: "Artist", exact: true }).click();
	await page.getByRole("button", { name: /Create account/i }).click();

	// New artists land on /opportunities (see defaultPathForRole in Router.tsx).
	await expect(page).toHaveURL(/\/opportunities/);
});

test("user can log in with valid credentials", async ({ page }) => {
	// Seeded account from srcs/backend/prisma/seed-data.json — stable across
	// runs because `npm run seed` (re)creates it deterministically. A
	// different account from helpers.ts's HIRER/ARTIST on purpose, so this
	// test doesn't depend on which accounts the match-related tests use.
	await page.goto("/login");
	await page.getByLabel("Email").fill("aria.tanaka@artmate.dev");
	await page.getByLabel("Password").fill(SEED_PASSWORD);
	await page.getByRole("button", { name: "Log in" }).click();

	// aria.tanaka is an "artist" -> redirected to /opportunities after login.
	await expect(page).toHaveURL(/\/opportunities/);
});
