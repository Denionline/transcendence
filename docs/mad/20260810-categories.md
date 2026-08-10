---
status: "accepted"
date: 2026-08-10
decision-makers: abessa-m
consulted: {team members}
informed: {team members}
---

# Categories as a lookup table with join tables

## Context and Problem Statement

Categories are the mechanism that decides who can match whom. Until now they were a
single free-text `String` column repeated in three models — `ArtistProfile.category`,
`HirerProfile.category` and `Gig.category` — and swipe eligibility was decided by the
raw comparison `profile.category !== gigCategory` in `swipe.service.ts`. That comparison
is case- and whitespace-sensitive, and there was no backend validation of the values
written to those columns, so `"Muralist"`, `"muralist"` and `"Muralist "` were three
different categories that silently never matched each other.

The single column also contradicts the product vision, which has described artists in
terms of plural *"tags (genre, skills)"* since before the schema existed
(`docs/product_vision.md`). Issue #91 asks for the backend half of this — an artist must
be able to hold **many** categories while a gig holds **exactly one** — and issue #80
asks for the frontend half, explicitly requiring that existing string values survive the
migration. How should categories be modelled so that matching is correct, the vocabulary
is controlled, and an artist can hold several?

## Decision Drivers

* Correctness of matching — identity comparison rather than string equality
* Multi-valued categories for profiles, single-valued for gigs
* A single source of truth for the vocabulary, serveable to the frontend
* Referential integrity enforced by the database, not by convention
* No data loss for values already stored in the three `String` columns
* Ability to rename a category without breaking existing matches

## Considered Options

* Status quo — keep the single `String`
* Prisma `enum Category`
* `String[]` scalar list on the profiles with a GIN index
* Join table holding free-text category strings, with no lookup table
* `Category` lookup table + join tables + `Gig.categoryId` foreign key

## Decision Outcome

Chosen option: "`Category` lookup table + join tables + `Gig.categoryId` foreign key",
because it is the only option that resolves every driver at once. It replaces string
equality with foreign-key identity — which is the actual defect fix — while the two join
tables give artists and hirers many categories and the non-null `Gig.categoryId` column
expresses "a gig must have exactly one" as a database constraint rather than a
convention. The other options each solve the visible feature while leaving the
correctness problem, the vocabulary drift, or both in place.

The shape:

```prisma
model Category {
  id    String @id @default(uuid())
  slug  String @unique   // "muralist" — normalized matching key
  label String           // "Muralist" — display string
}

model ArtistCategory {
  artistProfileId String
  categoryId      String
  @@id([artistProfileId, categoryId])
}
// HirerCategory is the same shape against HirerProfile

model Gig {
  categoryId String   // NOT NULL — exactly one
}
```

Four details carry the decision:

* **Composite primary key** `@@id([artistProfileId, categoryId])` makes duplicates
  physically impossible — no application-level deduplication is needed.
* **`onDelete: Cascade` on the profile side** matches the convention established by
  `20260725134217_user_delete_cascade`, where every `User` relation cascades.
* **`onDelete: Restrict` on the category side** means a category that is in use cannot
  be deleted — an integrity rule a `String` column cannot express.
* **`slug` unique + `label` display** separates the stable matching key from the
  presentation string, so renaming *"Muralist"* to *"Mural artist"* is a one-row
  `UPDATE` that breaks no existing match. The slug is `lower(trim(label))` with runs of
  whitespace collapsed to hyphens — `"3D animator"` → `"3d-animator"` — so it is
  URL-safe, and every write normalizes its input the same way before looking a category
  up. That is why a caller may send either the slug or the label.

`GET /api/categories` ships with this decision rather than after it. Without a
server-owned vocabulary the frontend simply hardcodes a different list and the drift
returns; the endpoint is what allows `CATEGORIES`, `TAGS` and `DISCIPLINES` — three
unsynchronized lists that existed in the frontend — to collapse into one.

### Consequences

* Good, because matching is now a foreign-key comparison, so case and whitespace
  variants can no longer split a category in two.
* Good, because an artist listing three categories sees gigs from all three; the
  discovery feed widens, which is the user-visible payoff.
* Good, because the vocabulary has one owner (the database) exposed through one
  endpoint, replacing a frontend constant whose own comment asked readers to "keep it
  in sync".
* Good, because a category can be renamed without touching any row that references it.
* Bad, because every category-filtered query gains a join, and the four existing B-tree
  indexes on the old `category` columns had to be dropped and recreated against
  `categoryId`.
