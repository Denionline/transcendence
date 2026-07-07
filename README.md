# transcendence
<<<<<<< HEAD

# Intro
# Description
## Overview
This is a matchmaking platform for artists. Connecting musicians, painters, comedians, etc with contractor (Bands looking for a member, venues looking to book an act, other artists looking for a collab, etc.)

The magic happens whem both swipe right, unlocking a private conversation. Nothing is sent until both parties have said yes.

# Instructions
## Prerequisites
## Compilation
## Execution
# Resources: Documentation/tutorials used.
# Additional Sections
## Team Information (roles)
## Project Management (org, tools, comms)
## Technical Stack
Frontend: React + Vite
Backend: Express
Database: PrismORM + Posgres
Realtime: socker.io
```
┌─────────┐     ┌──────────┐     ┌────────────┐
│  Nginx  │────▶│  React   │     │  Express   │
│  :443   │     │  :3000   │     │  :9000     │
│  :80    │     │ (CSS)    │     │            │
└────┬────┘     └──────────┘     └──────┬─────┘
     │                                  │
     │  ┌───────────────────────────────┘
     │  │
     ▼  ▼       ┌────────────┐
  ┌──────────┐  │ PostgreSQL │
  │ /uploads │  │  :5432     │
  │ (volume) │  └────────────┘
  └──────────┘                
```
## Database Schema
|              |    |      |      |      |      |
| :---         | :--- | :--- | :--- | :--- | :--- |
| USER         | uuid | login | role (artist/contractor) |
| ARTIST       | uuid | category (musician/comedian/painter) | bio | availability(yes/no) |
| CONTRACTOR   | uuid | category (band, venue, collab) | bio | availability(yes/no) |
| FILES        | uuid | type(audio/video/image) | location |
| SWIPE        | uuid | swiper_id | swiped_id |
| MATCH/CHAT   | uuid | artist_id | contractor_id |
| CHAT_MESSAGE | uuid | match_id | sender_id | content | time |

Note:
 - when a USER swipes another it creates a SWIPE entry;
 - when two USER have a mutial SWIPE, them a MATCH is set up with its own CHAT;
 - CHAT_MESSAGE is each message on the CHAT

## Features List
## Module list/point breakdown
## Individual Contributions
=======
>>>>>>> 16c4825 (chore: adapted .gitignore)

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
Frontend: React + Vite
Backend: Express
Database: PrismORM + Posgres
Realtime: socker.io
```
┌─────────┐     ┌──────────┐     ┌────────────┐
│  Nginx  │────▶│  React   │     │  Express   │
│  :443   │     │  :3000   │     │  :9000     │
│  :80    │     │ (CSS)    │     │            │
└────┬────┘     └──────────┘     └──────┬─────┘
     │                                  │
     │  ┌───────────────────────────────┘
     │  │
     ▼  ▼       ┌────────────┐
  ┌──────────┐  │ PostgreSQL │
  │ /uploads │  │  :5432     │
  │ (volume) │  └────────────┘
  └──────────┘                
```
## Database Schema
|              |    |      |      |      |      |
| :---         | :--- | :--- | :--- | :--- | :--- |
| USER         | uuid | login | role (artist/contractor) |
| ARTIST       | uuid | category (musician/comedian/painter) | bio | availability(yes/no) |
| CONTRACTOR   | uuid | category (band, venue, collab) | bio | availability(yes/no) |
| FILES        | uuid | type(audio/video/image) | location |
| SWIPE        | uuid | swiper_id | swiped_id |
| MATCH/CHAT   | uuid | artist_id | contractor_id |
| CHAT_MESSAGE | uuid | match_id | sender_id | content | time |

Note:
 - when a USER swipes another it creates a SWIPE entry;
 - when two USER have a mutial SWIPE, them a MATCH is set up with its own CHAT;
 - CHAT_MESSAGE is each message on the CHAT

## Features List
## Module list/point breakdown
## Individual Contributions
