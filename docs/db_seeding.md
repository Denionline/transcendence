# Database Seeding

`make seed` populates the database with a demo cast for manual testing:
6 categories, an admin, 300 artists (50 per category), 10 hirers posting
30 gigs, plus swipes/matches/chat threads — and 11 real media files.

```bash
make up      # required: the seed runs inside the backend container
make seed
```

**`make seed` needs a running stack.** It used to run on the host and reach
Postgres through the published port; it now runs inside the `backend`
container, because it writes demo media into the uploads volume and a host
process cannot write into a named volume by path. The upside is that it no
longer needs the database port published, or `node_modules` on the host.

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
- The script loads the repo-root `.env` through
  [`src/lib/load-dotenv.ts`](../srcs/backend/src/lib/load-dotenv.ts), which is
  a no-op when that file is absent — the case both in CI and inside the
  container, where the environment is already populated. The same script
  therefore runs unchanged on either side.

## Demo media

`make seed` writes rows, and rows are not bytes. On a machine that has just
cloned this repository the bytes could come from the uploads volume (empty by
definition), from the network (excluded — the demo must work offline) or from
the repository. Only the last one is left, so the fixtures are tracked in git:

- [`srcs/backend/prisma/seed-assets/`](../srcs/backend/prisma/seed-assets/)
  holds three portfolio images, one audio clip, one short video and six
  avatars — about 150 KB in total, all **generated** by the `generate.py`
  next to them rather than downloaded. Keep the directory under 1 MB: git
  keeps every blob it has ever seen, so an oversized demo video cannot be
  un-committed.
- The `files` array in `seed-data.json` says who owns what. `seedFiles()`
  copies the bytes into `UPLOAD_DIR` first and upserts the `File` row second
  — the same order the upload endpoint uses, so an interrupted seed leaves an
  orphaned file rather than a row pointing at nothing.
- A fixture's `FileType` and stored extension are derived from
  [`file-limits.ts`](../srcs/backend/src/lib/file-limits.ts), so a fixture
  whose MIME is not in the allow-list **fails the seed loudly**. Nothing can
  be seeded that the API would have refused to accept.
- Avatars are not in the data. `seedUser()` assigns one of the six avatar
  files round-robin and builds the URL with `fileUrl()`, so the path shape
  lives in code. This replaced 311 `https://i.pravatar.cc/...` URLs, which
  had quietly made the demo depend on outbound internet — every avatar broke
  on a machine behind a proxy.
- **All six avatars are owned by `admin@artmate.dev`**, and every seeded user
  points at them. They belong to everyone and to no artist in particular, so
  the admin holds them for want of anywhere better. The coupling is worth
  knowing about while poking at the permissions module: `DELETE
  /api/users/:id` cascades to an account's `File` rows and unlinks the bytes,
  so **deleting the admin takes all 311 avatars with it**. Self-deletion is
  refused (`409 SELF_DELETE`), so it takes a second admin to do.

  Deliberately left as-is rather than moved to a dedicated "demo assets"
  account. That would only relocate the footgun — the assets account is just
  as deletable — while adding a phantom user to the very list an evaluator is
  clicking through. The two things that make it tolerable are real: `Avatar`
  falls back to the user's initials when the image 404s, so the demo
  degrades to placeholders rather than broken images, and `make seed` puts
  the rows and bytes back.

## Idempotency

Safe to re-run:

- Users and their profiles are upserted in place (stable ids).
- Gigs — and everything that hangs off them (swipes, matches, chat
  messages) — have no natural business key, so they're deleted and rebuilt
  from scratch on every run instead of upserted. Deleting a gig cascades to
  its swipes, matches, and match chat threads, which is what makes this
  safe.
- Files have no natural key either, so `seed-data.json` **hardcodes their
  ids**. That fixed id is the whole idempotency mechanism: re-running
  overwrites the same bytes and upserts the same row. It is also why a new
  fixture needs a hand-written UUIDv4 rather than a generated one — and why
  seeded ids, unlike uploaded ones, are public knowledge. See
  [the MAD](mad/20260819-file-uploads.md).

CI runs the seed step twice back to back to guard against a regression in
this behavior.

## Checking the result

```bash
make dbstats
```

Prints row counts per table (users by role, gigs, swipes, matches, chats,
categories) for a quick sanity check after seeding.
