---
status: "accepted"
date: 2026-08-21
decision-makers: abessa-m
consulted: {carlaugu, dximenes, leoaguia}
informed: {carlaugu, dximenes, leoaguia}
---

# NginX terminates HTTPS in front of a Vite dev server it proxies

## Context and Problem Statement

`docs/subject.md` requires that *"all external connections must use HTTPS"*, and
until now nothing in the compose file terminated TLS at all: the browser talked
to Vite on `:5173` and, through Vite's own proxy, to Express on `:9000`, both in
the clear. Two further consequences followed from having no proxy. Session
cookies were set `secure: NODE_ENV === "production"`, so the cookie carrying a
refresh token travelled unencrypted for the whole of development. And the
in-process rate limiter keys on `req.ip`, which behind any proxy collapses every
caller into one bucket — a defect already written down in `files.routes.ts`.

Adding the proxy raises two questions this record answers: **what it serves**,
and **where its certificate comes from**. Issue #37 covers the surrounding
validation work; this is only the transport half.

## Decision Drivers

* The subject's HTTPS requirement, which is graded.
* A fresh `git clone` must come up with `make up`, no accounts and no manual
  steps — the same constraint `20260706-tech_stack.md` and
  `20260819-file-uploads.md` were both decided under.
* Hot reload is what makes the team's day-to-day loop fast; losing it to satisfy
  a grading requirement would be a bad trade.
* Relative file URLs (`/api/files/<id>/raw`) require the API and the app to
  share one origin — see the note in `docs/environment.md`.
* Time. This is one issue in milestone M5, not a deployment project.

## Considered Options

**What nginx serves:** **S1** proxy `/` to the running Vite dev server ·
**S2** build the frontend and serve `dist/` as static files, dropping the
frontend service · **S3** both, selected by a compose profile.

**Where the certificate comes from:** **C1** self-signed, generated in the
nginx image build · **C2** self-signed, generated at container start into a
volume · **C3** a real certificate from Let's Encrypt · **C4** certificates
committed to the repository.

## Decision Outcome

Chosen options: **S1** and **C1**.

S1 because it satisfies the HTTPS requirement without touching how anyone
works: `make up` behaves as before, HMR survives (the proxy carries the
WebSocket upgrade, and `vite.config.ts` points its HMR client at the published
HTTPS port), and the browser now reaches both the app and the API on one
origin — which is what the relative-URL decision needed. S2 remains the
production-realistic answer and is now a one-service change rather than an
architectural one, because the browser no longer depends on Vite's proxy for
`/api`. It should be its own issue.

C1 because a certificate generated at build time is reproducible from a bare
clone, needs no network, and puts no secret in git. Its cost is a browser
interstitial on first visit, which is documented in the README.

### Consequences

* Good, because every external connection is now TLS, and the backend and
  frontend containers publish no ports at all — the proxy is the only way in.
* Good, because `app.set("trust proxy", 1)` plus the `X-Forwarded-*` headers
  nginx sets make `req.ip` the real caller again, so per-IP rate limiting works
  as it was always meant to, and `req.secure` lets session cookies be `Secure`
  in development rather than only in production.
* Good, because `client_max_body_size` rejects an oversize upload at the proxy,
  before multer buffers a byte.
* Bad, because the Content-Security-Policy has to ship as `Report-Only`: the
  Vite dev server serves inline bootstrap scripts and needs `eval` for HMR, so
  an enforcing policy would break the first page load. Enforcing it is part of
  the S2 follow-up, and the header is already in place to make that a one-line
  change.
* Bad, because `HTTPS_PORT` is now embedded in `FRONTEND_URL` and
  `FT_API_CALLBACK_URL`, and the callback also has to be re-registered on the
  42 application — an external system this repository cannot check.
* Neutral, because Postgres still publishes a host port: the Makefile's Prisma
  targets run on the host and need it.

### Implementation notes

Three details in `srcs/nginx/` are load-bearing and easy to undo by accident:

* `NGINX_ENVSUBST_FILTER: "^NGINX_"` in `docker-compose.yml`. The base image
  runs `templates/` through `envsubst` at container start; without the filter it
  would also substitute nginx's own `$host`, `$scheme`, `$remote_addr` and
  `$proxy_add_x_forwarded_for` with empty strings. The config would still parse
  and would silently forward empty headers, which is why every template variable
  is spelled `${NGINX_...}`.
* `return 301 https://$host:${NGINX_HTTPS_PORT}$request_uri`. `$host` carries no
  port, so the shorter form would send the browser to `:443` — which compose
  does not map.
* The healthcheck targets `127.0.0.1`, not `localhost`. The rendered config has
  only `listen 443 ssl`, so inside the container `localhost` resolving to `::1`
  first would mark a perfectly healthy proxy as down.

### Confirmation

`nginx -t` on the rendered config runs in CI as the `proxy` job, together with
`docker compose config` against `.env.example`, so neither a config typo nor a
compose typo can be merged.

`srcs/nginx/smoke.sh` covers what only a running stack can show. Against
`https://localhost:8443` after `make up`: `/health` answers `{"status":"ok"}`
over TLS 1.2/1.3 and TLS 1.1 is refused; `http://localhost:8080/gigs` 301s to
the same path on HTTPS; the six security headers are present, on error responses
too, and no version banner is; `/`, `/api/`, `/socket.io/` and `/health` each
reach the right upstream; a socket.io handshake forced onto the WebSocket
transport gets `101`; a body past `MAX_UPLOAD_MB` is refused `413` by the proxy;
and `:9000` and `:5173` refuse connections from the host.

## More Information

Superseded reasoning: `STRATEGIES_TO_CHOOSE.md` §A3 judged the nginx work
"the right long-term move, and worth doing if and only if the team is already
planning the Nginx/HTTPS work as a separate task". This is that task.

The remaining follow-up is S2 — serve a built `dist/` from nginx and drop the
Vite container — which also unlocks the enforcing CSP.
