# Artmate — API Endpoints

All protected endpoints require an `Authorization: Bearer <token>` header (JWT access token) except `/api/auth/*`.
The refresh token (also a JWT) is never exposed to JS — it travels only as an httpOnly cookie, scoped to `/api/auth`.
Errors always have the shape `{ "error": "CODE", "message": "..." }`.
`error` is a machine-readable code (see table below); `message` is human-readable.
Paginated lists accept `?page=1&pageSize=20` and return `{ items, page, pageSize, total }`.
`/api/search/*` returns a **superset** of that envelope, adding `totalPages` and `hasMore`; `/api/users` and `/api/gigs` still return the four-field version.

## Match flow (how it works)

Artmate uses a **gig-centric mutual swipe** model — every swipe and every match
is anchored to a `Gig` (posted by a hirer), not a direct artist↔hirer pairing:

1. An **artist** browses the discovery feed of open gigs and **swipes**
   like/skip directly on a gig (`POST /api/swipes`).
2. A **hirer** picks one of their own gigs, and reviews only the artists who
   already liked that gig — swiping like/skip on each candidate, per gig.
3. Each swipe is recorded once per (swiper, swiped, gig) combination —
   swiping the same target again for the same gig does not create a duplicate.
4. When both sides have swiped **like** on each other **for the same gig**, a
   `Match` is created automatically and **chat is unlocked** between the two users.
5. Messages only exist inside a match, so chat access is enforced by the
   URL structure itself (`/api/matches/:matchId/messages`).
6. A gig accepts exactly **one** match: the moment a `Match` is created, the gig
   itself is set to `status: "closed"` in the same transaction. There is no
   multi-hire flow — a hirer looking to book more than one artist needs a
   separate gig per hire. Once closed, the gig no longer appears as swipeable
   (`GIG_CLOSED` on `POST /api/swipes`), and `GET /next` skips it.

```
Artist ──like(gig)───────▶  Gig (posted by Hirer)
Artist ◀──like(candidate)── Hirer (reviewing artists who liked that gig)
         │
         ▼
   Match created (per gig)
   Chat unlocked
```

---

## Auth `/api/auth`

| Method | Path | Who | Notes |
|---|---|---|---|
| POST | `/register` | anyone | Creates the user (this is the User "create") |
| POST | `/login` | anyone | Returns access token in body (`token`); sets refresh token as httpOnly cookie |
| POST | `/logout` | logged-in | Clears session |
| POST | `/refresh` | logged-in (via refresh cookie) | Issues a new access token |
| GET | `/me` | logged-in | Requires a valid access token — call after `refresh` to restore the session on app mount |

### Auth flow: access + refresh tokens

There are two tokens, each with one job.

- **Access token**: proves who you are. Expires in 15 min. You get it in the
  `login`/`refresh` response body (`token` field). Send it yourself as
  `Authorization: Bearer <token>` on every protected request.
- **Refresh token**: only used to get a new access token. Expires in 7 days.
  Never appears in a response body. The server sets it as an `httpOnly` cookie
  (`path=/api/auth`), so JavaScript can never read it.
- `refresh` issues a new access token. It does not replace the refresh token —
  the same one keeps working until it expires or you log out.
- `logout` deletes the refresh token server-side and clears its cookie.

On app mount, the access token is gone (it only lived in memory), but the
refresh cookie may still be valid. To restore the session: call `refresh`
first (the cookie is sent automatically) to get a new access token, then call
`me` with it. If `refresh` fails, there's no session to restore.

