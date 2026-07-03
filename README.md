# transcendence

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
## Technical Stack (justifications)
## Database Schema
|              |                |               |              |              |              |
| :---         |     :---:      | :---  | :---         | :---         | :---         |
| USER         | id | login | role (artist/contractor) |
| ARTIST       | id | category (musician/comedian/painter) | bio | availability(yes/no) |
| CONTRACTOR   | id | category (band, venue, collab) | bio | availability(yes/no) |
| FILES        | id | type(audio/video/image) | location |
| SWIPE        | id | swiper_id | swiped_id |
| MATCH/CHAT   | id | artist_id | contractor_id |
| CHAT_MESSAGE | match_id | sender_id | content | time |

Note:
 - when a USER swipes another it creates a SWIPE entry;
 - when two USER have a mutial SWIPE, them a MATCH is set up with its own CHAT;
 - CHAT_MESSAGE is each message on the CHAT

## Features List
## Module list/point breakdown
## Individual Contributions

