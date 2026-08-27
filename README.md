# transcendence

[![CI](https://github.com/Denionline/transcendence/actions/workflows/ci.yml/badge.svg)](https://github.com/Denionline/transcendence/actions/workflows/ci.yml)

# Intro
# Description
## Overview
This is a matchmaking platform for artists. Connecting musicians, painters, comedians, etc with hirers (Bands looking for a member, venues looking to book an act, other artists looking for a collab, etc.)

The magic happens when both parties swipe right, unlocking a private conversation. Nothing is sent until both parties have said yes.

### Key features
- **Swipe-based matching**: artists and hirers swipe on each other's profiles; a mutual swipe creates a match.
- **Private chat**: once matched, users unlock a real-time conversation tied to that match.
- **Profiles**: artists (musicians, comedians, painters, etc.) and hirers (bands, venues, collabs) showcase their category, bio, and availability.
- **File uploads**: artists and hirers can attach audio, video, or image files to their profile (portfolio, demo reel, etc.).
- **Real-time updates**: matches and messages are delivered instantly via WebSockets.

## Files structure
```
.
├── Makefile
├── package.json
├── README.md
└── srcs
    ├── backend
    │   ├── Dockerfile
    │   ├── eslint.config.js
    │   ├── package.json
    │   └── prisma
    │       ├── migrations
    │       └── schema.prisma
    ├── database
    │   └── Dockerfile
    ├── docker-compose.yml
    └── frontend
        ├── Dockerfile
        ├── eslint.config.js
        └── package.json
```

---

## Instructions

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- Node.js `<version>` (only needed for local development outside containers)
- A `.env` file at the project root (see `.env.example` for the required variables)

### Compilation
```bash
make
```

### Execution
```bash
make up
```
The application will then be available at:
```
https://localhost:8443
```
The certificate is self-signed and generated when the image is built, so the
browser shows a warning on the first visit — accept it to continue. Plain HTTP
on `http://localhost:8080` only redirects here. Both ports are configurable
via `HTTP_PORT` and `HTTPS_PORT`; see [`docs/environment.md`](docs/environment.md).

### Stopping the project
```bash
make down
```

### Seeding demo data
```bash
make seed
```
Populates the database with a demo cast for manual testing, plus the demo
media behind it — avatars, portfolio images, an audio clip and a short video,
all tracked in the repository so the demo renders with no internet. Runs inside
the backend container, so it needs the stack up (`make up`) rather than just
the database. See [`docs/db_seeding.md`](docs/db_seeding.md).

---

## Resources: Documentation/tutorials used

**Database:**
- [DB-Engines Ranking](https://db-engines.com/en/ranking) — used to compare database options before choosing PostgreSQL.

**Container:**
- [How to Use the Postgres Docker Official Image](https://www.docker.com/blog/how-to-use-the-postgres-docker-official-image/) — used to set up the PostgreSQL container.

**Prisma**
- [Prisma Schema Overview](https://pris.ly/d/prisma-schema) - used as reference

**OAuth 2.0 (standard behind 42 login):**
- [OAuth 2.0 Simplified — Aaron Parecki](https://aaronparecki.com/oauth-2-simplified/) — readable introduction to the Authorization Code flow used for "Login with 42".
- [oauth.net — Authorization Code grant](https://oauth.net/2/grant-types/authorization-code/) — concise reference for the redirect → code → token exchange.
- [RFC 6749 — The OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749) — formal spec; §4.1.3 defines the token-exchange request, §10.12 explains the `state` parameter (CSRF protection).
- [RFC 6750 — Bearer Token Usage](https://datatracker.ietf.org/doc/html/rfc6750) — the `Authorization: Bearer <token>` scheme used to call the 42 profile endpoint.

**42 API (login provider):**
- [Web Application Flow guide](https://api.intra.42.fr/apidoc/guides/web_application_flow) — 42's step-by-step OAuth flow; documents the `/oauth/token` exchange and `access_token` response. *(requires 42 intranet login)*
- [42 API reference](https://api.intra.42.fr/apidoc) — full endpoint list, including `GET /v2/me` and its profile fields (`email`, `login`, `image`). *(requires 42 intranet login)*
- [Getting Started guide](https://api.intra.42.fr/apidoc/guides/getting_started) — app registration, scopes, and rate limits. *(requires 42 intranet login)*

### AI usage disclosure
AI assistance (Claude) was used during this project for:
- Drafting and structuring this README.md.

---

## Team Information

| Member | Role(s) | Responsibilities |
|---|---|---|
| abessa-m | Product Owner | Defines the product vision, prioritizes features, maintains the backlog, validates completed work, and communicates with evaluators/peers. |
| dximenes | Project Manager / Scrum Master | Organizes meetings, tracks progress and deadlines, ensures team communication, manages risks and blockers. |
| carlaugu | Tech Lead / Architect | Defines the technical architecture, makes stack decisions, ensures code quality, reviews critical code changes. |
| mreinald | Developer | Implements assigned features and modules, participates in code review, tests implementations. |
| leoaguia | Developer | Implements assigned features and modules, participates in code review, tests implementations. |

---

## Project Management

- **Team meetings**: Weekly Monday sync to review progress, assign tasks, and address blockers.
- **Task organization**: \<GitHub Issues / Trello / shared board — specify which one is used\>
- **Communication channel**: \<Discord / Slack / other — specify\>
- **Code review**: Every significant change is reviewed by at least one other team member before merging.
- **Documentation**: Key decisions and architecture notes are kept in \<location, e.g. repo wiki or a `/docs` folder\>.

---

## Technical Stack

- **Frontend**: React + Vite
- **Backend**: Express
- **Database**: PostgreSQL, accessed via Prisma ORM
- **Realtime**: Socket.io
- **Reverse proxy**: NginX (handles HTTPS termination on port 443, routes to frontend on `:5173` and backend on `:9000`)
- **Containerization**: Docker / Docker Compose

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
|                |  NginX  |               |
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
- **PostgreSQL** was chosen after comparing options via DB-Engines Ranking, for its strong relational guarantees (important for match/chat integrity) and wide community support.
- **Prisma** provides type-safe queries and migrations on top of PostgreSQL, satisfying the ORM minor module.
- **Socket.io** handles real-time chat and match notifications with graceful reconnection handling.
- **NginX** acts as the single HTTPS entry point into the Docker network, terminating TLS and routing to the frontend and backend containers.

---

## Database Schema

| Table | Purpose |
| :--- | :--- |
| **User** | Account identity: email, username, password hash, role (`artist` / `hirer` / `admin`), avatar |
| **Category** | The controlled vocabulary (`slug` + `label`); referenced by profiles and gigs |
| **ArtistProfile** | Artist-specific fields (bio, location, availability); 1:1 with User; many Categories |
| **HirerProfile** | Hirer-specific fields (organization name, bio, location, availability); 1:1 with User; many Categories |
| **ArtistCategory** / **HirerCategory** | Join tables giving a profile several categories; composite PK prevents duplicates |
| **Gig** | An opportunity posted by a hirer (title, description, location, rate, status); belongs to exactly one Category |
| **File** | Portfolio uploads (image/audio/video/document); belongs to a User |
| **Swipe** | One row per swipe (like or pass), between two Users |
| **Match** | Artist ↔ Hirer match; also serves as the friend/connection relationship |
| **ChatMessage** | Messages within a Match's chat |

**Notes:**
- A mutual `Swipe` (both sides `liked: true`) creates a `Match`.
- `Match` doubles as the friends/connections relationship — no separate `Friend` table.
- Categories live in their own table. A **gig has exactly one**; an **artist or hirer has many**, through a join table. Swipe eligibility is a set intersection on category ids, not a string comparison — see `docs/mad/20260810-categories.md`.
- The vocabulary is served by `GET /api/categories`; the frontend holds no hardcoded list.
- Online/offline status is intentionally not persisted — it's runtime Socket.io connection state, not a database column.

---

## Features List

| Feature | Description | Implemented by |
|---|---|---|
| User signup/login | Email + password auth with hashed/salted passwords | \<name\> |
| Artist/Hirer profiles | Create and edit profile (categories, bio, availability) | \<name\> |
| Swipe & match system | Swipe on other users, auto-create match on mutual swipe | \<name\> |
| Private chat | Send/receive messages within a match | \<name\> |
| File uploads | Attach audio/video/image files to a profile | \<name\> |
| Notifications | Alerts for new matches and messages | \<name\> |
| Privacy Policy / Terms of Service | Accessible legal pages with relevant content | \<name\> |

---

## Module list / point breakdown

| Module | Type | Points | Justification |
|---|---|---|---|
| Use a framework (frontend + backend) | Major | 2 | React + Vite frontend, Express backend. |
| Implement real-time features (Socket.io) | Major | 2 | Needed for instant chat and match notifications. |
| Allow users to interact (chat, profile, friends/swipes) | Major | 2 | Core to the swipe/match/chat experience. |
| Standard user management | Major | 2 | Profile editing, avatar/file upload, availability status. |
| Use an ORM for the database | Minor | 1 | Prisma on top of PostgreSQL. |
| File upload and management system | Minor | 1 | Audio/video/image attachments on profiles. |
| \<Add more modules chosen\> | \<Major/Minor\> | \<2/1\> | \<Why this module fits ArtMate\> |

**Total points targeted:** 10 / 14 minimum required *(add more modules to close the gap)*

---

## Individual Contributions

- **abessa-m**: \<detailed breakdown of contributions, features/modules owned, challenges faced\>
- **dximenes**: \<detailed breakdown of contributions, features/modules owned, challenges faced\>
- **carlaugu**: \<detailed breakdown of contributions, features/modules owned, challenges faced\>
- **mreinald**: \<detailed breakdown of contributions, features/modules owned, challenges faced\>
- **leoaguia**: \<detailed breakdown of contributions, features/modules owned, challenges faced\>

---

## Known Limitations
## License

 *PolyForm Noncommercial License 1.0.0*