* Bad, because the migration had to be written by hand — `prisma migrate dev` generates
  a destructive drop-and-recreate that would have discarded existing values.
* Bad, because `HirerProfile` categories ship unused: no endpoint reads them today. They
  are modelled now for symmetry with artists, on the assumption that hirer-side
  discovery will need them.
* Neutral, because `README.md`'s previous statement that there is "no separate
  tags/genres table" is reversed by this decision and was updated accordingly.

### Confirmation

* The migration `20260810120000_categories` backfills from the three `String` columns
  via `ON CONFLICT (slug) DO NOTHING`, so no pre-existing value is lost and case
  variants collapse onto one row. It is idempotent, which CI depends on since
  `prisma migrate deploy` runs against a fresh Postgres.
* `test/swipes.test.ts` and `test/profile.test.ts` were written **before** the migration
  and run green against the old string schema first (35 of 38 passing), establishing a
  baseline. They cover mutual-like → match, `CATEGORY_MISMATCH` on a non-overlapping
  category, `ARTIST_UNAVAILABLE`, the `SWIPE_EXISTS` duplicate guard, and an artist with
  multiple categories seeing gigs from each. The behavioural assertions survived the
  migration untouched; what changed is `test/helpers/categories.ts` — the deliberate
  single seam that knows how categories are stored — and the profile request bodies,
  which now send `categories: string[]` against a controlled vocabulary.
* Writing them first paid for itself immediately: two of the three baseline failures were
  not the missing feature but a **pre-existing 500**. `upsert` validates its `create`
  branch even when the row exists, and an `as` cast hid the missing required `category`,
  so `PATCH /api/profile/me` with only `{ bio }` or `{ availability }` crashed on `main`.
  The rewrite branches explicitly on create-vs-update instead of casting. Tests written
  after the migration would have encoded that 500 as expected behaviour.
* `test/categories.test.ts` covers the new endpoint; `npm test`, `npm run lint` and
  `npx tsc --noEmit` all pass.

## Pros and Cons of the Options

### `Category` lookup table + join tables + `Gig.categoryId` foreign key

A lookup table for the vocabulary, one join table per profile type, one foreign key on
`Gig`.

* Good, because matching becomes identity comparison and set intersection.
* Good, because the database enforces which values exist — an unknown category is a 404,
  not a silently-created ghost row.
* Good, because the composite primary key deduplicates for free.
* Good, because `slug`/`label` separation makes renames safe.
* Good, because one query (`GET /api/categories`) can serve the whole vocabulary.
* Neutral, because it adds three models to a schema that had eleven.
* Bad, because it is the most migration work of the five options.
* Bad, because category-filtered reads now join.

### Status quo — keep the single `String`

* Good, because it costs nothing.
* Bad, because it permanently blocks the multi-category requirement in #91 and #80.
* Bad, because it leaves matching dependent on two users typing identical text.
* Bad, because it has no vocabulary control at all.

### Prisma `enum Category`

* Good, because the database enforces the vocabulary.
* Good, because it has the cheapest read path — no join.
* Bad, because adding a category becomes a schema migration, so no non-technical
  teammate can ever add one.
* Bad, because multi-valued requires `Category[]`, which Postgres indexes only via GIN
  and Prisma models awkwardly.
* Bad, because renaming a value rewrites every row.

### `String[]` scalar list on the profiles with a GIN index

* Good, because it delivers multi-valued artists in roughly a quarter of the work.
* Good, because `has`/`hasSome` filters read cleanly.
* Neutral, because it can be migrated to the chosen option later.
* Bad, because there is no referential integrity and no rename path.
* Bad, because typos still create ghost categories — it multiplies the drift problem
  rather than solving it.

### Join table holding free-text category strings, with no lookup table

* Good, because it solves multi-valued with cheap writes.
* Neutral, because it normalizes the storage shape correctly.
* Bad, because without a lookup table the vocabulary is still uncontrolled — the same
  drift problem, merely normalized.

## More Information

The full analysis this decision summarises — current-state audit, a comparison against
the project documentation, blast radius across backend, frontend, docs and tests, and
the step-by-step migration sketch — was written up separately as `REPORT.md` at the repo
root. That file is matched by a global gitignore rule for root-level markdown and is
therefore local-only, which is precisely why this ADR exists.

Related: issue #91 (backend, this change) and issue #80 (frontend profile edit, migrate
the category field to tags). This decision should be revisited if the vocabulary grows
large enough to need hierarchy (categories with parents) or per-artist proficiency
levels, neither of which the current shape supports.
