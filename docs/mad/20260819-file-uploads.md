---
status: "accepted"
date: 2026-08-19
decision-makers: abessa-m
consulted: {carlaugu, dximenes, leoaguia}
informed: {carlaugu, dximenes, leoaguia}
---

# File uploads on local disk, read access via unguessable permanent URLs

## Context and Problem Statement

The *File upload/management system* minor module (issue #35) requires artists to attach
images, audio and video to their profile, with validation, secure storage, preview,
upload progress and deletion. `schema.prisma` already carried an unused `File` model —
`ownerId`, `type`, `location` — but nothing wrote to it, and it recorded neither the
file's MIME type, its size, nor who may read it.

The hard part is not storing bytes. A browser rendering `<img src="/api/files/…">` issues
a bare GET: it cannot attach an `Authorization` header, and this project keeps the access
token **in memory** (`apiClient.ts`) with the refresh cookie scoped to `/api/auth`, so no
cookie is sent either. "Access control" and "previewable in a media element" pull in
opposite directions, and every option below is an answer to that tension. A second
constraint shapes everything: the project is graded from a bare `git clone` on a machine
we have never seen, possibly without internet, by someone who cannot provision accounts.

## Decision Drivers

* Must work from `git clone` → fill `.env` → `make up`, with no externally-provisioned
  account, bucket or credential — `.env.example` ships with empty values
* Must work with no outbound internet, as 42 lab machines may sit behind a proxy
* Audio and video are in scope, so HTTP **Range** is non-negotiable — without it
  `<video>` cannot seek and Safari refuses to play at all
* Must work inside `<img>` / `<audio>` / `<video>`, which cannot authenticate
* Effort must stay proportionate: this is worth **one minor module point**

## Considered Options

Storage: **A1** local disk in a named Docker volume · **A2** bytes in Postgres as
`BYTEA` · **A3** disk behind an Nginx sidecar (`X-Accel-Redirect`) · **A4** external
object storage (S3 / Cloudinary) · **A5** self-hosted MinIO · **A6** base64 data URIs.

Browser access: **B1** unguessable URL, no signature · **B2** short-lived HMAC-signed
URLs · **B3** a media cookie scoped to `/api/files` · **B4** `fetch` the blob and render
via `URL.createObjectURL` · **B5** widen the access token into a site-wide cookie.

## Decision Outcome

Chosen option: **A1 + B1**, with input validation, `visibility` doubling as the portfolio
flag, and row-first-then-`unlink` deletes. A1 is the only storage option satisfying every
hard driver at once. B1 is **not** the strongest access-control option — B2 is — and was
chosen anyway, for the reason recorded below.

* Bytes live in `/app/uploads` inside the backend container, backed by a compose named
  volume; Postgres holds only metadata. The directory is `mkdir -p`'d at boot, so a
  virgin clone works with nothing pre-created.
* Reads are served with **`res.sendFile()`**, never a hand-piped `createReadStream()`.
  This is load-bearing, not stylistic: `sendFile` implements Range, `ETag` and
  `Last-Modified`, which is exactly what makes seeking work in `<video>` and `<audio>`.
* A file's URL is `/api/files/<id>/raw` — derived from its id, permanent, and identical
  for every viewer. No signature, no expiry, no secret. The id is a UUIDv4, so the URL
  carries 122 bits of entropy and is not enumerable: **holding it is the permission.**
* `visibility` therefore governs **discovery, not retrieval**. It decides which ids
  `GET /api/files` and `GET /api/profile/:id` disclose, and those endpoints are where
  access control actually lives. `/raw` deliberately does not re-check it — a check there
  could only ever reject the owner's own `<img>` tag, which cannot authenticate.
* Validation is **input validation only**: a `zod` check and an `accept` attribute
  client-side (fast feedback), multer's `limits.fileSize` enforced *while streaming* so an
  oversized upload dies mid-flight, and a server-side allow-list (never a deny-list) over
  the declared `Content-Type` plus a per-type size cap. Issue #37 added a magic-byte check
  on top (`lib/file-signature.ts`), so a file whose head disagrees with its declared type
  is refused `415 FILE_CONTENT_MISMATCH` before anything is written.
* Two response headers remain mandatory rather than hardening, as the second line of
  defence behind that check: `X-Content-Type-Options: nosniff` and the **stored** MIME as
  `Content-Type` (never one re-derived from the extension). Together they mean a browser
  never parses a mislabelled payload as HTML. SVG is excluded from the allow-list for the
  same reason — it is the one format that is dangerous even when genuine.
* A file reaches an artist's profile by being `public`. `visibility` already carries that
  distinction, so there is no `ArtistProfile ↔ File` relation and no attach endpoint —
  and therefore no way to hang someone else's file off your own profile, because there is
  nothing to attach. The cost: a file cannot be public *and* off the portfolio. With the
  avatar on `User.avatarUrl`, that case does not exist today.
* The `File` model gains `mimeType`, `sizeBytes`, `originalName` and `visibility`
  (`private` | `public`, defaulting to `private`), plus `@@index([ownerId, visibility])`
  for the portfolio query. The client filename is never a path component: files are stored
  as `<uuid>.<ext>`, with `originalName` kept in the database for display.
* Delete removes the row first and unlinks afterwards, swallowing `ENOENT`. The reverse
  order leaves a row pointing at nothing — the failure a user actually sees — whereas this
  order's worst case is an orphaned file on a volume that `make fclean` wipes anyway.
  Account deletion follows the same order: read the owned locations, delete the user
  (cascading the rows), then unlink.
* Demo data ships as **tracked fixture files** under `srcs/backend/prisma/seed-assets/`,
  which `make seed` copies into the volume before writing the matching `File` rows. A1
  makes this necessary: seeding writes rows, and rows are not bytes. On a machine that has
  just cloned the repository the bytes can come from exactly three places — the volume
  (empty by definition), the network (excluded by the driver above), or the repository —
  so the repository is the only one left. Their ids are hardcoded in `seed-data.json`,
  which supplies the stable key a `File` otherwise lacks and is what makes re-seeding
  idempotent. Because the seed must reach `/app/uploads`, it runs **inside the backend
  container**: a host process cannot write into a named volume by path.

### Rejected, and why

* **B2 (short-lived signed URLs) — rejected on implementation cost, not on merit.** It
  scores higher than B1 on every access-control criterion below. Dropping it removed a
  `lib` file, a required `FILE_URL_SECRET` in `.env`, an expiry-retry path in the
  frontend and three tests, in exchange for accepting that a disclosed URL is permanent.
  For a portfolio an artist is publishing on purpose, that is a trade we took knowingly.
  It would not be defensible for private documents.
* **A4 (S3 / Cloudinary) — rejected on the fresh-clone constraint, not on merit.**
  Presigned URLs would have solved browser access for free, but it needs an account, a
  bucket and secrets a grader cannot produce, and it makes the demo depend on outbound
  network access. Free tiers also expire, so a project graded months later stops working.
* **A5 (MinIO) — rejected on effort-to-points ratio, not capability.** S3 semantics with
  no external account, but a fourth container, a heavy SDK and a second credential set to
  document, all for one minor module point.
* **A2 (bytes in Postgres) — rejected for audio and video.** Genuinely atomic, and the
  right answer for images alone, but Prisma cannot stream `Bytes`: every read materialises
  the whole file in Node's heap, and Range would have to be hand-implemented in SQL.
* **B5 (site-wide cookie auth) — rejected on scope.** A cross-cutting refactor of
  `modules/auth` and `apiClient.ts` that invalidates the documented token model and the
  existing auth tests. That is a different issue than #35.
* **Seeding by download, or by generating bytes at seed time — rejected.** Fetching demo
  media while seeding reintroduces exactly the network dependency the storage decision was
  made to avoid. Generating bytes inside `seedFiles()` keeps the repository small but puts
  an image encoder in the seed path and produces something nobody has looked at — and a
  demo of blank rectangles cannot demonstrate preview, seeking or the portfolio query, the
  three things the demo exists to show. Committing a small set of real files costs
  permanent repository weight and buys a demo that can actually be inspected.

  *What shipped splits that difference, and the distinction is worth being precise about:*
  the fixtures are **generated once at authoring time by a committed script**
  (`prisma/seed-assets/generate.py`, Pillow + ffmpeg) and the **output** is what is
  tracked. The seed itself only copies bytes. So the repository still carries real,
  inspectable files — 124 KB of them, well inside the 1 MB budget — while nothing in this
  project depends on a third party's media, licence or continued existence. Neither the
  seed nor the app ever runs the generator.
* **Bind-mounting the upload directory onto the host — rejected.** It would let the seed
  keep running host-side, but it puts container-owned files in the working tree and
  replaces the named volume the rest of this decision rests on. Running the seed inside
  the container instead costs one `Makefile` line.

### Consequences

* Good, because a grader needs nothing beyond `make up` — no account, no network, no
  fourth container, and **no new secret**: both new variables have safe defaults, so a
  teammate can pull this branch and run it unchanged.
* Good, because Range, `ETag` and caching come free from `res.sendFile`, so audio and
  video actually scrub.
* Good, because URLs are permanent and the bytes at a given id never change, so responses
  are served `immutable` and portfolio media caches properly.
* Good, because memory use is flat regardless of file size — nothing is buffered whole.
* Good, because nothing here is throwaway: if Nginx lands for the HTTPS the subject
  requires, A1 becomes A3 by changing one response line to `X-Accel-Redirect`.
* Good, because `make seed` now produces a demo that renders with the network off. It also
  retires the 311 `https://i.pravatar.cc` avatar URLs the seed carried, which had made the
  demo quietly dependent on outbound internet long before uploads existed. Those URLs are
  gone from `seed-data.json` entirely rather than replaced: `avatarUrl` is now *derived* —
  `seedUser()` assigns one of six seeded avatar files round-robin and builds the path with
  `fileUrl()` — so the URL shape lives in code and cannot rot in the data the day A3/Nginx
  moves it.
* Neutral, because uploads are wiped by `make fclean` (`docker compose down -v`). Correct
  for a school project, but the app must treat a missing file as `404`, never `500`. Only
  a *missing* one: `sendFile` reports an unsatisfiable Range, `EACCES` and `EISDIR` through
  the same callback, and answering `404` to those would let a broken volume pass for an
  unknown id. The route branches on the error rather than flattening it.
* Neutral, because `make seed` now requires `make up` first, having moved inside the
  container. It no longer needs the database port published, which is a small gain.
* Bad, because **a disclosed URL is permanent and unrevocable** — via `Referer`, proxy
  logs, browser history or a pasted link. Deleting the file is the only revocation.
* Bad, because a single listing endpoint that forgets its `visibility` filter publishes a
  private file outright. Under B2 the signature was a second gate; there is only one now,
  which is why it has its own test.
* Bad, because the magic-byte check reads only the head of the buffer: it establishes
  that a file is the container it claims to be, not that the rest of it is well-formed.
  The remaining risk is contained by `nosniff`, the stored MIME and the SVG exclusion,
  each asserted by a test so removing one fails the build.
* Bad, because the filesystem is not transactional with the database, so a crash at the
  wrong moment leaves an orphan. Mitigated by the write-then-insert / delete-then-unlink
  ordering.
* Bad, because it does not survive horizontal scaling. Irrelevant here: compose runs
  exactly one backend.
* Bad, because the fixture files are permanent repository weight — git keeps every blob it
  has ever seen, so an oversized demo video cannot be un-committed. Held under 1 MB total.
* Bad, because **nothing bounds total disk use**. There is no per-user or global quota:
  the only brake on uploads is a per-user rate limit of 20 per 15 minutes, which at the
  50 MB ceiling still permits roughly 1 GB per account per 15 minutes, indefinitely, and
  nothing reclaims space short of `make fclean`. This is an accepted trade rather than an
  oversight — a quota needs a policy (what happens at the limit, who raises it, whether
  deleting frees allowance) that a school project does not have, and `SUM(sizeBytes)
  WHERE ownerId` is one query in `createFile` whenever it does. `GET /:id/raw` carries a
  generous per-address rate limit so the unauthenticated read path is at least bounded,
  but that limits request *rate*, not stored bytes. The exposure is availability and
  disk, never confidentiality.
* Bad, because **seeded ids are public**: they are hardcoded in a file in this repository,
  so the entropy argument above describes uploaded files and not the demo rows. That is
  the right trade for content whose only purpose is to be looked at, but nobody should
  read "holding the URL is the permission" as covering every row in the table.

## Pros and Cons of the Options

### A1 — local disk in a named Docker volume

* Good, because it needs zero new infrastructure and zero credentials, and works offline.
* Good, because reads and writes stream, so memory is flat regardless of file size.
* Good, because `res.sendFile` supplies Range, `ETag` and `Last-Modified` for free.
* Neutral, because files vanish on `make fclean`; documented rather than fixed.
* Bad, because the filesystem is not transactional with the database.
* Bad, because it assumes a single backend instance.

### B1 — unguessable permanent URL

Scored for *this* project, 5 = best:

| Criterion | B1 | B2 | B3 | B4 | B5 |
|---|:--:|:--:|:--:|:--:|:--:|
| Works in `<img>` / `<audio>` / `<video>` | 5 | 5 | 5 | 3 | 5 |
| Preserves Range / seeking | 5 | 5 | 5 | 1 | 5 |
| Real access control | 1 | 5 | 4 | 5 | 4 |
| Revocable / bounded leakage | 1 | 4 | 3 | 5 | 3 |
| Frontend change required | 5 | 4 | 5 | 3 | 1 |
| Backend change required | 5 | 3 | 4 | 5 | 2 |
| Consistent with the documented auth model | 3 | 5 | 3 | 5 | 1 |
| **Total** | **25** | **31** | **29** | **27** | **21** |

**B2 wins this table and was still not chosen.** The table scores access control; the
decision also weighed implementation cost, which the table does not score. Recording the
mismatch rather than editing the scores is the point of keeping it.

* Good, because it is the least code of any option: no secret, no signing, no expiry, no
  retry path — the URL is a pure function of the id.
* Good, because permanent URLs cache, which matters most for video.
* Neutral, because 122 bits of UUIDv4 entropy make ids unguessable in practice; the
  weakness is disclosure, not brute force.
* Bad, because leakage is unbounded in time and cannot be revoked short of deletion.
* Bad, because it concentrates all access control in the listing endpoints.

## Confirmation

`srcs/backend/test/files.test.ts` is the fitness function. It must cover: happy-path
upload; oversize (`413`); a disallowed declared type such as `image/svg+xml` (`415`);
text sent as `image/png` refused `415`, and a genuine image served with
`Content-Type: image/png` **and** `nosniff`, asserted so nobody silently drops the header;
`GET /api/files/:id` for another user's private file → `404`, not `403`; **`GET
/api/files` as another user omits that file's id** — the single control protecting private
files; delete by a non-owner (`403`) and by the owner (`204`, then `404`); a Range
request returning `206` with a correct `Content-Range`; and the three ways reading the
bytes can fail — an out-of-bounds Range (`416`), a row whose file was deleted (`404`)
and a file present but unreadable (`500`), which must not collapse into one another.

Manually, on a fresh machine: `git clone` → `.env` → `make up` → upload, preview and
delete an image, an audio file and a video **with the network disabled**, then
`make fclean && make up` and confirm the app still starts and 404s cleanly.

The seed has its own check, on that same offline machine: `make seed` must leave every
avatar and every portfolio item rendering rather than broken, and running it a second time
must change no row count and no file count.

## More Information

* Issue #35; milestone M5 — Public API + Security + Search + Uploads.
* The five endpoints (`POST /api/files`, `GET /api/files`, `GET /api/files/:id`,
  `GET /api/files/:id/raw`, `DELETE /api/files/:id`) are documented in
  `docs/api_endpoints.md`, which states plainly that `/raw` is unauthenticated by design
  and that URLs never expire. They also feed the *Public API* major module.
* **Re-visit B1 → B2 if private files ever hold anything but portfolio media** — the
  trade above was made for work an artist is publishing deliberately.
* **Re-visit A1 → A3 if Nginx/HTTPS lands.** The subject requires HTTPS for external
  connections, which compose does not do today; once a reverse proxy exists, `/raw` stops
  calling `sendFile` and returns an `X-Accel-Redirect` header instead.
