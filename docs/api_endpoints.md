# Artmate — API Endpoints

All protected endpoints require an `Authorization: Bearer <token>` header (JWT access token) except `/api/auth/*`.
The refresh token (also a JWT) is never exposed to JS — it travels only as an httpOnly cookie, scoped to `/api/auth`.
Errors always have the shape `{ "error": "CODE", "message": "..." }`.
`error` is a machine-readable code (see table below); `message` is human-readable.
Paginated lists accept `?page=1&pageSize=20` and return `{ items, page, pageSize, total }`.

## Match flow (how it works)

Artmate uses an **interest → accept** model, not mutual swiping:

1. A hirer browses the discovery feed and **shows interest** in an artist
   (`POST /api/interests`).
2. The artist sees all incoming interests in a list
   (`GET /api/interests?direction=incoming`).
3. The artist **accepts** → a `Match` is created and **chat is unlocked**
   between the two users — or **declines**, and nothing else happens.
4. Messages only exist inside a match, so chat access is enforced by the
   URL structure itself (`/api/matches/:matchId/messages`).

```
Hirer ──POST interest──▶ Artist
                           │
              ┌─ accept ───┴─── decline ─┐
              ▼                          ▼
        Match created              Interest closed
        Chat unlocked              (no chat, hirer is notified)
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

Responses use the public gig shape — `id, hirerId, title, description, category,
location, rate, status, createdAt`. `status` is the `GigStatus` enum, **`open` or
`closed`** (there is no separate `archived` value — "archiving" a gig is just
`PUT` with `{ "status": "closed" }`).

| Method | Path | Who | Notes |
|---|---|---|---|
| POST | `/` | hirer only | Body: `title` + `category` required non-empty strings; `description`/`location` optional strings; `rate` optional non-negative integer; `status` optional (`open`/`closed`). `hirerId` is taken from the token, **never** the body. Non-hirer (artist/admin) → `403 FORBIDDEN`. Invalid body → `400 VALIDATION_ERROR`. Returns `201` with the created gig |
| GET | `/` | any logged-in | Paginated list. Query: `?page=1&pageSize=20` (`pageSize` capped at 100, floored at 1), `?status=open\|closed`, `?category=` (exact match), `?mine` (any value → only the caller's own gigs, for management). Ordered `createdAt` desc. Returns `{ items, page, pageSize, total }` |
| GET | `/:id` | any logged-in | A single gig (gigs are browsable, so no ownership check). Unknown id → `404 GIG_NOT_FOUND` |
| PUT | `/:id` | owner or admin | Update `title`, `description`, `category`, `location`, `rate`, and/or `status` — **archive** by sending `{ "status": "closed" }`. `hirerId` is immutable (ignored if sent). A non-owner non-admin → `403 FORBIDDEN`. Empty/invalid body → `400 VALIDATION_ERROR`. Unknown id → `404 GIG_NOT_FOUND` |
| DELETE | `/:id` | owner or admin | **Hard delete** — removes the gig and cascades its `Swipe`/`Match` rows via `onDelete: Cascade`. A non-owner non-admin → `403 FORBIDDEN`. Unknown id → `404 GIG_NOT_FOUND`. Returns `204 No Content` |

## Profiles `/api/profiles`

| Method | Path | Who | Notes |
|---|---|---|---|
| POST | `/` | logged-in, no profile yet | One per user → `409 PROFILE_EXISTS` |
| GET | `/` | any logged-in | Discovery feed; filter `?kind=artist\|hirer`, paginated |
| GET | `/:id` | any logged-in | |
| PUT | `/:id` | owner | `kind` (artist/hirer) is immutable after creation |
| DELETE | `/:id` | owner or admin | |

## Interests `/api/interests`

The core Artmate mechanic. An interest is **directional**: sender → recipient.

| Method | Path | Who | Notes |
|---|---|---|---|
| POST | `/` | logged-in | Body: `{ "recipientId": "..." }`. Sender and recipient must have different `kind`s. One pending interest per pair → `409 INTEREST_EXISTS`. Cannot target yourself → `400 SELF_INTEREST` |
| GET | `/` | logged-in | `?direction=incoming` → interests **in me** (the artist's list); `?direction=outgoing` → interests **I sent**; `?status=pending\|accepted\|declined` to filter. Each item includes `otherUser: { id, displayName, avatarUrl, kind }` |
| PUT | `/:id/accept` | recipient only | Sets status to `accepted`, **creates the Match in the same transaction**, returns `{ id, status, matchId }` so the frontend can route straight to the new chat |
| PUT | `/:id/decline` | recipient only | Sets status to `declined`. No match, no chat. Sender can see the status change but gets no further access |
| DELETE | `/:id` | sender only | Withdraw a **pending** interest (accepted/declined ones are history → `409 INTEREST_CLOSED`) |

Status lifecycle: `pending → accepted` (match + chat) or `pending → declined` (closed).

## Matches `/api/matches`

A match only ever exists because an interest was accepted.

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/` | member | My matches, flattened as `otherUser: { id, displayName, avatarUrl }` — exactly what the chat sidebar needs |
| GET | `/:id` | member | Single match with its interest origin (`interestId`, who initiated) |
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
| `SELF_INTEREST` | 400 | Tried to show interest in yourself |
| `WEAK_PASSWORD` | 400 | Password does not meet the policy on register |
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
| `INTEREST_EXISTS` | 409 | Pending interest already exists for this pair |
| `INTEREST_CLOSED` | 409 | Interest already accepted/declined, can't withdraw |
| `FRIENDSHIP_EXISTS` | 409 | Relation already exists in either direction |
| `SELF_DEMOTE` | 409 | Admin tried to change or remove their own admin role |
| `ACCOUNT_LOCKED` | 423 | Too many failed logins for this email — locked temporarily |
| `TOO_MANY_REQUESTS` | 429 | Per-IP rate limit hit — see the `Retry-After` header |
| `SELF_DEMOTE` | 409 | Admin tried to change their own role away from `admin` |
| `INTERNAL_ERROR` | 500 | Unhandled — never leaks internals |