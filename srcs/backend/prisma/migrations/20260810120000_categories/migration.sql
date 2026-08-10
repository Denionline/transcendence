-- Categories: from three free-text `category` columns to a lookup table plus
-- join tables. See docs/mad/20260810-categories.md.
--
-- Hand-written on purpose. `prisma migrate dev` generates a drop-and-recreate
-- for this change, which would discard every existing category value. The DDL
-- below is interleaved with backfill so nothing is lost, and every INSERT is
-- idempotent because CI runs `prisma migrate deploy` against a fresh database.

-- 1. The lookup table.
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- 2. Seed the vocabulary the frontend had hardcoded in
--    srcs/frontend/src/features/opportunities/constants.ts.
INSERT INTO "Category" ("id", "slug", "label")
SELECT gen_random_uuid(), lower(regexp_replace(trim(label), '\s+', '-', 'g')), trim(label)
FROM (VALUES
    ('3D animator'),
    ('Calligrapher'),
    ('Ceramicist'),
    ('Collage artist'),
    ('Comic artist'),
    ('Concept artist'),
    ('Fashion illustrator'),
    ('Graphic designer'),
    ('Illustrator'),
    ('Installation artist'),
    ('Jewelry designer'),
    ('Motion designer'),
    ('Muralist'),
    ('Painter'),
    ('Photographer'),
    ('Portrait painter'),
    ('Printmaker'),
    ('Puppet maker'),
    ('Sculptor'),
    ('Set designer'),
    ('Sound artist'),
    ('Street artist'),
    ('Tattoo artist'),
    ('Textile artist'),
    ('Videographer')
) AS seed(label)
ON CONFLICT ("slug") DO NOTHING;

-- 3. Rescue every value already stored in the three legacy columns. Case and
--    whitespace variants ("Muralist", "muralist ", "MURALIST") collapse onto a
--    single row here, which repairs matches that silently never fired before.
INSERT INTO "Category" ("id", "slug", "label")
SELECT DISTINCT ON (slug) gen_random_uuid(), slug, label
FROM (
    SELECT lower(regexp_replace(trim("category"), '\s+', '-', 'g')) AS slug, trim("category") AS label
    FROM "ArtistProfile"
    UNION ALL
    SELECT lower(regexp_replace(trim("category"), '\s+', '-', 'g')), trim("category")
    FROM "HirerProfile"
    UNION ALL
    SELECT lower(regexp_replace(trim("category"), '\s+', '-', 'g')), trim("category")
    FROM "Gig"
) AS legacy
WHERE slug <> ''
ON CONFLICT ("slug") DO NOTHING;

-- 4. Join tables. Composite primary keys make duplicates impossible.
CREATE TABLE "ArtistCategory" (
    "artistProfileId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "ArtistCategory_pkey" PRIMARY KEY ("artistProfileId","categoryId")
);

CREATE INDEX "ArtistCategory_categoryId_idx" ON "ArtistCategory"("categoryId");

CREATE TABLE "HirerCategory" (
    "hirerProfileId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "HirerCategory_pkey" PRIMARY KEY ("hirerProfileId","categoryId")
);

CREATE INDEX "HirerCategory_categoryId_idx" ON "HirerCategory"("categoryId");

ALTER TABLE "ArtistCategory" ADD CONSTRAINT "ArtistCategory_artistProfileId_fkey"
    FOREIGN KEY ("artistProfileId") REFERENCES "ArtistProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArtistCategory" ADD CONSTRAINT "ArtistCategory_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HirerCategory" ADD CONSTRAINT "HirerCategory_hirerProfileId_fkey"
    FOREIGN KEY ("hirerProfileId") REFERENCES "HirerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HirerCategory" ADD CONSTRAINT "HirerCategory_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. Backfill the join tables from the single legacy column.
INSERT INTO "ArtistCategory" ("artistProfileId", "categoryId")
SELECT p."id", c."id"
FROM "ArtistProfile" p
JOIN "Category" c ON c."slug" = lower(regexp_replace(trim(p."category"), '\s+', '-', 'g'))
ON CONFLICT DO NOTHING;

INSERT INTO "HirerCategory" ("hirerProfileId", "categoryId")
SELECT p."id", c."id"
FROM "HirerProfile" p
JOIN "Category" c ON c."slug" = lower(regexp_replace(trim(p."category"), '\s+', '-', 'g'))
ON CONFLICT DO NOTHING;

-- 6. Gig gains its FK. Added nullable, backfilled, then constrained — a gig
--    whose category was blank cannot exist, so SET NOT NULL is safe only after
--    the backfill has run.
ALTER TABLE "Gig" ADD COLUMN "categoryId" TEXT;

UPDATE "Gig" g
SET "categoryId" = c."id"
FROM "Category" c
WHERE c."slug" = lower(regexp_replace(trim(g."category"), '\s+', '-', 'g'));

ALTER TABLE "Gig" ALTER COLUMN "categoryId" SET NOT NULL;

ALTER TABLE "Gig" ADD CONSTRAINT "Gig_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 7. The old B-tree indexes are dead now that the columns are going.
DROP INDEX IF EXISTS "ArtistProfile_category_idx";
DROP INDEX IF EXISTS "ArtistProfile_category_availability_idx";
DROP INDEX IF EXISTS "Gig_status_category_idx";
DROP INDEX IF EXISTS "Gig_category_idx";

ALTER TABLE "ArtistProfile" DROP COLUMN "category";
ALTER TABLE "HirerProfile" DROP COLUMN "category";
ALTER TABLE "Gig" DROP COLUMN "category";

-- 8. Replacements for what step 7 dropped, now anchored on the FK.
CREATE INDEX "ArtistProfile_availability_idx" ON "ArtistProfile"("availability");
CREATE INDEX "Gig_status_categoryId_idx" ON "Gig"("status", "categoryId");
CREATE INDEX "Gig_categoryId_idx" ON "Gig"("categoryId");
