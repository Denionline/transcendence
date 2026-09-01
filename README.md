*This project has been created as part of the 42 curriculum by abessa-m, dximenes, carlaugu, leoaguia, lgertrud.*

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
| **abessa-m** | Product Owner | Owns the product vision and backlog, prioritizes features, validates completed work, communicates with evaluators and peers. Maintains [`docs/product_vision.md`](docs/product_vision.md). Also contributed as a backend/DB developer. |
| **dximenes** | Project Manager / Scrum Master | Organizes the weekly sync and planning, tracks progress and deadlines, manages risks and blockers, keeps team communication flowing. Also contributed as a frontend/real-time developer and handled release management. |
| **carlaugu** | Tech Lead / Architect | Defines the technical architecture and stack, sets code-quality conventions, reviews critical changes, owns the Architecture Decision records in [`docs/mad/`](docs/mad/). Also contributed as a backend developer and owned the E2E suite. |
| **leoaguia** | Developer | Implements assigned features and modules, reviews teammates' pull requests, tests their own work. Focus: notifications and profile UX. |
| **lgertrud** | Developer | Implements assigned features and modules, reviews teammates' pull requests, tests their own work. Focus: legal pages, API documentation, cross-browser compatibility. |

> A sixth member, `mreinald`, started as a Developer and left the team partway
> through the project; their unfinished work was picked up by the remaining
> developers (see Individual Contributions).

---

## Project Management

- **Work tracking** — GitHub Issues, one issue per unit of work, assigned to a
  single owner, mirrored in branch names (e.g. `43-docs-final-readme-…`) and
  closed through pull requests.
- **Code review** — every change lands via a pull request reviewed by at least one
  other member before merge to `main`; the CI workflow is a required status check.
- **Meetings** — weekly sync every **Tuesday** to review progress, assign issues
  and clear blockers.
- **Communication channel** — **WhatsApp** group for day-to-day coordination.
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

Owners are the GitHub issue assignees. Features built before the issue tracker was
in use are marked _core_ and were a shared effort.

