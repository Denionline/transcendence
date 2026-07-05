# Product Definition — [Project Name TBD]

> Living document. Owner: Product Owner. Last updated: 2026-07-03.

## 1. Product Vision Statement

**For** performing and visual artists who struggle to find paid work, **and** venues, event organizers, and individuals who struggle to find the right talent, **[Project Name]** is a web platform that matches artists with hirers through a fast, swipe-based discovery experience. **Unlike** generic job boards or scattered social media outreach, our platform makes the matching mutual: a conversation only opens when both sides express interest, cutting spam and wasted time for everyone.

One-liner: *"Tinder for gigs — artists and hirers match, then talk."*

### What problem does it solve?
- **Artists** waste time cold-emailing venues and get ignored; their portfolios are scattered across platforms.
- **Hirers** are flooded with irrelevant applications and have no quick way to browse available, relevant talent.
- **Both** lack a trusted, structured space to discover each other, verify profiles, and start a conversation.

## 2. Personas

### Persona 1 — The Artist ("Maya")
- **Who:** 26-year-old singer/guitarist, plays weekend gigs, day job on the side.
- **Goals:** Find paid gigs near her, showcase her portfolio (audio clips, photos, videos), build a reputation.
- **Frustrations:** Cold outreach gets ignored; no central place to be "discoverable"; scheduling back-and-forth.
- **Needs from the app:** A rich profile (bio, media portfolio, tags like genre/skills/location/rate), a feed of relevant gig opportunities to swipe on, instant chat when matched, notifications when a hirer likes her.

### Persona 2 — The Hirer ("Tomás")
- **Who:** 38-year-old manager of a bar in Porto that hosts live music every Friday.
- **Goals:** Quickly find reliable artists that fit his venue's style, budget, and dates.
- **Frustrations:** Sifting through irrelevant applicants; can't judge quality without seeing/hearing work; ghosting.
- **Needs from the app:** Powerful search and filters (genre, location, availability, rate range), artist cards with media previews, swipe to shortlist, chat only with mutual matches, ability to post a gig listing.

### Persona 3 — The Admin ("Sofia")
- **Who:** Platform operator / moderator.
- **Goals:** Keep the platform safe and trustworthy.
- **Frustrations:** Fake profiles, inappropriate content, abusive messages.
- **Needs from the app:** Admin dashboard with user CRUD, role management (admin / moderator / user / guest), ability to review reported content/profiles, suspend or delete accounts, view platform activity.

## 3. Core Flows

### Flow A — Onboarding
1. Landing page → Sign up with **email + password** or **OAuth 2.0** (Google / GitHub / 42).
2. Choose account type: **Artist** or **Hirer** (Admin accounts are provisioned, not self-registered).
3. Profile setup wizard:
   - Artist: name, bio, tags (genre, skills), location, rate, **avatar upload** (default avatar if skipped), **portfolio uploads** (images, audio, documents).
   - Hirer: venue/organization name, description, location, avatar/logo.
4. Pick language (EN / PT / +1 more — i18n switcher available everywhere).
5. Land on the discovery (swipe) screen.

### Flow B — Discovery / Swipe
1. User sees a card stack: artists see gigs/hirers, hirers see artist cards (photo, name, tags, short bio, media preview).
2. **Filters** (advanced search module): location radius, tags/genre, rate range, availability — with sorting and pagination behind the scenes.
3. Swipe right = interested, swipe left = pass. (Buttons as keyboard/click fallback.)
4. A right-swipe is stored as a "like"; the other party is **not** notified unless it becomes a match.

### Flow C — Match
1. When both parties have liked each other → a **match** is created.
2. Both users get a **real-time notification** (WebSocket) and a match animation/modal.
3. The match appears in each user's Matches list, and they are added to each other's **connections/friends list** with online status visible.

### Flow D — Chat
1. From a match (or the friends list), open a 1-to-1 **real-time chat** (WebSocket).
2. Messages are persisted; history loads on open.
3. Online/offline status shown; graceful reconnection on connection drops.
4. From chat, users can open each other's full profile.

### Flow E — Admin (secondary)
1. Admin logs in → role-based routing to the admin dashboard.
2. CRUD on users, role assignment, content review, suspension/deletion.

## 4. MVP Scope (maps to mandatory part + chosen modules)

| Area | In MVP | Module(s) covered |
|---|---|---|
| Auth | Email/password (hashed + salted), OAuth 2.0, sessions | Mandatory + OAuth (minor) |
| Profiles | Artist & Hirer profiles, edit info, avatar with default, profile page | Standard user management (major) |
| Discovery | Swipe interface, like/pass, filters, sorting, pagination | Advanced search (minor) |
| Matching | Mutual-like match creation, match list | Core product logic |
| Chat | 1-to-1 real-time chat, message persistence | User interaction (major) + WebSockets (major) |
| Friends | Connections list from matches, add/remove, online status | User interaction (major) |
| Portfolio | Upload images/audio/docs, validation, preview, delete, progress | File upload (minor) |
| Notifications | Real-time match & message notifications | WebSockets (major) |
| Roles | Admin dashboard, user CRUD, roles, role-based views | Advanced permissions (major) |
| API | Public REST API, ≥5 endpoints, API key, rate limiting, docs | Public API (major) |
| Data | ORM with clear schema and relations | ORM (minor) |
| i18n | 3 languages, switcher, all text translatable | Multiple languages (minor) |
| Browsers | Chrome (mandatory) + Firefox + Safari/Edge tested | Additional browsers (minor) |
| Stack | Frontend framework + backend framework | Web frameworks (major) |
| Legal | Privacy Policy + Terms of Service pages, footer links | Mandatory |
| Infra | Docker single-command deploy, HTTPS, .env + .env.example | Mandatory |

**Module point check:** 6 majors (frameworks, WebSockets, user interaction, public API, standard user management, advanced permissions) = 12 pts, plus 6 minors (ORM, advanced search, file upload, i18n, additional browsers, OAuth) = 6 pts → **18 points total**, a 4-point buffer over the required 14 — good insurance if a module isn't validated during evaluation.