`register`, `login`, and `me` all return the same user shape:

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "Jane",
  "role": "artist",
  "avatarUrl": null,
  "createdAt": "2026-07-23T17:32:54.050Z"
}
```

`login` also includes `"token"` (the access token) in this same response.
- `register`/`login` validation: email trimmed/lowercased and regex-checked; password at most 72 **bytes** (bcrypt ignores anything past that); `role` must be `artist` or `hirer` (no self-registering as `admin`).

### Password rules and brute-force protection

**Storage.** Passwords are hashed with bcrypt at cost 12. bcrypt draws a fresh
random salt per password and embeds it in the digest, so identical passwords
never share a hash. Plaintext is never stored or logged.

**Policy** (`register` only — existing accounts keep logging in with whatever
they have): at least 12 characters and at most 72 bytes, containing a lowercase
letter, an uppercase letter, a digit and a symbol. Rejected on top of that:
common passwords, and passwords containing the user's own name or email
local-part. Violations → `400 WEAK_PASSWORD`, with a message naming what is
missing.

**Per-IP rate limit.** `login` allows 10 requests per 15 minutes per IP,
`register` allows 5 per hour. Over the limit → `429 TOO_MANY_REQUESTS` with a
`Retry-After` header (seconds). Counters live in the backend process, so they
reset on restart and are per-replica.

**Per-account lockout.** Every login attempt is recorded (`LoginAttempt`: email,
IP, success, timestamp — 30 days of history). Five failures within 15 minutes
lock that email until 15 minutes after the last failure → `423 ACCOUNT_LOCKED`,
with the remaining minutes in the message. A successful login clears the streak.
The lockout keys on the submitted email, so unknown emails lock exactly like
real ones and the response never reveals whether an account exists.

## Users `/api/users`

Self-service and admin actions are **one module** — each route authorizes by
`req.user.role` internally rather than living under a separate `/api/admin`
prefix. (The original plan split them; the implementation merged them for fewer
moving parts. If that's ever revisited, change this doc alongside the code.)

Every route requires a valid access token (`requireAuth`). Responses use the
public user shape — `id, email, username, role, createdAt` — and **never**
include `passwordHash`.

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/me` | any logged-in | The caller's own record |
| GET | `/` | admin only | Paginated list of all users. Query: `?page=1&pageSize=20` (`pageSize` capped at 100, floored at 1), `?role=artist\|hirer\|admin`, `?search=` (matches `email`/`username`, case-insensitive). Non-admin → `403` |
| GET | `/:id` | self or admin | A user may read their own record; an admin may read anyone. Otherwise → `403 FORBIDDEN`. Unknown id → `404 USER_NOT_FOUND` |
| PUT | `/:id` | self or admin | Update `email`, `username`, `avatarUrl`, and/or `password` (re-hashed, never stored as plaintext). Only an admin may change `role` — a non-admin attempting it → `403 FORBIDDEN`. An admin cannot demote **their own** account → `409 SELF_DEMOTE` (prevents locking every admin out). Duplicate `email` → `409 EMAIL_EXISTS`. Empty/invalid body → `400 VALIDATION_ERROR` |
| DELETE | `/:id` | self or admin | **Hard delete** — removes the user and cascades every owned row (artist/hirer profile, files, swipes, matches, chat messages, refresh tokens) via `onDelete: Cascade`. An admin cannot delete **their own** account → `409 SELF_DELETE`. A non-admin targeting anyone but themselves → `403 FORBIDDEN`. Returns `204 No Content` |

> **Create** a user via `POST /api/auth/register` (see Auth). This module covers
> read/update/delete only.

## Gigs `/api/gigs`

A **gig** is a hirer-posted opportunity. Create is **hirer-only**; managing an
existing gig is **owner-or-admin** (the "owner-or-admin" analogue of the users
module's "self-or-admin", except ownership is a **column on the row** —
`gig.hirerId` — not the id in the URL, so update/delete load the gig first and
then authorize). Every route requires a valid access token (`requireAuth`).

Responses use the public gig shape — `id, hirerId, title, description,
categoryId, category, location, rate, status, createdAt`. `category` is the
nested `{ id, slug, label }` object; `categoryId` is the same id flattened for
convenience. `status` is the `GigStatus` enum, **`open` or
`closed`** (there is no separate `archived` value — "archiving" a gig is just
`PUT` with `{ "status": "closed" }`). A gig also closes **automatically** the
moment a `Match` is created for it (see "Match flow" above) — a gig only ever
accepts one match.

