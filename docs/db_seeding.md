# Database Seeding

`make seed` populates the database with a demo cast for manual testing:
6 categories, an admin, 300 artists (50 per category), 10 hirers posting
30 gigs, plus swipes/matches/chat threads.

```bash
make seed
```

Every seeded account logs in with the password printed at the end of the
run (e.g. `admin@artmate.dev`, the seeded admin, uses it too).

## How it works

- [`srcs/backend/prisma/seed-data.json`](../srcs/backend/prisma/seed-data.json)
  holds the actual content — who exists, what they post, who swipes on
  what — so the cast can be edited without touching script logic.
- [`srcs/backend/prisma/seed.ts`](../srcs/backend/prisma/seed.ts) reuses the
  app's own service layer (`upsertArtistProfile`, `createGig`,
  `handleSwipe`) instead of writing raw Prisma inserts, so seeded data goes
  through the same validation and business rules real requests do.
- The `make seed` target applies pending migrations before running the
  script, so it works from a cold `make up` instead of failing with a raw
  "relation does not exist" error.

## Idempotency

Safe to re-run:

- Users and their profiles are upserted in place (stable ids).
- Gigs — and everything that hangs off them (swipes, matches, chat
  messages) — have no natural business key, so they're deleted and rebuilt
  from scratch on every run instead of upserted. Deleting a gig cascades to
  its swipes, matches, and match chat threads, which is what makes this
  safe.

CI runs the seed step twice back to back to guard against a regression in
this behavior.

## Checking the result

```bash
make dbstats
```

Prints row counts per table (users by role, gigs, swipes, matches, chats,
categories) for a quick sanity check after seeding.
