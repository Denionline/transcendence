# Artmate — API Endpoints

All endpoints require a session cookie except `/api/auth/*`.
Errors always have the shape `{ "error": "CODE", "message": "..." }`.
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
| POST | `/login` | anyone | Sets httpOnly session cookie |
| POST | `/logout` | logged-in | Clears session |
| GET | `/me` | logged-in | Restores session on app mount |

## Users `/api/users`

Self-service only — anything done *to other users* lives under `/api/admin`.

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/:id` | any logged-in | Public fields only (never `passwordHash`) |
| PUT | `/:id` | self | Update own account (email, password). Cannot change own `role` |
| DELETE | `/:id` | self | Delete own account — cascades profile, interests, matches, messages |

## Admin `/api/admin`

Every route requires `role: admin` — otherwise `403 FORBIDDEN`.
Scope for now: **users management only**. Future admin features (content
moderation, reported profiles, stats) get their own sub-paths later.

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/users` | admin | Paginated list of all users. Filters: `?role=user\|moderator\|admin`, `?search=` (matches email/displayName) |
| GET | `/users/:id` | admin | Full admin view: user + profile + counts (interests, matches, messages) |
| PUT | `/users/:id` | admin | Edit any user, including `role`. An admin cannot demote **themselves** → `409 SELF_DEMOTE` (prevents locking everyone out) |
| DELETE | `/users/:id` | admin | Delete any user with full cascade. Cannot delete yourself here — use `/api/users/:id` for that |

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
| `VALIDATION_ERROR` | 400 | Zod rejected body/query/params |
| `SELF_INTEREST` | 400 | Tried to show interest in yourself |
| `FORBIDDEN` | 403 | Logged in, but not allowed (wrong owner/role/side) |
| `NOT_FOUND` | 404 | Resource missing — also returned instead of 403 when hiding existence |
| `PROFILE_EXISTS` | 409 | User already has a profile |
| `INTEREST_EXISTS` | 409 | Pending interest already exists for this pair |
| `INTEREST_CLOSED` | 409 | Interest already accepted/declined, can't withdraw |
| `FRIENDSHIP_EXISTS` | 409 | Relation already exists in either direction |
| `SELF_DEMOTE` | 409 | Admin tried to change or remove their own admin role |
| `INTERNAL_ERROR` | 500 | Unhandled — never leaks internals |