| Method | Path | Who | Notes |
|---|---|---|---|
| POST | `/` | hirer only | Body: `title` required non-empty string; `category` required — a category **slug or label** resolved server-side against the `Category` table, unknown value → `400 CATEGORY_NOT_FOUND`; `description`/`location` optional strings; `rate` optional non-negative integer; `status` optional (`open`/`closed`). `hirerId` is taken from the token, **never** the body. Non-hirer (artist/admin) → `403 FORBIDDEN`. Invalid body → `400 VALIDATION_ERROR`. Returns `201` with the created gig |
| GET | `/` | any logged-in | Paginated list. Query: `?page=1&pageSize=20` (`pageSize` capped at 100, floored at 1), `?status=open\|closed`, `?category=` (a slug or label, matched case- and spacing-insensitively; an unknown value simply returns nothing), `?mine` (any value → only the caller's own gigs, for management). Ordered `createdAt` desc. Returns `{ items, page, pageSize, total }` |
| GET | `/:id` | any logged-in | A single gig (gigs are browsable, so no ownership check). Unknown id → `404 GIG_NOT_FOUND` |
| PUT | `/:id` | owner or admin | Update `title`, `description`, `category`, `location`, `rate`, and/or `status` — **archive** by sending `{ "status": "closed" }`. `hirerId` is immutable (ignored if sent). A non-owner non-admin → `403 FORBIDDEN`. Empty/invalid body → `400 VALIDATION_ERROR`. Unknown id → `404 GIG_NOT_FOUND` |
| DELETE | `/:id` | owner or admin | **Hard delete** — removes the gig and cascades its `Swipe`/`Match` rows via `onDelete: Cascade`. A non-owner non-admin → `403 FORBIDDEN`. Unknown id → `404 GIG_NOT_FOUND`. Returns `204 No Content` |

## Search `/api/search`

Read-only discovery over gigs and artists: filtering, sorting and pagination on
top of the same rows the Gigs module writes. Every route requires a valid access
token (`requireAuth`) — there is no anonymous search. Nothing here mutates.

| Method | Path | Who | Returns |
|---|---|---|---|
| GET | `/gigs` | any logged-in | Gigs matching the filters, in the requested order |
| GET | `/artists` | any logged-in | Artist profiles matching the filters, **never including the caller's own** |

> Artist **discovery** lives here, at `GET /api/search/artists` — not under
> `/api/profile` (see the caveat on that section below).

### Query parameters

`category` is the only parameter that may be repeated. Giving any other
parameter twice (`?status=open&status=closed`) makes Express hand the route an
array, which is rejected → `400 VALIDATION_ERROR`. The two exceptions are `page`
and `pageSize`, which silently fall back to their defaults instead.

| Param | Applies to | Values | Default | Notes |
|---|---|---|---|---|
| `page` | both | integer ≥ 1 | `1` | Below 1 or unparseable → `1`. No upper bound; a page past the end returns `items: []` |
| `pageSize` | both | integer 1–100 | `20` | Above 100 → **capped at 100**; below 1 or unparseable → `20`. Never an error |
| `q` | both | string ≤ 100 chars | — | Case-insensitive **substring** match. Gigs: `title` **or** `description`. Artists: `username` **or** `bio`. Longer than 100 → `400`. Empty or whitespace-only is treated as absent |
| `category` | both | string, CSV, and/or repeated | — | `?category=Painter,Muralist` and `?category=Painter&category=Muralist` are equivalent. Entries are trimmed, empties dropped, duplicates removed. Matched against `Category.slug` after normalization, so **case and spacing do not matter** and a label works as well as a slug. An unknown value matches nothing rather than erroring. For artists this is a **set intersection** — a profile matches if *any* of its categories is named. More than 25 distinct → `400`; any entry over 100 chars → `400` |
| `location` | both | string ≤ 100 chars | — | Case-insensitive substring, same rules as `q`. Rows with a `NULL` location never match |
| `sort` | both | see the sort table | `newest` | Unknown value → `400` |
| `status` | gigs | `open` \| `closed` \| `all` | **`open`** | ⚠️ Not the same default as `GET /api/gigs` — see the callout below. Anything else → `400` |
| `minRate` / `maxRate` | gigs | integer ≥ 0 | — | Inclusive bounds. Non-integer or negative → `400`; `minRate > maxRate` → `400`. An empty value (`?minRate=`) is ignored. Gigs with a `NULL` rate are excluded once either bound is given |
| `availability` | artists | `true` \| `false` | — | Absent means **both**. Anything else (including `1`/`0`) → `400` |

⚠️ **`?category` does not behave like `GET /api/gigs?category=`**, which takes a
single exact value. Here it is a multi-value OR filter. Same name, different
contract.

⚠️ **`?status` defaults to `open` here, but `GET /api/gigs` has no default and
returns every status.** A search with no `status` param silently hides closed
gigs. Pass `?status=all` to disable the filter.

⚠️ **`?minRate` / `?maxRate` on `/artists` are silently ignored, not rejected.**
`ArtistProfile` has no `rate` column, so the route never reads them and no error
is raised. Do not build a rate slider for artist search.

⚠️ **The caller is always excluded from `/artists`**, unconditionally
(`NOT: { userId: <caller> }`) — there is no parameter to include yourself. A
user searching their own category will not find their own profile.

### Sorting

| `sort` | Applies to | Order |
|---|---|---|
| `newest` | both | `createdAt` descending — **the default** |
| `oldest` | both | `createdAt` ascending |
| `rate_desc` | gigs only | Highest rate first, **`NULL` rates last** |
| `rate_asc` | gigs only | Lowest rate first, **`NULL` rates last** (not first) |
| `popular` | gigs only | Most-swiped first |
| `relevance` | both | Two-bucket ordering — see below |

Every ordering ends with `id` ascending as a tiebreaker. That is a **contract**,
not an implementation detail: without it, rows sharing a `createdAt` could
reorder between page requests and a paging client would see duplicates and gaps.
Offset pagination over a stable dataset is safe.

`sort=rate_desc`, `rate_asc` and `popular` are **gigs-only**; on `/artists` they
are rejected. `popular` gets its own message — `"sort=popular is available for
gig search only"` — while the other two fall into the generic
`"sort must be one of: newest, oldest, relevance"`.

> **`popular` counts *all* swipes on the gig — likes *and* skips.** It measures
> how much traffic a gig has seen, not how well it was received. A heavily
> skipped gig ranks as highly as a heavily liked one. Do not label it
> "top rated" in the UI.

### `sort=relevance`

Not a relevance *score* — there is no full-text index, no ranking function and
no `pg_trgm`. It is a deterministic two-bucket ordering:

| Bucket | Gigs | Artists |
|---|---|---|
| **A** (first) | `q` matches the `title` | `q` matches the `username` |
| **B** (second) | `q` matches the `description` **and not** the title | `q` matches the `bio` **and not** the username |

Every bucket-A row precedes every bucket-B row. A row matching both fields
appears **once**, in bucket A. Within each bucket the order is the usual
`createdAt desc, id asc`. `total` is the two bucket counts summed, and a page
may straddle the seam — the request that crosses it returns the tail of A
followed by the head of B, so walking the pages yields each row exactly once.

> **`sort=relevance` with no `q` is a silent no-op** — the request falls back to
> `newest` ordering rather than returning `400`. If the UI has a "Best match"
> toggle, it does nothing while the search box is empty.

`q` is escaped before it reaches the database, so `%` and `_` are **literal
characters**, not wildcards: `?q=%` matches rows that literally contain a percent
sign, not everything.

### Response shape

Both endpoints return the **six-field** envelope:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "total": 0,
  "totalPages": 0,
  "hasMore": false
}
```

`totalPages` is `ceil(total / pageSize)` (so `0` when there are no matches) and
`hasMore` is `page * pageSize < total`. This is a **superset** of the list shape
used elsewhere — `/api/users` and `/api/gigs` still return the four-field
version without `totalPages`/`hasMore`.

A `/gigs` item is the public gig shape plus its poster:

```json
{
  "id": "…", "hirerId": "…", "title": "…", "description": "…",
  "categoryId": "…",
  "category": { "id": "…", "slug": "muralist", "label": "Muralist" },
  "location": "Porto", "rate": 250,
  "status": "open", "createdAt": "2026-08-06T22:34:15.725Z",
  "hirer": { "username": "…", "avatarUrl": "…" }
}
```

An `/artists` item is the artist profile plus its owner:

```json
{
  "id": "…", "userId": "…",
  "categories": [{ "id": "…", "slug": "painter", "label": "Painter" }],
  "bio": "…", "location": "Lisbon", "availability": true,
  "createdAt": "2026-08-06T22:34:15.725Z",
  "user": { "username": "…", "avatarUrl": "…" }
}
```

The nested object carries **only** `username` and `avatarUrl`. No email, no
role, no id — search results are not a user directory.

### Errors

Every rejection above is `400 VALIDATION_ERROR` with a message naming the
offending parameter; missing or bad tokens produce the usual
`401 MISSING_TOKEN` / `INVALID_TOKEN` / `TOKEN_EXPIRED`. There is no `404` — an
unmatched filter is an empty `items` array, not an error.

### Rate limit

Both search endpoints share **120 requests per minute per user**, keyed by the
authenticated user id rather than by IP. Exceeding it returns
`429 TOO_MANY_REQUESTS` with a `Retry-After` header giving the seconds until the
window resets. The two endpoints draw on one shared budget.

⚠️ The limiter is an in-process `Map`, so the budget is **per backend
container**. That matches the current single-backend `docker-compose.yml`; a
scaled-out deployment would need a shared store.

### Performance caveats

Indexed: `Gig(status, createdAt)`, `Gig(status, categoryId)`, `Gig(categoryId)`,
`ArtistProfile(availability)`, `ArtistCategory(categoryId)`,
`HirerCategory(categoryId)` plus the join tables' composite primary keys — so
the `status`, `category` and `availability` filters and the default date
ordering are index-backed. Artist category filtering now goes through
`ArtistCategory`, which the `categoryId` index and the composite PK cover from
both directions.

**Not indexed, and not indexable with a B-tree:** `q` and `location`. Both
compile to `ILIKE '%…%'`, which no B-tree can serve, so they always scan —
`title`, `description`, `bio` and both `location` columns alike. A trigram index
(`pg_trgm`) would fix this and is deliberately out of scope. Artist `q` matching
on `username` is worse still: it resolves through a **join** to `User`, so no
index on `ArtistProfile` touches that path at all.

## Profiles `/api/profile`

| Method | Path | Who | Notes |
|---|---|---|---|
| PATCH | `/me` | logged-in artist/hirer | Upsert — creates the profile on the first call, updates it on every call after. Non-artist/hirer (e.g. `admin`) → `403 FORBIDDEN` |
| GET | `/:id` | any logged-in | Any user's artist/hirer profile, by their `User.id`. Unknown id → `404 USER_NOT_FOUND`. Target is an `admin` (no profile) → `404 PROFILE_NOT_FOUND` |
| DELETE | `/:id` | owner or admin | Deletes just the artist/hirer profile row — the account itself is untouched (use `DELETE /api/users/:id` to remove the whole account). Non-owner non-admin → `403 FORBIDDEN`. No profile row to delete → `404 PROFILE_NOT_FOUND` |

`PATCH /me` body fields: `categories` (array of category **slugs or labels**),
`bio`, `location`, `availability`, and — hirers only — `organizationName`.

- `categories` **replaces** the whole set; it is not appended to. Entries are
  normalized and deduplicated, so `["Muralist", "muralist"]` stores one row.
- Required on the **first** call (as is `organizationName` for a hirer), omitted
  freely afterwards — a partial edit that sends only `bio` keeps the existing
  categories.
- Empty array, non-array, non-string entry, or more than **10** → `400
  VALIDATION_ERROR`. A name that is not in the `Category` table → `400
  CATEGORY_NOT_FOUND`.

Responses carry `categories` as a flat array of `{ id, slug, label }`.

## Categories `/api/categories`

The controlled vocabulary shared by profiles and gigs. A gig references
**exactly one** category; an artist or hirer holds **many**. See
`docs/mad/20260810-categories.md` for why this is a table rather than a string.

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/` | **public** — no token | Returns `{ items: [{ id, slug, label }] }`, sorted by `label`. Unauthenticated on purpose: sign-up and profile forms need it before a session exists, and it contains nothing user-specific |
| POST | `/` | **admin only** | Body: `label` required non-empty string, max 60 chars; `slug` optional — defaults to the normalized `label`. Non-admin → `403 FORBIDDEN`. Slug already taken → `409 CATEGORY_EXISTS`. Invalid body → `400 VALIDATION_ERROR`. Returns `201` with the created category |
| PATCH | `/:id` | **admin only** | Body: `label` and/or `slug`, at least one → otherwise `400 VALIDATION_ERROR`. Sending `label` alone **does not** re-derive the slug (see below). Non-admin → `403 FORBIDDEN`. Unknown id → `404 CATEGORY_NOT_FOUND`. Target slug taken → `409 CATEGORY_EXISTS` |

