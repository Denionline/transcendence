# transcendence

[![CI](https://github.com/Denionline/transcendence/actions/workflows/ci.yml/badge.svg)](https://github.com/Denionline/transcendence/actions/workflows/ci.yml)

# Intro
# Description
## Overview
This is a matchmaking platform for artists. Connecting musicians, painters, comedians, etc with contractor (Bands looking for a member, venues looking to book an act, other artists looking for a collab, etc.)

The magic happens whem both swipe right, unlocking a private conversation. Nothing is sent until both parties have said yes.

## Files structure

```
.
├── Makefile
├── package.json
├── README.md
└── srcs
    ├── backend
    │   ├── Dockerfile
    │   ├── eslint.config.js
    │   └── package.json
    ├── database
    │   └── Dockerfile
    ├── docker-compose.yml
    └── frontend
        ├── Dockerfile
        ├── eslint.config.js
        └── package.json
```

# Instructions
## Prerequisites
## Compilation
## Execution
# Resources: Documentation/tutorials used.
# Additional Sections
## Team Information (roles)
## Project Management (org, tools, comms)
## Technical Stack

- **Frontend**: React + Vite
- **Backend**: Express
- **Database**: PostgreSQL, accessed via Prisma ORM
- **Realtime**: Socket.io
- **Reverse proxy**: NginX (handles HTTPS termination on port 443, routes to frontend on `:3000` and backend on `:9000`)
- **Containerization**: Docker / Docker Compose

### Architecture

```
                ┌───────────┐
                |  Browser  |
                └────┬──────┘
                https| ▲
┌──────────────────────────────────────────┐
│  Docker            | |                   |
|                    ▼ |:443               |
│                ┌─────────┐               |
|                |  NginX  |               |
|                └─────────┘               |
|            :3000|       |:9000           |
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

| Table | Fields |
| :--- | :--- |
| **USER** | `uuid`, `login`, `role` (artist/contractor) |
| **ARTIST** | `uuid`, `category` (musician/comedian/painter), `bio`, `availability` (yes/no) |
| **CONTRACTOR** | `uuid`, `category` (band/venue/collab), `bio`, `availability` (yes/no) |
| **FILES** | `uuid`, `type` (audio/video/image), `location` |
| **SWIPE** | `uuid`, `swiper_id`, `swiped_id` |
| **MATCH/CHAT** | `uuid`, `artist_id`, `contractor_id` |
| **CHAT_MESSAGE** | `uuid`, `match_id`, `sender_id`, `content`, `time` |

**Notes:**
- When a USER swipes another, it creates a SWIPE entry.
- When two USERs have a mutual SWIPE, a MATCH is set up along with its own CHAT.
- CHAT_MESSAGE represents each individual message sent within a CHAT.

> Add primary/foreign key details and an ER diagram image once the schema is fully implemented.

---

## Features List

| Feature | Description | Implemented by |
|---|---|---|
| User signup/login | Email + password auth with hashed/salted passwords | \<name\> |
| Artist/Contractor profiles | Create and edit profile (category, bio, availability) | \<name\> |
| Swipe & match system | Swipe on other users, auto-create match on mutual swipe | \<name\> |
| Private chat | Send/receive messages within a match | \<name\> |
| File uploads | Attach audio/video/image files to a profile | \<name\> |
| Notifications | Alerts for new matches and messages | \<name\> |
| Privacy Policy / Terms of Service | Accessible legal pages with relevant content | \<name\> |

> Expand this table as features are completed.

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

> Fill in the full list of chosen modules, how each was implemented, and which team member(s) worked on it. Remember: custom "Modules of choice" require detailed justification (why it was chosen, what challenge it solves, why it deserves Major/Minor status).

---

## Individual Contributions

# Intro
# Description
## Overview
This is a matchmaking platform for artists. Connecting musicians, painters, comedians, etc with contractor (Bands looking for a member, venues looking to book an act, other artists looking for a collab, etc.)

The magic happens when both parties swipe right, unlocking a private conversation. Nothing is sent until both parties have said yes.

### Key features
- **Swipe-based matching**: artists and contractors swipe on each other's profiles; a mutual swipe creates a match.
- **Private chat**: once matched, users unlock a real-time conversation tied to that match.
- **Profiles**: artists (musicians, comedians, painters, etc.) and contractors (bands, venues, collabs) showcase their category, bio, and availability.
- **File uploads**: artists and contractors can attach audio, video, or image files to their profile (portfolio, demo reel, etc.).
- **Real-time updates**: matches and messages are delivered instantly via WebSockets.

> This is a group project developed as part of the 42 Porto Common Core (ft_transcendence).

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
    │   └── package.json
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
> Update with the exact `make`/`docker compose` targets once the Makefile is finalized.

### Execution
```bash
docker compose -f srcs/docker-compose.yml up --build
```
The application will then be available at:
```
https://localhost
```
(served through NginX on port 443 — see architecture diagram below)

### Stopping the project
```bash
docker compose -f srcs/docker-compose.yml down
```

---

## Resources: Documentation/tutorials used

**Database:**
- [DB-Engines Ranking](https://db-engines.com/en/ranking) — used to compare database options before choosing PostgreSQL.

**Container:**
- [How to Use the Postgres Docker Official Image](https://www.docker.com/blog/how-to-use-the-postgres-docker-official-image/) — used to set up the PostgreSQL container.

**Prisma**
- https://pris.ly/d/prisma-schema

### AI usage disclosure
AI assistance (Claude) was used during this project for:
- Drafting and structuring this README.md.
- \<Add other concrete uses, e.g. "debugging the WebSocket reconnection logic", "generating boilerplate for the profile CRUD endpoints", "reviewing the database schema design"\>

Each team member reviewed and validated any AI-assisted code or content before integrating it into the project, and can explain its logic during evaluation, per the 42 AI guidelines.

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
- **Reverse proxy**: NginX (handles HTTPS termination on port 443, routes to frontend on `:3000` and backend on `:9000`)
- **Containerization**: Docker / Docker Compose

### Architecture

```
                ┌───────────┐
                |  Browser  |
                └────┬──────┘
                https| ▲
┌──────────────────────────────────────────┐
│  Docker            | |                   |
|                    ▼ |:443               |
│                ┌─────────┐               |
|                |  NginX  |               |
|                └─────────┘               |
|            :3000|       |:9000           |
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

| Table | Fields |
| :--- | :--- |
| **USER** | `uuid`, `login`, `role` (artist/contractor) |
| **ARTIST** | `uuid`, `category` (musician/comedian/painter), `bio`, `availability` (yes/no) |
| **CONTRACTOR** | `uuid`, `category` (band/venue/collab), `bio`, `availability` (yes/no) |
| **FILES** | `uuid`, `type` (audio/video/image), `location` |
| **SWIPE** | `uuid`, `swiper_id`, `swiped_id` |
| **MATCH/CHAT** | `uuid`, `artist_id`, `contractor_id` |
| **CHAT_MESSAGE** | `uuid`, `match_id`, `sender_id`, `content`, `time` |

**Notes:**
- When a USER swipes another, it creates a SWIPE entry.
- When two USERs have a mutual SWIPE, a MATCH is set up along with its own CHAT.
- CHAT_MESSAGE represents each individual message sent within a CHAT.

> Add primary/foreign key details and an ER diagram image once the schema is fully implemented.

---

## Features List

| Feature | Description | Implemented by |
|---|---|---|
| User signup/login | Email + password auth with hashed/salted passwords | \<name\> |
| Artist/Contractor profiles | Create and edit profile (category, bio, availability) | \<name\> |
| Swipe & match system | Swipe on other users, auto-create match on mutual swipe | \<name\> |
| Private chat | Send/receive messages within a match | \<name\> |
| File uploads | Attach audio/video/image files to a profile | \<name\> |
| Notifications | Alerts for new matches and messages | \<name\> |
| Privacy Policy / Terms of Service | Accessible legal pages with relevant content | \<name\> |

> Expand this table as features are completed.

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

> Fill in the full list of chosen modules, how each was implemented, and which team member(s) worked on it. Remember: custom "Modules of choice" require detailed justification (why it was chosen, what challenge it solves, why it deserves Major/Minor status).

---

## Individual Contributions

- **abessa-m**: \<detailed breakdown of contributions, features/modules owned, challenges faced\>
- **dximenes**: \<detailed breakdown of contributions, features/modules owned, challenges faced\>
- **carlaugu**: \<detailed breakdown of contributions, features/modules owned, challenges faced\>
- **mreinald**: \<detailed breakdown of contributions, features/modules owned, challenges faced\>
- **leoaguia**: \<detailed breakdown of contributions, features/modules owned, challenges faced\>

---

## Known Limitations

- \<list any known limitations or future improvements\>

## License

 *PolyForm Noncommercial License 1.0.0*
