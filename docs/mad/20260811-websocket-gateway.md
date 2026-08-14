---
status: "accepted"
date: 2026-08-12
decision-makers: carlaugu
consulted: {abessa-m, dximenes, leoaguia}
informed: {abessa-m, dximenes, leoaguia}
---

# Real-time gateway on socket.io, not raw ws

## Context and Problem Statement

The backend needed a way to push events to already-connected clients — new chat
messages, presence changes — without the client polling. `Match` and `ChatMessage`
already existed in the Prisma schema (`Match` rows are created by the swipe flow), but
nothing wrote or read `ChatMessage`, and there was no channel through which the server
could tell an already-connected client "a new message arrived" or "a match just came
online". This called for a persistent, bidirectional connection layered on top of the
existing Express/JWT stack, authenticated the same way as the rest of the API.

## Decision Drivers

* Reuse the existing JWT authentication (`verifyAccessToken`) instead of a parallel auth
  mechanism
* Only authenticated users, and only for their own matches, may join a chat channel
* A message sent to a match must reach every device the recipient has open, and no one
  else
* Presence updates must account for multiple simultaneous connections from the same user
* Minimise custom protocol code, given the size of the team

## Considered Options

* Raw `ws` — the WebSocket library with no framework on top
* `socket.io`

## Decision Outcome

Chosen option: "socket.io", because it ships the primitives this feature needed —
rooms, an `io.use` auth-middleware hook that mirrors Express, and acknowledged emits —
instead of requiring them to be hand-built on raw `ws`.

* `io.use` runs once per connection, at the handshake, calling the same
  `verifyAccessToken` function `requireAuth` uses for HTTP — one source of truth for
  what a valid token is.
* Every connection joins a personal room (`user:<id>`), a room per match
  (`chat:<matchId>`), and a room for its own session (`session:<id>`, see below) — the
  match rooms are decided by the server from the caller's own matches and never trusted
  from client input. `send_message` checks `socket.rooms.has(room)` before writing
  anything, so a client cannot write into a match it does not belong to.
* Presence (`user_online` / `user_offline`) is derived from room membership rather than
  a hand-rolled counter: a user is announced offline only once their personal room's
  socket count reaches zero, so one of several open devices disconnecting does not
  falsely mark the user away. The offline broadcast reads `socket.rooms` from the
  `"disconnecting"` event, not `"disconnect"` — by the time `"disconnect"` fires,
  socket.io has already removed the socket from every room, leaving nothing to read.
* A match formed while both participants are already connected does not need a
  reconnect to become live. Match creation emits an internal `new_match` event carrying
  both participants' ids; the gateway joins any of their already-connected sockets to
  the new match's room (`io.in(user:<id>).socketsJoin(chat:<matchId>)`) and broadcasts
  the notice to that room. Whether a match's counterpart is online is never read from
  event history — `GET /api/matches` computes `counterpartOnline` live, from the same
  room registry, on every call, so a client gets the correct answer regardless of when
  it connected or which events it missed.
* An access token issued for 15 minutes does not stop being trusted just because the
  socket stays open longer than that. Each connection schedules a timer for the token's
  own `exp` claim; when it fires, the server uses an acknowledged emit
  (`socket.timeout(...).emit("token_expired", ack)`) to give the client a chance to
  receive the notice before the connection is force-closed with `disconnect(true)`,
  requiring a reconnect with a refreshed token.
* Sending a message has two entry points — a socket.io `send_message` event and a REST
  `POST /api/matches/:matchId/messages` — but only one write path: both call the same
  `createMessage` service function, so persistence never diverges between them. The REST
  route emits an internal `send_message` event afterward purely so the gateway can
  broadcast `new_message` to the room the same way it does for the socket.io path.
  Neither path can rely on the room broadcast to tell the sender their own message's id —
  `socket.to()` excludes the sender by design, and a fire-and-forget internal event has no
  return value at all — so each path gets the created row's id back on its own channel
  instead: an acknowledged emit for socket.io, the HTTP response body for REST.
* Logging out closes the matching socket immediately, not just at token expiry. Each
  access token carries a `sessionId` — the hash of its paired refresh token, the same
  value already used as that refresh token's database key — and every connection joins a
  room named after it. `logoutUser` cannot reach `io` directly without coupling the auth
  module to the transport module, so it emits a `logout` event on a small internal
  `EventEmitter` (`auth-events.ts`) instead; the gateway listens and calls
  `io.in(session:<id>).disconnectSockets(true)`. Because a copy of a stolen access token
  carries the identical `sessionId`, this also closes a connection using a stolen copy of
  that same token the moment the legitimate owner logs out — without a database lookup on
  either side, and without revoking any of that user's other, differently-keyed sessions.

### Consequences

* Good, because the same JWT and the same verification function protect both HTTP and
  WebSocket — no second auth system to keep in sync.
* Good, because rooms make both authorization (checking membership) and fan-out
  (broadcasting to everyone in a room) a few lines of built-in API, rather than an
  in-memory map maintained by hand.
* Good, because acknowledged emits gave a working way to notify a client before forcibly
  closing its connection, without inventing a custom handshake for it.
* Good, because logout revocation piggybacks on a value (the refresh-token hash) that
  already existed as a database key, so no new lookup or storage was needed to make it
  session-scoped rather than all-or-nothing for the user.
* Good, because presence is a live query (`isUserOnline`, backed by the same room
  registry) rather than a cached flag, so it can never go stale and needs no write path
  of its own — it costs nothing until something actually asks.
* Neutral, because `auth.service.ts` now emits a `logout` event that, today, only the
  WebSocket module listens to — an indirection whose only present purpose is keeping the
  auth module unaware that WebSocket exists.
* Bad, because a client that is offline when a match partner sends a message only learns
  about it the next time it fetches matches over HTTP — there is no unread/missed-message
  tracking yet.

## Pros and Cons of the Options

### socket.io

* Good, because rooms, broadcast, and acknowledged emits are built in.
* Good, because `io.use` mirrors Express middleware, so the mental model transfers
  directly.
* Good, because reconnection and heartbeat (ping/pong) handling ship without extra code.
* Bad, because its wire format is not plain WebSocket — a client not using the socket.io
  library cannot talk to it.

### Raw `ws`

* Good, because it speaks the WebSocket protocol directly, with nothing else added.
* Bad, because rooms, broadcast-to-a-group, auth-at-handshake, and acknowledgements would
  all have to be built and maintained by hand.
* Bad, because reconnection and heartbeat handling are also left to the implementer.