`slug` is the stable matching key (`"street-artist"`); `label` is what the UI
shows (`"Street artist"`). Writes elsewhere accept either form.

Writes are admin-only because the vocabulary is shared by every profile and
gig — a category any user could add would reintroduce exactly the drift the
lookup table exists to prevent. Category **deletion is deliberately not
exposed**: `onDelete: Restrict` means the database refuses to drop a category
a profile or gig still references, so a delete endpoint needs a reassign-or-
refuse policy that has not been decided.

Renaming is a two-part act, and the split is intentional:

- **`{ "label": "Mural artist" }`** changes only what the UI shows. Every
  profile and gig keeps its foreign key, so no match is affected, and callers
  that resolve categories by slug keep working.
- **`{ "slug": "mural-artist" }`** changes the lookup key as well. Matches
  still survive (they hold the category **id**), but anything that persisted
  the old slug — a bookmarked `?category=` filter, say — stops resolving.

Send both to rename in full. The one wart: after a label-only rename the new
label is no longer an alias for that category, since label lookups go through
the same normalization as slugs — resolve by slug, or update both.

The 25 starting categories are seeded by migration `20260810120000_categories`.

## Swipes `/api/swipes`

The core Artmate mechanic. Every swipe is anchored to a **`Gig`** — there is no
direct artist↔hirer swipe outside of a gig's context:

