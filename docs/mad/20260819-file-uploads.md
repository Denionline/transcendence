---
status: "proposed"
date: 2026-08-19
decision-makers: abessa-m
consulted: {carlaugu, dximenes, leoaguia}
informed: {carlaugu, dximenes, leoaguia}
---

# File uploads on local disk, read access via short-lived signed URLs

## Context and Problem Statement

The *File upload/management system* minor module requires artists to attach images,
audio and video to their profile, with client- and server-side validation, secure
storage with access control, preview where applicable, upload progress, and deletion
(issue #35). `schema.prisma` already carried an unused `File` model — `ownerId`, `type`,
`location` — but nothing wrote to it, and it recorded neither the file's real MIME type,
its size, nor who is allowed to read it.

The hard part is not storing bytes. It is that a browser rendering
`<img src="/api/files/…">` issues a bare GET: it cannot attach an `Authorization`
header, and this project deliberately keeps the access token **in memory**
(`apiClient.ts`) with the refresh cookie scoped to `/api/auth`, so no cookie is sent
either. "Secure access control" and "previewable in a media element" therefore pull in
opposite directions, and every option below is really an answer to that tension.

A second constraint shapes the whole decision: the project is graded from a bare
`git clone` on a machine we have never seen, potentially without outbound internet,
by someone who cannot provision accounts or fill in secrets.

## Decision Drivers

* Must work from `git clone` → fill `.env` → `make up`, with no externally-provisioned
  account, bucket or credential — `.env.example` ships with empty values
* Must work with no outbound internet, as 42 lab machines may be behind a restrictive
  proxy during evaluation
* Audio and video are in scope, so HTTP **Range** requests are non-negotiable — without
  them `<video>` cannot seek and Safari refuses to play at all
* Access control must be defensible, not security-by-obscurity, while still working
  inside `<img>` / `<audio>` / `<video>`
* Reuse the existing conventions — `throwError`, the `{ error, message }` envelope,
  `requireAuth`, `rateLimit`, module folders — rather than bolting on a library
* Effort must stay proportionate: this is worth **one minor module point**

## Considered Options

Storage (where the bytes live):

* **A1** — local disk in a named Docker volume, metadata in Postgres
* **A2** — bytes in Postgres as a `Bytes` / `BYTEA` column
* **A3** — local disk, served by an Nginx sidecar via `X-Accel-Redirect`
* **A4** — external object storage (S3 / Cloudinary / Supabase)
* **A5** — self-hosted MinIO container, S3 API, no external account
* **A6** — base64 data URIs in an existing `String` column

Browser access (how an `<img>` proves it may read):

* **B1** — public-by-obscurity: unauthenticated route, security from UUID entropy
* **B2** — short-lived HMAC-signed URLs, minted by an authenticated endpoint
* **B3** — a dedicated httpOnly media cookie scoped to `/api/files`
* **B4** — `fetch` the blob with the auth header, render via `URL.createObjectURL`
* **B5** — widen the access token into a site-wide cookie

## Decision Outcome

Chosen option: **A1 + B2**, with four layers of validation, an explicit
`ArtistProfile ↔ File` portfolio relation, and row-first-then-`unlink` deletes —
because it is the only combination that satisfies every hard driver at once: it needs
no account, no network, and no extra container, while still streaming with Range
support and authorising reads with a real, verifiable secret.

* Bytes live in `/app/uploads` inside the backend container, backed by a compose named
  volume; Postgres holds only metadata. The directory is `mkdir -p`'d by the app at boot,
  so a virgin clone works with nothing pre-created.
* Reads are served with **`res.sendFile()`**, not a hand-piped `createReadStream()`.
  This is load-bearing rather than stylistic: `sendFile` implements Range, `ETag` and
  `Last-Modified`, which is precisely what makes seeking work in `<video>` and `<audio>`.
* An authenticated `GET /api/files/:id` mints the read URL; the URL carries its own
  proof, so the unauthenticated `/raw` route needs no header:

  ```
  url = /api/files/:id/raw?exp=<unix>&sig=<hex>
  sig = HMAC-SHA256(`${fileId}.${exp}`, FILE_URL_SECRET)
  ```

  Authorisation happens when the URL is minted, not when it is used. Because the `/raw`
  route is deliberately unauthenticated, this is a **TTL-bounded bearer URL** rather
  than true viewer-binding: the signature proves only *when* the link was minted, not
  *who* uses it. A leaked URL is therefore usable only within a bounded window —
  `FILE_URL_TTL_SECONDS` is fixed at **1800** (30 minutes) — which keeps the leak
  window short while still leaving long enough for a media element to render. This is
  the same mechanism as an S3 presigned URL, implemented with `node:crypto`
  alongside the existing `src/lib/jwt.ts`.
* Validation is four layers, only the last of which is real security: a `zod` check and
  an `accept` attribute client-side (fast feedback), multer's `limits.fileSize` enforced
  **while streaming** so an oversized upload dies mid-flight, a MIME allow-list (never a
  deny-list), and magic-byte sniffing of the stored bytes. `Content-Type` and the file
  extension are attacker-controlled; without the sniff, a `.png` containing HTML is a
  stored-XSS primitive. SVG is excluded from the image list for the same reason — it is
  executable XML.
* The client filename is never a path component: files are stored as
  `<uuid>.<ext-from-sniffed-mime>` with `originalName` kept in the database for display,
  and the resolved path is asserted to remain inside `UPLOAD_DIR`.
* Responses always carry `X-Content-Type-Options: nosniff` and the **stored** MIME, and
  anything not previewable is sent `Content-Disposition: attachment`. The stored MIME is
  returned explicitly (via `Content-Type`) rather than trusting `res.sendFile`'s
  extension-derived guess, so the sniffed database value stays authoritative.
* Files reach a profile through an explicit `ArtistProfile.files File[]` relation rather
  than parsed markers in the bio text, so `GET /api/profile/:id` can embed ready-signed
  URLs and deletion is a clean cascade. `User.avatarUrl` deliberately stays a permissive
  `String?` so the seed's external `pravatar.cc` URLs keep rendering.
* The existing `File` model (`schema.prisma`, currently just `id`/`ownerId`/`type`/
  `location`/`createdAt`) is extended to record what it uploads: a `mimeType`, a `size`,
  an `originalName`, and an `ArtistProfile.files File[]` back-relation is added. This is
  a forward reference to a migration that does not exist yet — the model must be migrated
  before the module ships.
* Delete removes the database row first and unlinks afterwards, swallowing `ENOENT`.
  The reverse order leaves a row pointing at nothing — the failure a user actually sees —
  whereas this order's worst case is an orphaned file on disk that `make files-gc` sweeps.

Account deletion cleans up bytes in `DELETE /api/users/:id` (self or admin, per
`docs/api_endpoints.md`). `onDelete: Cascade` from `User` removes the `File` rows but
never the bytes, so the delete handler first reads each owned `File.location`, then
deletes the user (cascading the rows), then unlinks the bytes, swallowing `ENOENT`.
This reuses the delete-then-unlink ordering chosen for the files route, so a crash
mid-delete leaves at most an orphaned file for `make files-gc` to sweep, never a row
pointing at nothing.

### Rejected, and why

Recording these explicitly, because two of them are better engineering that this
project's constraints rule out:

* **A4 (S3 / Cloudinary) — rejected on the fresh-clone constraint, not on merit.** It
  would have solved browser access for free via presigned URLs. But it requires an
  account, a bucket, a region and two secrets that a grader cannot produce, and it makes
  the demo depend on outbound network access from a 42 lab machine. Free tiers also
  expire, so a project graded months later stops working. This is the production path we
  knowingly did not take.
* **A5 (MinIO) — rejected on effort-to-points ratio, not capability.** It gives S3
  semantics with no external account and would be the most impressive option, but it
  costs a fourth container, a heavy SDK and a second credential set to document, all for
  one minor module point.
* **A2 (bytes in Postgres) — rejected for audio and video.** It is genuinely atomic and
  would have been the right answer for images alone, but Prisma cannot stream `Bytes`:
  every read materialises the whole file in Node's heap, and Range would have to be
  hand-implemented in SQL.
* **B5 (site-wide cookie auth) — rejected on scope.** It is a cross-cutting   refactor of
  `modules/auth` and `apiClient.ts` that invalidates the documented token model and the
  existing auth tests. That is a different issue than #35.
* **B1 (obscurity) — rejected as a sole mechanism.** A leaked URL would be permanent,
  unrevocable public access.

### Consequences

* Good, because a grader needs nothing beyond `make up` — no account, no network, no
  fourth container.
* Good, because Range, `ETag` and caching come free from `res.sendFile`, so audio and
  video actually scrub.
* Good, because memory use is flat regardless of file size — nothing is buffered whole.
* Good, because nothing here is throwaway: if Nginx lands later for the HTTPS the subject
  requires, A1 becomes A3 by changing one response line to `X-Accel-Redirect`. The
  schema, the routes and the frontend are untouched.
* Neutral, because uploaded files are wiped by `make fclean` (`docker compose down -v`).
  Correct for a school project, but the app must therefore treat a missing file as `404`,
  never `500`.
* Bad, because the filesystem is not transactional with the database, so a crash at the
  wrong moment leaves an orphan. Mitigated by the write-then-insert / delete-then-unlink
  ordering and by `make files-gc`.
* Bad, because it does not survive horizontal scaling — two backend replicas would not
  share the volume. Irrelevant here: compose runs exactly one backend.
* Bad, because `FILE_URL_SECRET` is one more required variable; a teammate who pulls
  without updating `.env` gets a startup failure, since `env.ts` throws at import.
* Bad, because expiring URLs cannot be cached long — responses use
  `Cache-Control: private, max-age=<remaining ttl>`.

## Pros and Cons of the Options

Scored for *this* project, 5 = best. The comparison tables are retained in full as the
decision record, so the rationale behind each score survives.

| Criterion | A1 disk+volume | A2 in Postgres | A3 disk+Nginx | A4 S3 | A5 MinIO | A6 base64 |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| Works from a bare `git clone`, no accounts | 5 | 5 | 4 | 1 | 4 | 5 |
| Works with no internet at 42 | 5 | 5 | 5 | 1 | 5 | 5 |
| Streaming / Range (video & audio seeking) | 5 | 1 | 5 | 5 | 5 | 1 |
| Memory safety under load | 5 | 1 | 5 | 5 | 4 | 1 |
| Atomicity with the DB | 2 | 5 | 2 | 2 | 2 | 5 |
| Implementation effort (5 = least) | 4 | 5 | 2 | 3 | 2 | 5 |
| New dependencies / services | 5 | 5 | 2 | 3 | 2 | 5 |
| Satisfies "secure storage + access control" | 4 | 4 | 5 | 5 | 5 | 1 |
| Backup / portability | 3 | 5 | 3 | 5 | 4 | 4 |
| Production realism | 3 | 2 | 5 | 5 | 5 | 1 |
| **Total** | **41** | **38** | **38** | **35** | **38** | **33** |

| Criterion | B1 obscure URL | B2 signed URL | B3 media cookie | B4 blob fetch | B5 cookie auth |
|---|:--:|:--:|:--:|:--:|:--:|
| Works in `<img>` / `<audio>` / `<video>` | 5 | 5 | 5 | 3 | 5 |
| Preserves Range / seeking | 5 | 5 | 5 | 1 | 5 |
| Real access control | 1 | 5 | 4 | 5 | 4 |
| Revocable / bounded leakage | 1 | 5 | 3 | 5 | 3 |
| Frontend change required | 5 | 4 | 5 | 3 | 1 |
| Backend change required | 5 | 3 | 4 | 5 | 2 |
| Consistent with the documented auth model | 3 | 5 | 3 | 5 | 1 |
| **Total** | **25** | **32** | **29** | **27** | **21** |

### A1 — local disk in a named Docker volume

* Good, because it needs zero new infrastructure and zero credentials, and works offline.
* Good, because reads and writes stream, so memory is flat regardless of file size.
* Good, because `res.sendFile` supplies Range, `ETag` and `Last-Modified` for free.
* Good, because it keeps `pg_dump` small — bytes and rows stay separate.
* Neutral, because files vanish on `make fclean`; documented rather than fixed.
* Bad, because the filesystem is not transactional with the database.
* Bad, because it assumes a single backend instance.

### B2 — short-lived HMAC-signed URLs

* Good, because it works in every media element while preserving Range and caching.
* Good, because links expire and are bound to a viewer, so leakage is bounded.
* Good, because it is the same idea as S3 presigning — a real, defensible pattern that
  extends the existing JWT work rather than inventing something local.
* Neutral, because the frontend needs the metadata before it can render; in practice the
  parent payload (the artist profile) embeds already-signed URLs, so the extra
  round-trip disappears.
* Bad, because it adds a secret to `.env` and complicates browser caching.

## Confirmation

`srcs/backend/test/files.test.ts` is the fitness function. It must cover: happy-path
upload; oversize rejection (`413`); wrong magic bytes (`415`); disallowed type (`415`);
`/raw` with no signature, an expired signature and a tampered signature (all `401`);
another user's private file (`404`, not `403`, so ids are not enumerable); delete by a
non-owner (`403`); delete by the owner (`204`, then `404`); and a Range request
returning `206` with a correct `Content-Range`.

Manually, on a fresh machine: `git clone` → `.env` → `make up` → upload, preview and
delete an image, an audio file and a video **with the network disabled**, then
`make fclean && make up` and confirm the app still starts and 404s cleanly.

## More Information

* Issue #35; milestone M5 — Public API + Security + Search + Uploads.
* The five endpoints (`POST /api/files`, `GET /api/files`, `GET /api/files/:id`,
  `GET /api/files/:id/raw`, `DELETE /api/files/:id`) are documented in
  `docs/api_endpoints.md` and also feed the *Public API* major module.
* **Re-visit if Nginx/HTTPS lands.** The subject requires HTTPS for all external
  connections, which compose does not do today. A reverse proxy is the natural place for
  it, and once one exists, A3 becomes nearly free: the `/raw` route stops calling
  `sendFile` and returns an `X-Accel-Redirect` header instead.