| Feature | Description | Owner (issue) |
|---|---|---|
| Email/password auth | Register and log in with email + password; passwords hashed and salted with bcrypt; short-lived access JWT + httpOnly refresh-token cookie scoped to `/api/auth`; per-IP rate limiting and a `LoginAttempt` audit trail. | _core_; validation hardening: abessa-m (#37) |
| Login with 42 (OAuth 2.0) | Authorization-code flow against the 42 intra API (`/api/auth/42` → `/api/auth/42/callback`), `state` parameter for CSRF protection, account auto-provisioned from the 42 profile. | _core_ |
| Artist / hirer profiles | Create and edit a profile (categories, bio, location, availability, organization name for hirers); public profile page for any user. | abessa-m (#91), carlaugu (#88), leoaguia (#80); profile CRUD endpoint #79 absorbed after `mreinald` left |
| Onboarding gate | A fresh artist/hirer account must pick at least one category (and org name for hirers) before the rest of the app unlocks, because matching is keyed on it. | dximenes (#61) |
| Avatar | Upload a profile image (JPEG/PNG/WebP) through the file-upload system — no URL entry; a generated initials avatar is shown when none is set. | abessa-m (#35), dximenes (#36) |
| Media portfolio | Upload image/audio/video files to a profile, with progress, in-browser preview (HTTP Range for video seeking) and delete. | abessa-m (#35), dximenes (#36) |
| Gig posting | Hirers create, edit, close and delete gigs (title, description, category, location, rate). | _core_ |
| Swipe & match | Category-filtered swipe deck (gigs for artists, candidate artists for hirers); mutual like on the same gig auto-creates a match and closes the gig. | _core_; history/pagination: carlaugu (#86/#92) |
| Real-time chat | Per-match 1:1 chat over WebSockets, persisted history with pagination, read receipts, online presence, graceful reconnection. | dximenes (#25/#27), carlaugu (#26) |
| Friends / connections | Send, accept and decline friend requests; friends list with live online status. | carlaugu (#28), dximenes (#29) |
| Notifications | Real-time + persisted notifications for new match, new message, gig closed, like, friend invite and invite accepted; notification centre with mark-as-read; live pushes also raised as transient toasts. | dximenes (#30), leoaguia (#31/#109/#110) |
| Advanced search | Full-text + filtered (category, location, availability), sorted and paginated search over artists, hirers and gigs, with relevance ranking. | dximenes (#24), lgertrud (#103), carlaugu (#88) |
| Internationalization | English / Portuguese / Spanish, language switcher available everywhere, all user-facing text translated; a CI check keeps the three locale files in sync. | dximenes (#39/#40) |
| Admin dashboard | Role-gated area: list/view/edit/delete users, change roles, platform stats. | carlaugu (#113); _core_ |
| Privacy Policy & Terms of Service | Standalone, translated, multi-section legal pages linked from the footer. | lgertrud (#42) |
| API documentation | OpenAPI 3 document served with Swagger UI at `/api/docs` (raw at `/api/docs.json`). | lgertrud (#34) |
| Design system / component library | One internal set of reusable, theme-driven React components (10+), including an app-wide toast system built on daisyUI `alert`; a shared token layer (palette, typography, motion keyframes) in `src/index.css`; a single icon set. | lgertrud, leoaguia |

---

## Modules

Points: **Major = 2**, **Minor = 1**. Target: **17 points** (14 required + a
3-bonus).

### Major modules (5 × 2 = 10 pts)

| # | Module | Why it fits Artmate | How it was implemented | Owner |
|---|---|---|---|---|
| 1 | **Use a framework for frontend and backend** | The app needs structured routing/state on the client and a real HTTP + WebSocket server. | React 19 + Vite on the frontend; Express 5 (TypeScript, ESM) on the backend, organized as `modules/<name>/<name>.routes.ts` + `.service.ts`. | _core_ (whole team) |
| 2 | **Real-time features (WebSockets)** | Chat, presence and notifications must be instant and multi-client. | socket.io gateway with JWT-authenticated handshake, per-user and per-match rooms, broadcast on new match/message/notification, presence events, token-expiry disconnect and reconnection handling. | dximenes (#25), carlaugu (#26) |
| 3 | **Allow users to interact with other users** | Core product loop: discover → match → talk. | Basic chat (send/receive, persisted) inside matches; public profile pages; friends system (add/remove/list with online status). | carlaugu (#26/#28), dximenes (#27/#29) |
| 4 | **Standard user management & authentication** | Every user has an editable identity, an avatar and connections. | Editable artist/hirer profiles; avatar set by **file upload** (image goes through the upload system; a generated initials avatar is the default when none is set); friends with live online status; a profile page; email/password auth with hashing + salting. | abessa-m (#35/#37), dximenes (#29/#36) |
| 5 | **Advanced permissions system** | The platform needs an operator tier for moderation and account management. | Three roles by design — `artist` / `hirer` / `admin` (no separate moderator or guest tier); `requireRole` middleware; admin-only user CRUD (`GET/PUT/DELETE /api/users`) including changing a user's role; role-gated admin routes and UI; role-dependent views and actions across the app (e.g. deleting a chat message is allowed for its sender or an admin). | carlaugu (#113); _core_ (admin UI) |

### Minor modules (7 × 1 = 7 pts)

| # | Module | Why it fits Artmate | How it was implemented | Owner |
|---|---|---|---|---|
| 6 | **Use an ORM** | Relational data with non-trivial relations and migrations. | Prisma over PostgreSQL; full migration history in `srcs/backend/prisma/migrations/`. | abessa-m (#59/#91) |
| 7 | **File upload and management** | Artists need a media portfolio. | multer intake; client- and server-side type/size validation; bytes stored in a named Docker volume behind a single storage module; unguessable-id access control; `<img>`/`<audio>`/`<video>` preview with HTTP Range; XHR upload progress; delete (and cleanup on account deletion). | abessa-m (#35), dximenes (#36) |
| 8 | **Advanced search with filters, sorting and pagination** | Hirers browse a large pool of artists. | `/api/search/{artists,hirers,gigs}` with text search, category/location/availability filters, `newest`/`oldest`/`relevance` sorting, relevance-bucketed pagination, rate-limited. | dximenes (#24), lgertrud (#103), carlaugu (#86/#88/#92) |
| 9 | **Support for multiple languages (≥ 3)** | Portuguese and Spanish speakers are a core audience. | i18next with `en` / `pt` / `es` (484 keys each), browser-detection + persisted choice, a switcher in the auth layout and settings, and `scripts/check-translations.mjs` in CI to prevent drift. | dximenes (#39/#40) |
| 10 | **Remote authentication with OAuth 2.0** | Lower-friction sign-in for 42 students. | "Continue with 42" button on the login and register pages → `GET /api/auth/42` (random `state` in an httpOnly cookie) → 42 authorize → `GET /api/auth/42/callback` verifies `state` (CSRF), exchanges the `code` at `/oauth/token`, reads `/v2/me`, finds-or-creates the user by email, then issues the same session cookies as password login. Failures redirect to `/login?error=oauth`. <!-- TEAM: needs a real registered 42 app in `.env` (`FT_API_UID` / `FT_API_SECRET` / `FT_API_CALLBACK_URL`), the 42 app's redirect URI set to `https://localhost:8443/api/auth/42/callback`, and `FRONTEND_URL=https://localhost:8443`. Verify the full click-through before submission. OAuth users are created with the default `artist` role (no role picker in the OAuth path). --> | _core_ |
| 11 | **Support for additional browsers** | Not everyone uses Chrome. | Chrome (mandatory) + Firefox + Edge/Safari compatibility pass over every feature; browser-specific issues fixed and any residual limitations recorded here. <!-- TEAM: before submission, add `firefox` + `webkit` projects to `playwright.config.ts` so the e2e suite runs on each, and list any browser-specific limitations found during #41. --> | lgertrud (#41) |
| 12 | **Custom-made design system** | A swipe app lives or dies by its UI; the whole product is built from one internal component library rather than ad-hoc markup. | An internal library of reusable React components — `srcs/frontend/src/components/` (Avatar, Modal, Logo, FieldError, LabeledField, FiltersPanel, LanguageSwitcher, …) plus per-feature `components/` folders (MessageBubble, NotificationBell, MessagesIcon, PasswordStrengthChecklist, FriendRequestButton, card/deck primitives, …) and an app-wide toast system (`features/toast/`, a `ToastProvider` + `useToast()` hook rendering daisyUI `alert`s — auto-dismiss, hover-to-pause, de-dupe, capped stack), well over 10 reusable pieces, all theme-driven. A shared visual layer in `src/index.css`: a named colour theme set as the app default, and custom motion primitives reused across the UI (`swipe-card-in`, `modal-pop-in`, `hint-pulse`, `icon-bump`, `fade-in`, `toast-in`). Icons come from one set (`lucide-react`) used consistently everywhere. | lgertrud, leoaguia (frontend UI) |

### Not claimed

- **Public API (Major)** — the team decided not to pursue this module. The
  OpenAPI/Swagger document (#34) still ships at `/api/docs` as internal
  reference, but the dedicated API-key system (#32) and its rate limiting (#33)
  were not implemented, so the module is **not** claimed.

---

## Individual Contributions

Contributions below are grouped from the GitHub issues each member owned.
<!-- TEAM: add, per person, at least one concrete challenge and how it was
     solved — evaluators weigh this. -->

- **abessa-m** — _Product Owner + backend/DB developer._ Database schema
  implementation (#59) and the migration of categories from a free-text string to
  a normalized `Category` table with many-to-many joins (#91); the file-upload
  backend — type/size validation, id-based access control, preview metadata,
  delete and account-deletion cleanup (#35); input-validation hardening across
  frontend and backend (#37); the demo seed data and its bundled media (#95); QA
  on the install flow (#51). Owns [`docs/product_vision.md`](docs/product_vision.md).

- **dximenes** — _Project Manager / Scrum Master + frontend/real-time developer._
  The WebSocket gateway with authenticated handshake and connection lifecycle
  (#25), the real-time chat interface (#27), online-status indicators (#29), the
  notifications model and realtime create/update/delete events (#30); search UI
  with filter chips and pagination (#24); the full i18n setup and EN/PT/ES
  translations (#39, #40); the upload UI with progress bar, preview and delete
  (#36); category selection at registration (#61); the search bar and the
  browser-console cleanup (#118); release management — UAT checklist, bug bash,
  release candidate tag and final submission checklist (#43, #44, #45).

- **carlaugu** — _Tech Lead / Architect + backend developer._ The 1:1 chat
  messaging API and persistence (#26), the friends system — add/remove/list and
  friend requests (#28), the swipe-history endpoint and its pagination (#86,
  #92), profile-mismatch resolution (#88), chat-message deletion gated to the
  message sender or an admin (#113); the Playwright E2E suite covering auth, swipe/match, chat
  and upload (#38). Also scoped the public-API key system and rate limiting
  (#32, #33) before the team dropped that module. Owns the ADRs in
  [`docs/mad/`](docs/mad/).

- **lgertrud** — _Developer._ The Privacy Policy and Terms of Service pages,
  accessible from the footer (#42); the OpenAPI/Swagger API documentation (#34);
  the new filter design (#103); the cross-browser compatibility pass across
  Chrome, Firefox and Edge/Safari (#41); co-owner of the design system — the
  shared token layer (palette, typography, motion) and the reusable component
  library (module 12).

- **leoaguia** — _Developer._ The notifications center UI (#31), animated
  notification and message badges (#110), the compact Messages icon with a live
  unread-count badge replacing the header text (#109), and the profile-edit
  migration of the category field from a string to tag selection (#80);
  co-owner of the design system's reusable components and iconography (module 12),
  including the app-wide toast system that surfaces live notifications.

- **mreinald** _(left the team)_ — contributed early backend work before leaving;
  the remaining developers absorbed the open items, including the ad-hoc backend
  fixes tracked in #66 (env loading), #70 (double password check) and #72/#73
  (auth-middleware consolidation).

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
- **Content Security Policy** is served in `Report-Only` mode (nginx) — it reports
  violations but does not yet block them.
- **No games** — Artmate is not a gaming project, so the gaming modules (and
  anything that depends on a game) are out of scope.
- **Additional browsers** — features were verified manually across Chrome, Firefox
  and Edge/Safari (#41); the automated Playwright suite still runs on Chromium
  only until the `firefox` / `webkit` projects are added (see module 11).

---

## License

*PolyForm Noncommercial License 1.0.0* — see [`LICENSE`](LICENSE).