- An **artist** swipes on the **gig itself**. The gig's owner (the hirer) is
  looked up server-side from the gig record — the client only ever sends the
  `gigId`. Eligibility is category-based: the gig's single category must be
  **one of** the artist's — a set intersection on category ids, not a string
  comparison.
- A **hirer** swipes **artist candidates** for one of their own gigs, with the
  same category rule applied to the candidate instead. Prior interest from the
  artist is not required — a hirer may discover candidates either by category
  or, optionally, narrowed to artists who already liked that gig, but the
  swipe itself follows the same eligibility rule either way.

| Method | Path | Who | Notes |
|---|---|---|---|
| POST | `/` | logged-in | Artist body: `{ "gigId": "...", "liked": true\|false }`. Hirer body: `{ "gigId": "...", "targetUserId": "...", "liked": true\|false }`. `gigId` must be a string, `liked` a boolean, and (hirer only) `targetUserId` a required string → `400 VALIDATION_ERROR`. Gig must be `open` → `409 GIG_CLOSED`. Hirer must own the gig → `403 FORBIDDEN`. The swiping artist (or, for a hirer, the target) must have an artist profile → `404 PROFILE_NOT_FOUND`, holding the gig's category among its own → `400 CATEGORY_MISMATCH`, and (hirer only) `availability: true` → `409 ARTIST_UNAVAILABLE`. One swipe per (swiper, swiped, gig), ever → `409 SWIPE_EXISTS`. If `liked: true` and the other side already liked back **for the same gig**, **creates the Match and closes the gig in the same transaction** and the response includes `matchId` |
| GET | `/next` | logged-in | Returns the next eligible candidate. Artist: next `open` gig not yet swiped by the caller. Hirer: `?gigId=...` (required), next available artist holding the gig's category, not yet reviewed by this hirer. For an artist the feed spans **every** category on their profile |
| GET | `/` | logged-in | My swipe history — swipes the caller made (not received). `?liked=true\|false` filters for both roles; `?gigId=...` only narrows results for a **hirer** (an artist swipes once per gig, so filtering their own history by gig is a no-op) |

