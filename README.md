*This project has been created as part of the 42 curriculum by abessa-m, dximenes, carlaugu, leoaguia.*

<!-- TEAM: confirm the exact 42 logins above before submission. `mreinald` left the
     team partway through; their in-progress work was redistributed (see Individual
     Contributions). -->

# Artmate

[![CI](https://github.com/Denionline/transcendence/actions/workflows/ci.yml/badge.svg)](https://github.com/Denionline/transcendence/actions/workflows/ci.yml)

> Repository name: `transcendence` (42 project slug `ft_transcendence`).
> Product name: **Artmate**.

---

## Description

**Artmate is a matchmaking platform for artists and the people who hire them.** It
connects performing and visual artists (musicians, painters, comedians, …) with
hirers (bands looking for a member, venues looking to book an act, other artists
looking for a collaborator, …).

Discovery is **swipe-based** and anchored to a **gig**: a hirer posts an
opportunity, artists swipe like/pass on gigs that match their disciplines, and the
hirer reviews only the artists who liked a given gig. When both sides swipe like on
each other **for the same gig**, a **match** is created and a **private real-time
chat** opens between the two users. Nothing is sent until both parties have said
yes, which keeps the platform low-spam for everyone.

### Key features

- **Swipe-based, category-keyed matching** — artists only see gigs that share at
  least one category with their profile; hirers only see artists who share a
  category with the gig.
- **Mutual-match unlock** — a match is created only on a mutual like for the same
  gig; that same transaction closes the gig (one hire per gig).
- **Private real-time chat** — persisted message history, unlocked per match,
  delivered over WebSockets with online/offline presence.
- **Artist & hirer profiles** — disciplines/categories, bio, location,
  availability, avatar, and a media portfolio (image / audio / video).
- **Friends / connections** — friend requests, accept/decline, friends list with
  live online status.
- **File uploads** — client- and server-side validation, secure volume storage,
  in-browser preview with HTTP Range seeking, upload progress, delete.
- **Notifications** — real-time alerts for new matches, new messages, gig closed,
  likes and friend invites.
- **Advanced search** — full-text + filter/sort/paginate over artists, hirers and
  gigs, with relevance ranking.
- **Internationalization** — English, Portuguese and Spanish, switchable anywhere,
  with every user-facing string translated.
- **Admin** — role-based dashboard with user CRUD and role management.
- **Legal** — accessible Privacy Policy and Terms of Service pages, linked from the
  footer.

---

## Instructions

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose v2.
- GNU Make.
- Node.js ≥ 22 — only for running lint/tests/tooling outside the containers; the
  app itself builds and runs entirely inside Docker.
- A `.env` file at the repository root. Copy `.env.example` and fill every value:

  | Variable | Purpose |
  |---|---|
  | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | PostgreSQL container credentials |
  | `POSTGRES_HOST_PORT` | Host port the database is published on (default `5432`) |
  | `HTTP_PORT`, `HTTPS_PORT` | Host ports for the nginx proxy (default `8080` / `8443`) |
  | `FT_API_UID`, `FT_API_SECRET`, `FT_API_CALLBACK_URL` | 42 OAuth application credentials (for "Login with 42") |
  | `JWT_SECRET`, `JWT_REFRESH_SECRET` | Signing secrets for the access / refresh JWTs |
  | `FRONTEND_URL` | Public origin of the app, used for CORS and OAuth redirects |
  | `DATABASE_URL` | Prisma connection string (only used for host-side migrate/tooling) |
  | `UPLOAD_DIR`, `MAX_UPLOAD_MB` | Upload storage path inside the backend container and the per-request size cap |

  See [`docs/environment.md`](docs/environment.md) for the full reference.

### Build

```bash
make
```

### Run

```bash
make up
```

The application is then available at:

```
https://localhost:8443
```

The certificate is self-signed and generated when the image is built, so the
browser shows a warning on the first visit — accept it to continue. Plain HTTP on
`http://localhost:8080` only redirects to HTTPS. Both ports are configurable via
`HTTP_PORT` / `HTTPS_PORT`.

### Stop

```bash
make down
```

### Seed demo data (optional)

```bash
make seed
```

Populates the database with a demo cast plus its media (avatars, portfolio images,
an audio clip, a short video — all tracked in the repo so the demo renders
offline). It runs inside the backend container, so the stack must be up
(`make up`) first. See [`docs/db_seeding.md`](docs/db_seeding.md).

### Other useful targets

| Target | Effect |
|---|---|
| `make re` | `down` + `up` |
| `make rebuild` | `fclean` + `up` (drops volumes) |
| `make lint` | ESLint over frontend and backend |
| `make ci` | lint + build + typecheck + migrate + tests (mirrors GitHub Actions) |
| `make logs` / `make ps` | follow container logs / list containers |
| `make dbaccess` / `make dbstats` | psql shell / row counts per table |

---

## Team Information

| Member | Role(s) | Responsibilities |
|---|---|---|
| **abessa-m** | Product Owner | Owns the product vision and backlog, prioritizes features, validates completed work, communicates with evaluators and peers. Maintains [`docs/product_vision.md`](docs/product_vision.md). |
| **dximenes** | Project Manager / Scrum Master | Organizes the weekly sync and planning, tracks progress and deadlines, manages risks and blockers, keeps the team communication flowing. |
| **carlaugu** | Tech Lead / Architect | Defines the technical architecture and stack, sets code-quality conventions, reviews critical changes, owns the Architecture Decision records in [`docs/mad/`](docs/mad/). |
| **leoaguia** | Developer | Implements assigned features and modules, reviews teammates' pull requests, tests their own work. |

> A fifth member, `mreinald`, started as a Developer and left the team partway
> through the project; their unfinished work was picked up by the remaining
> developers (see Individual Contributions).

---

## Project Management

- **Work tracking** — GitHub Issues, one issue per unit of work, mirrored in
  branch names (e.g. `43-docs-final-readme-…`) and closed through pull requests.
- **Code review** — every change lands via a pull request reviewed by at least one
  other member before merge to `main`; the CI workflow is a required status check.
- **Meetings** — weekly Monday sync to review progress, assign issues and clear
  blockers.
- **Communication channel** — <!-- TEAM: name it (Discord / Slack / …) --> _Discord_.
- **Documentation** — architecture and decision notes live in [`docs/`](docs/),
  with dated Architecture Decision records under [`docs/mad/`](docs/mad/).

---

## Technical Stack

### Frontend

- **React 19** with **Vite** as the build tool and dev server.
- **React Router** for client-side routing.
- **Tailwind CSS v4** + **daisyUI** for styling.
- **i18next** / **react-i18next** for internationalization.
- **socket.io-client** for the real-time channel.
- **Zod** for form/input validation.
- **Vitest** + **Testing Library** for unit tests, **Playwright** for end-to-end.

### Backend

- **Node.js** + **Express 5** (TypeScript, ESM), run with `tsx`.
- **Prisma ORM** over **PostgreSQL**.
- **socket.io** for the WebSocket gateway.
- **jsonwebtoken** for access/refresh JWTs, **bcrypt** for password hashing.
- **multer** for multipart upload handling.
- **swagger-ui-express** to serve the OpenAPI documentation at `/api/docs`.
- Hand-rolled in-memory **rate-limiting** middleware on the sensitive routes
  (auth, search, file upload/serve).

### Database

- **PostgreSQL 17**, chosen after comparing options on the DB-Engines ranking for
  its strong relational guarantees (match and chat integrity depend on real
  foreign keys and transactions) and its wide tooling support.
- Accessed exclusively through **Prisma**, which gives type-safe queries and a
  versioned migration history (`srcs/backend/prisma/migrations/`).

### Infrastructure

- **Docker Compose** orchestrates four services: `database`, `backend`,
  `frontend`, `nginx`.
- **nginx** is the single entry point: it terminates TLS on `:443`, redirects
  `:80` → `:443`, proxies `/api` and `/socket.io` to the backend and everything
  else to the frontend, and sets the security headers (HSTS, `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, a CSP).

### Architecture

```
                ┌───────────┐
                |  Browser  |
                └────┬──────┘
                https| ▲
┌──────────────────────────────────────────┐
│  Docker            | |                   |
|                    ▼ |:8443 → :443       |
│                ┌─────────┐               |
|                |  nginx  |               |
|                └─────────┘               |
|            :5173|       |:9000           |
|  ┌────────────────┐    ┌───────────┐     |
|  |  React + Vite  |    |  Express  |     |
|  └────────────────┘    └───────────┘     |
|                         |:5432           |
|                     ┌──────────────┐     |
|                     |  PostgreSQL  |     |
|                     └──────────────┘     |
└──────────────────────────────────────────┘
```

### Justification for major technical choices

- **React + Vite / Express** — a mainstream, well-documented split that satisfies
  the "framework on both ends" requirement and keeps frontend and backend
  independently deployable.
- **PostgreSQL + Prisma** — relational integrity for matches/chats, plus a
  migration history the whole team can replay deterministically.
- **socket.io** — real-time chat, presence and notifications with automatic
  reconnection and room-based broadcasting.
- **nginx** — one HTTPS door into the Docker network, so no container speaks TLS
  itself and the browser only ever talks to one origin.

---

## Database Schema

Full schema: [`srcs/backend/prisma/schema.prisma`](srcs/backend/prisma/schema.prisma).
Design rationale for the category model: [`docs/mad/20260810-categories.md`](docs/mad/20260810-categories.md);
for uploads: [`docs/mad/20260819-file-uploads.md`](docs/mad/20260819-file-uploads.md).

| Table | Purpose | Key fields |
|---|---|---|
| **User** | Account identity | `id` (uuid, PK), `email` (unique), `username`, `passwordHash` (nullable — null for OAuth-only accounts), `role` (`artist`/`hirer`/`admin`), `avatarUrl`, `createdAt` |
| **Category** | Controlled vocabulary for disciplines | `id` (PK), `slug` (unique, stable matching key), `label` (display) |
| **ArtistProfile** | Artist-specific fields, 1:1 with User | `id` (PK), `userId` (unique FK), `bio`, `location`, `availability` (bool) |
| **HirerProfile** | Hirer-specific fields, 1:1 with User | `id` (PK), `userId` (unique FK), `organizationName`, `bio`, `location`, `availability` |
| **ArtistCategory** / **HirerCategory** | Many-to-many between a profile and its categories | composite PK `(profileId, categoryId)` — prevents duplicates |
| **Gig** | An opportunity posted by a hirer | `id` (PK), `hirerId` (FK), `title`, `description`, `categoryId` (FK — exactly one), `location`, `rate` (int), `status` (`open`/`closed`), `createdAt` |
| **File** | Portfolio upload | `id` (PK), `ownerId` (FK), `type` (`image`/`audio`/`video`/`document`), `mimeType`, `sizeBytes`, `originalName`, `location`, `visibility` (`private`/`public`), `createdAt` |
| **Swipe** | One like/pass, per (swiper, swiped, gig) | `id` (PK), `swiperId`, `swipedId`, `gigId` (FKs), `liked` (bool); unique `(gigId, swipedId, swiperId)` |
| **Match** | Artist ↔ Hirer match, anchored to a gig | `id` (PK), `artistId` (FK), `gigId` (FK), `createdAt`; unique `(artistId, gigId)` |
| **ChatMessage** | A message inside a match | `id` (PK), `matchId` (FK), `senderId` (FK), `content`, `isRead` (bool), `createdAt` |
| **Notification** | A user-facing alert | `id` (PK), `userId` (FK), `actorId` (nullable FK), `type` (enum), `data` (JSON), `isRead` (bool), `createdAt` |
| **Friend** | A friend/connection request | `id` (PK), `userId`, `friendId` (FKs), `status` (`pending`/`accepted`/`declined`); unique `(userId, friendId)` |
| **RefreshToken** | Persisted hash of an issued refresh token | `id` (PK), `userId` (FK), `tokenHash` (unique), `expiresAt` |
| **LoginAttempt** | Audit trail for rate-limiting / lockout | `id` (PK), `email`, `userId` (nullable FK), `ip`, `successful` (bool), `createdAt` |

**Relationships & rules**

- `User` 1:1 `ArtistProfile` **or** `HirerProfile` (never both); `admin` users have neither.
- A `Gig` has **exactly one** `Category`; an artist or hirer profile has **many**,
  through the join tables. Swipe eligibility is a set intersection on category
  ids, not a string comparison.
- A mutual `Swipe` (both sides `liked = true`, same gig) creates a `Match` and
  sets the gig to `closed` in the same transaction.
- `ChatMessage` only exists inside a `Match`; chat access is enforced by the URL
  structure (`/api/matches/:matchId/messages`).
- `onDelete: Cascade` on the ownership edges — deleting a user removes their
  profile, files, swipes, matches, messages and notifications; category
  references use `Restrict` so an in-use category cannot be deleted.
- Online/offline status is **not** stored — it is live socket.io connection state.

---

## Features List

<!-- TEAM: replace each "owner" with the member(s) who built it. -->

| Feature | Description | Owner |
|---|---|---|
| Email/password auth | Register and log in with email + password; passwords hashed and salted with bcrypt; short-lived access JWT + httpOnly refresh-token cookie scoped to `/api/auth`; per-IP rate limiting and a `LoginAttempt` audit trail. | _owner_ |
| Login with 42 (OAuth 2.0) | Authorization-code flow against the 42 intra API (`/api/auth/42` → `/api/auth/42/callback`), `state` parameter for CSRF protection, account auto-provisioned from the 42 profile. | _owner_ |
| Artist / hirer profiles | Create and edit a profile (categories, bio, location, availability, organization name for hirers); public profile page for any user. | _owner_ |
| Onboarding gate | A fresh artist/hirer account must pick at least one category (and org name for hirers) before the rest of the app unlocks, because matching is keyed on it. | _owner_ |
| Avatar | Set an avatar; a generated initials avatar is shown when none is set. | _owner_ |
| Media portfolio | Upload image/audio/video files to a profile, with progress, in-browser preview (HTTP Range for video seeking) and delete. | _owner_ |
| Gig posting | Hirers create, edit, close and delete gigs (title, description, category, location, rate). | _owner_ |
| Swipe & match | Category-filtered swipe deck (gigs for artists, candidate artists for hirers); mutual like on the same gig auto-creates a match and closes the gig. | _owner_ |
| Real-time chat | Per-match 1:1 chat over WebSockets, persisted history with pagination, read receipts, online presence, graceful reconnection. | _owner_ |
| Friends / connections | Send, accept and decline friend requests; friends list with live online status. | _owner_ |
| Notifications | Real-time + persisted notifications for new match, new message, gig closed, like, friend invite and invite accepted; notification centre with mark-as-read. | _owner_ |
| Advanced search | Full-text + filtered (category, location, availability), sorted and paginated search over artists, hirers and gigs, with relevance ranking. | _owner_ |
| Internationalization | English / Portuguese / Spanish, language switcher available everywhere, all user-facing text translated; a CI check keeps the three locale files in sync. | _owner_ |
| Admin dashboard | Role-gated area: list/view/edit/delete users, change roles, platform stats. | _owner_ |
| Privacy Policy & Terms of Service | Standalone, translated, multi-section legal pages linked from the footer. | _owner_ |
| API documentation | OpenAPI 3 document served with Swagger UI at `/api/docs` (raw at `/api/docs.json`). | _owner_ |

---

## Modules

Points: **Major = 2**, **Minor = 1**. Target: **16 points** (14 required + a
2-point buffer in case a module is not validated during evaluation).

<!-- TEAM: replace each "owner". -->

### Major modules (5 × 2 = 10 pts)

| # | Module | Why it fits Artmate | How it was implemented | Owner |
|---|---|---|---|---|
| 1 | **Use a framework for frontend and backend** | The app needs structured routing/state on the client and a real HTTP + WebSocket server. | React 19 + Vite on the frontend; Express 5 (TypeScript, ESM) on the backend, organized as `modules/<name>/<name>.routes.ts` + `.service.ts`. | _owner_ |
| 2 | **Real-time features (WebSockets)** | Chat, presence and notifications must be instant and multi-client. | socket.io gateway with JWT-authenticated handshake, per-user and per-match rooms, broadcast on new match/message/notification, presence events, token-expiry disconnect and reconnection handling. | _owner_ |
| 3 | **Allow users to interact with other users** | Core product loop: discover → match → talk. | Basic chat (send/receive, persisted) inside matches; public profile pages; friends system (add/remove/list with online status). | _owner_ |
| 4 | **Standard user management & authentication** | Every user has an editable identity, an avatar and connections. | Editable artist/hirer profiles, avatar with a default fallback, friends with live online status, profile page; email/password auth with hashing + salting. | _owner_ |
| 5 | **Advanced permissions system** | The platform needs moderation. | `artist` / `hirer` / `admin` roles; `requireRole` middleware; admin-only user CRUD (`GET/PUT/DELETE /api/users`); role-gated admin routes and UI; role-dependent views and actions across the app. | _owner_ |

### Minor modules (6 × 1 = 6 pts)

| # | Module | Why it fits Artmate | How it was implemented | Owner |
|---|---|---|---|---|
| 6 | **Use an ORM** | Relational data with non-trivial relations and migrations. | Prisma over PostgreSQL; full migration history in `srcs/backend/prisma/migrations/`. | _owner_ |
| 7 | **File upload and management** | Artists need a media portfolio. | multer intake; client- and server-side type/size validation; bytes stored in a named Docker volume behind a single storage module; unguessable-id access control; `<img>`/`<audio>`/`<video>` preview with HTTP Range; XHR upload progress; delete (and cleanup on account deletion). | _owner_ |
| 8 | **Advanced search with filters, sorting and pagination** | Hirers browse a large pool of artists. | `/api/search/{artists,hirers,gigs}` with text search, category/location/availability filters, `newest`/`oldest`/`relevance` sorting, relevance-bucketed pagination, rate-limited. | _owner_ |
| 9 | **Support for multiple languages (≥ 3)** | Portuguese and Spanish speakers are a core audience. | i18next with `en` / `pt` / `es` (487 keys each), browser-detection + persisted choice, a switcher in the auth layout and settings, and `scripts/check-translations.mjs` in CI to prevent drift. | _owner_ |
| 10 | **Remote authentication with OAuth 2.0** | Lower-friction sign-in. | 42 intra authorization-code flow with `state` CSRF protection; account provisioned from the 42 profile; shares the same JWT session issuance as password login. | _owner_ |
| 11 | **Support for additional browsers** | Not everyone uses Chrome. | <!-- TEAM: finish this — add Firefox + WebKit projects to `playwright.config.ts`, run the e2e suite on each, and record any browser-specific limitations here. --> Target: Chrome (mandatory) + Firefox + Safari/WebKit, verified with the Playwright e2e suite. | _owner_ |

### Not claimed

- **Public API (Major)** — an OpenAPI/Swagger document is served at `/api/docs`
  for internal reference, but the dedicated API-key + rate-limited public API is
  **not** part of the graded scope for this project.

---

## Individual Contributions

<!-- TEAM: fill in per person — specific features/modules/components, and at least
     one concrete challenge and how it was solved. Keep it honest; this section is
     weighed during evaluation. -->

- **abessa-m** — _Product Owner._ …
- **dximenes** — _Project Manager / Scrum Master._ …
- **carlaugu** — _Tech Lead / Architect._ …
- **leoaguia** — _Developer._ …
- **mreinald** _(left the team)_ — started work on _…_; on departure it was
  handed to _…_ and completed.

---

## AI usage disclosure

AI assistance (Claude) was used during this project for:

- Drafting and structuring this `README.md` and parts of the `docs/` notes.
- <!-- TEAM: list any other uses — e.g. reviewing a specific service, generating
     test scaffolding — with the file/area and what was kept vs. rewritten. -->

All AI-assisted output was reviewed, tested and is understood by the team members
who own the corresponding code.

---

## Resources

**Database**
- [DB-Engines Ranking](https://db-engines.com/en/ranking) — compared database options before choosing PostgreSQL.
- [How to Use the Postgres Docker Official Image](https://www.docker.com/blog/how-to-use-the-postgres-docker-official-image/) — setting up the PostgreSQL container.

**Prisma**
- [Prisma Schema Overview](https://pris.ly/d/prisma-schema) — schema reference.

**OAuth 2.0 (42 login)**
- [OAuth 2.0 Simplified — Aaron Parecki](https://aaronparecki.com/oauth-2-simplified/) — the Authorization Code flow.
- [oauth.net — Authorization Code grant](https://oauth.net/2/grant-types/authorization-code/) — redirect → code → token reference.
- [RFC 6749 — The OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749) — §4.1.3 token exchange, §10.12 the `state` parameter.
- [RFC 6750 — Bearer Token Usage](https://datatracker.ietf.org/doc/html/rfc6750) — the `Authorization: Bearer <token>` scheme.
- [42 API — Web Application Flow](https://api.intra.42.fr/apidoc/guides/web_application_flow) — 42's OAuth flow and `/oauth/token` exchange. *(requires 42 intranet login)*
- [42 API reference](https://api.intra.42.fr/apidoc) — `GET /v2/me` and its profile fields. *(requires 42 intranet login)*

**Real-time**
- [socket.io documentation](https://socket.io/docs/v4/) — rooms, acknowledgements, and connection lifecycle.

---

## Known Limitations

- **One hire per gig** — a match closes its gig; hiring several artists needs
  several gigs. This is a deliberate product decision, not a bug.
- **Avatar by URL** — the avatar is currently a URL field with an initials
  fallback; wiring it through the file-upload system is a planned follow-up.
- **Content Security Policy** is served in `Report-Only` mode (nginx) — it reports
  violations but does not yet block them.
- **No games** — Artmate is not a gaming project, so the gaming modules (and
  anything that depends on a game) are out of scope.
- **Additional-browser support** is targeted but the cross-browser e2e matrix is
  not yet complete (see module 11).

---

## License

*PolyForm Noncommercial License 1.0.0* — see [`LICENSE`](LICENSE).
