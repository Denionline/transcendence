# ft_transcendence
version 21.1

---

## Preamble
Transcendence is a group project (4-5 people), intended to boost your creativity, self-confidence, adaptability to new technologies, and teamwork skills. You’ll create a real-world web application as a team.

The project is divided into two parts:
*   **The mandatory part:** The fixed core to which every team member must contribute.
*   **A set of modules:** You choose these, and they count toward the final grade.

### Team Organization and Project Management

#### Required Team Roles
Your team must assign the following roles (one person can hold multiple roles if the team has 4 members):

*   **Product Owner (PO):** Defines product vision, prioritizes features, maintains the backlog, makes priority decisions, validates work, and communicates with stakeholders.
*   **Project Manager (PM) / Scrum Master:** Facilitates coordination, organizes meetings, tracks progress/deadlines, ensures communication, and manages risks/blockers.
*   **Technical Lead / Architect:** Defines architecture, makes stack decisions, ensures code quality, and reviews critical code.
*   **Developers (all team members):** Implement features, participate in code reviews, test implementations, and document work.

#### Recommended Project Management Practices
*   Regular communication (weekly/bi-weekly).
*   Task organization tools (GitHub Issues, Trello, etc.).
*   Work breakdown into smaller tasks.
*   Code reviews for important changes.
*   Documentation of decisions.
*   Centralized communication channel (Discord, Slack, etc.).

---

## Mandatory part

The project content is up to your team. You must think about the project as a whole, not just individual features.

### What are we doing?
You must create a comprehensive `README.md`. Examples of projects include a multiplayer Pong game with a tournament system, a collaborative platform, a social network, or any other creative web application that meets the requirements.

### General requirements
*   **Architecture:** Web application requiring a frontend, backend, and a database.
*   **Version Control:** Git must be used with clear commit messages, showing contributions from all members.
*   **Deployment:** Must use a containerization solution (Docker, Podman) and run with a single command.
*   **Browser Compatibility:** Must be compatible with the latest stable Google Chrome; no browser console warnings/errors.
*   **Compliance:** Must include accessible Privacy Policy and Terms of Service pages.
*   **Multi-user Support:** Must support multiple users simultaneously without conflicts or performance issues.

### Technical requirements
*   **Frontend:** Clear, responsive, and accessible across all devices. Use a CSS framework/styling solution.
*   **Environment:** Store credentials in a local `.env` file (ignored by Git); provide an `.env.example`.
*   **Database:** Clear schema with well-defined relations.
*   **Authentication:** Basic user management (sign up/log in). Minimum: email/password with proper hashing.
*   **Validation:** All forms/inputs validated on both frontend and backend.
*   **Security:** All external connections must use HTTPS.

---

## Modules

You need to earn **14 points** in total. Major modules = 2 points, Minor = 1 point.

### Web
*   **Major:** Use a framework for both frontend and backend.
*   **Minor:** Use a frontend framework.
*   **Minor:** Use a backend framework.
*   **Major:** Real-time features (WebSockets).
*   **Major:** User interaction (Chat, Profile, Friends).
*   **Major:** Public API (secured, rate-limited, documentation, 5+ endpoints).
*   **Minor:** Use an ORM.
*   **Minor:** Notification system.
*   **Minor:** Real-time collaborative features.
*   **Minor:** Server-Side Rendering (SSR).
*   **Minor:** PWA with offline support.
*   **Minor:** Custom design system (min 10 reusable components).
*   **Minor:** Advanced search (filters, sorting, pagination).
*   **Minor:** File upload/management system.

### Accessibility and Internationalization
*   **Major:** WCAG 2.1 AA compliance.
*   **Minor:** Support for multiple languages (min 3).
*   **Minor:** RTL language support.
*   **Minor:** Multi-browser compatibility (min 2 additional browsers).

### User Management
*   **Major:** Standard user management (update profile, avatar, friend status, profile page).
*   **Minor:** Game statistics and match history (requires game).
*   **Minor:** OAuth 2.0.
*   **Major:** Advanced permissions (CRUD users, roles).
*   **Major:** Organization system.
*   **Minor:** 2FA.
*   **Minor:** User activity analytics.

### Cybersecurity
*   **Major:** WAF/ModSecurity (hardened) + HashiCorp Vault.

### Gaming and user experience
*   **Major:** Complete web-based game (real-time multiplayer).
*   **Major:** Remote players (network latency handling, reconnection).
*   **Major:** Multiplayer (3+ players).
*   **Major:** Add another game with matchmaking/history.
*   **Major:** Advanced 3D graphics (Three.js/Babylon.js).
*   **Minor:** Advanced chat (block users, game invites, history, etc.).
*   **Minor:** Tournament system.
*   **Minor:** Game customization (power-ups, themes, etc.).
*   **Minor:** Gamification (achievements, badges, leaderboards, etc.).
*   **Minor:** Spectator mode.

### Devops
*   **Major:** ELK stack for log management.
*   **Major:** Monitoring (Prometheus/Grafana).
*   **Major:** Backend as microservices.
*   **Minor:** Health check/status page + automated backups.

### Data and Analytics
*   **Major:** Advanced analytics dashboard.
*   **Minor:** Data export/import (JSON, CSV, XML).
*   **Minor:** GDPR compliance features.

### Blockchain
*   **Major:** Store tournament scores on Blockchain (Avalanche/Solidity).
*   **Minor:** Use ICP for backend.

### Modules of choice
*   **Major/Minor:** Custom modules (must be justified, substantial, and non-trivial).

---

## Readme Requirements
A `README.md` is mandatory at the root. It must include:
*   **Intro:** "This project has been created as part of the 42 curriculum by <login1>[, <login2>...]."
*   **Description:** Goal and overview.
*   **Instructions:** Prerequisites, compilation, and execution.
*   **Resources:** Documentation/tutorials used.
*   **Additional Sections:** Team Information (roles), Project Management (org, tools, comms), Technical Stack (justifications), Database Schema, Features List, Module list/point breakdown, and Individual Contributions.

---

## Bonus part
Bonus points are considered only if 14 mandatory points are fully implemented. You can earn a maximum of 5 bonus points via additional modules (Major=2, Minor=1).

---

## Submission and peer-evaluation
Submit via Git. During evaluation, you must be prepared to demonstrate all modules and potentially perform minor code modifications or debugging if requested to verify your understanding.