There is no accept/decline step — a swipe is final once made (re-swiping the
same target for the same gig is rejected, not overwritten), and a match forms
automatically the moment both sides have liked each other for that gig.

## Matches `/api/matches`

A match only ever exists because both users swiped **like** on each other **for the same gig**.

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/` | member | My matches, flattened as `otherUser: { id, displayName, avatarUrl, online }` and `gig: { id, title }` — exactly what the chat sidebar needs. `online` is computed live from the WebSocket gateway's room state (not cached), true only while the other user has a socket connected **and** joined to this specific match's room |
| GET | `/:id` | member | Single match, with both users' info and the gig |
| DELETE | `/:id` | member | Unmatch — closes the chat and cascades its messages |

## Messages `/api/matches/:matchId/messages`

Chat is only reachable through a match — no match, no messages.

| Method | Path | Who | Notes |
|---|---|---|---|
| POST | `/` | match member | Body: `{ "content": "..." }` (1–2000 chars). REST path; the WebSocket gateway performs the same write, so history is identical either way |
| GET | `/` | match member | Paginated history, newest first |
| PUT | `/:id/read` | recipient | Mark as read — the only "edit" messages support; content is immutable |
| DELETE | `/:id` | sender (or mod/admin) | |

## Friends `/api/friends`

| Method | Path | Who | Notes |
|---|---|---|---|
| POST | `/` | logged-in | Body: `{ "addresseeId": "..." }` → `409 FRIENDSHIP_EXISTS` if any relation exists in either direction |
| GET | `/` | logged-in | Filter `?status=pending\|accepted`; each row has `direction: incoming\|outgoing` and `otherUser` |
| PUT | `/:id/accept` | addressee | |
| DELETE | `/:id` | either side | Decline a request or unfriend |

---

## Error codes used above

| Code | Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Zod rejected body/query/params (also used by auth for missing/invalid fields) |
| `SELF_SWIPE` | 400 | Tried to swipe on yourself |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password on login |
| `MISSING_TOKEN` | 401 | Authorization header missing/malformed, or refresh cookie missing |
| `INVALID_TOKEN` | 401 | Access token signature invalid or malformed |
| `TOKEN_EXPIRED` | 401 | Access token expired |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token invalid, expired, or revoked |
| `FORBIDDEN` | 403 | Logged in, but not allowed (wrong owner/role/side) |
| `NOT_FOUND` | 404 | Resource missing — also returned instead of 403 when hiding existence |
| `USER_NOT_FOUND` | 404 | No user with that id (get/update/delete) |
| `GIG_NOT_FOUND` | 404 | No gig with that id (get/update/delete) |
| `EMAIL_EXISTS` | 409 | Email already registered |
| `PROFILE_EXISTS` | 409 | User already has a profile |
| `SWIPE_EXISTS` | 409 | A swipe already exists for this (swiper, swiped, gig) combination |
| `GIG_CLOSED` | 409 | Tried to swipe on a gig that is no longer `open` |
| `PROFILE_NOT_FOUND` | 404 | Hirer's swipe target has no artist profile |
| `CATEGORY_MISMATCH` | 400 | The swiping (or targeted) artist holds none of the gig's category |
| `CATEGORY_NOT_FOUND` | 400 / 404 | **400** when a profile or gig write names a category that is not in the `Category` table (a body-validation failure); **404** when `PATCH /api/categories/:id` targets an id that does not exist |
| `CATEGORY_EXISTS` | 409 | Creating or re-slugging a category onto a slug another category already owns |
| `ARTIST_UNAVAILABLE` | 409 | Hirer tried to swipe an artist whose profile is marked unavailable |
| `FRIENDSHIP_EXISTS` | 409 | Relation already exists in either direction |
| `SELF_DEMOTE` | 409 | Admin tried to change or remove their own admin role |
| `SELF_DELETE` | 409 | Admin tried to delete their own account |
| `ACCOUNT_LOCKED` | 423 | Too many failed logins for this email — locked temporarily |
| `TOO_MANY_REQUESTS` | 429 | Per-IP rate limit hit — see the `Retry-After` header |
| `INTERNAL_ERROR` | 500 | Unhandled — never leaks internals |