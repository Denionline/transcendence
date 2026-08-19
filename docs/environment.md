# Environment Variables

Copy `.env.example` to `.env` before running `make up`.

| Variable            | Required | Used by            | Description                                                        |
|---------------------|----------|---------------------|--------------------------------------------------------------------|
| POSTGRES_USER       | yes      | database, backend   | Postgres superuser created on init                                 |
| POSTGRES_PASSWORD   | yes      | database, backend   | Password for POSTGRES_USER                                         |
| POSTGRES_DB         | yes      | database, backend   | Database name created on init                                      |
| JWT_SECRET          | yes      | backend             | Secret for signing/verifying access JWTs (HS256)                   |
| JWT_REFRESH_SECRET  | yes      | backend             | Secret for signing/verifying refresh JWTs (must differ from above) |
| FT_API_UID          | yes      | backend             | 42 OAuth application client ID (the app's "UID" on the intranet)   |
| FT_API_SECRET       | yes      | backend             | 42 OAuth application client secret — never commit                  |
| FT_API_CALLBACK_URL | yes      | backend             | Redirect URI registered with the 42 app; must match the callback route exactly (`http://localhost:9000/api/auth/42/callback` in dev) |
| FRONTEND_URL        | yes      | backend, frontend   | Frontend origin, used for CORS and the post-login redirect         |
| UPLOAD_DIR          | no       | backend             | Where uploaded bytes are written. Defaults to `/app/uploads`, the named volume's mount point inside the container |
| MAX_UPLOAD_MB       | no       | backend             | Hard ceiling multer enforces mid-stream, before any per-type cap. Defaults to `50` |


## Notes
- `.env.example` ships with empty values on purpose. Fill them in yourself before copying to `.env`.
- Never commit a real `.env`, it's gitignored; only `.env.example` is tracked.
- There is a **single** template — the root `.env.example`. Every service reads the root `.env` via `env_file` in `srcs/docker-compose.yml`; there is no per-service env file.
- `DATABASE_URL` and `PORT` used by the backend are set by `srcs/docker-compose.yml` at container start (`DATABASE_URL` is built from the three `POSTGRES_*` vars), so they are not listed here.
- Generate the two JWT secrets with `openssl rand -hex 32` (one per secret). `FT_API_UID` / `FT_API_SECRET` come from registering an app at <https://profile.intra.42.fr/oauth/applications/new> with the redirect URI set to `FT_API_CALLBACK_URL`.
- `UPLOAD_DIR` and `MAX_UPLOAD_MB` are the only two variables with defaults, so pulling this branch without editing your `.env` still boots. Crucially, the default applies to an **empty** value too, not just a missing one: `.env.example` ships every key blank, so `UPLOAD_DIR=` is what a fresh copy actually produces, and treating that as "set" would write bytes to the process working directory instead of the volume. The default path exists only inside the container; the test suite and CI point it somewhere they own (see `srcs/backend/test/setup.ts`).
- A *malformed* `MAX_UPLOAD_MB` (non-numeric, zero, negative) is a typo rather than an absence, so `env.ts` throws at startup instead of defaulting. Failing at boot beats every upload returning 413 for reasons nobody can see.
- `MAX_UPLOAD_MB` is a global cut-off, not the real limit. Per-type caps live in `srcs/backend/src/lib/file-limits.ts` (5 MB image, 15 MB audio, 50 MB video) and are always the tighter bound.
- **There is deliberately no variable for the file base URL.** `avatarUrl` and
  every portfolio `url` are *relative* — `/api/files/<id>/raw`, built in one
  place by `fileUrl()` in `srcs/backend/src/modules/files/files.service.ts`. A
  relative path is correct for whoever is already talking to the app, whereas
  an absolute one baked from an env var would be wrong for every other host and
  would have to be regenerated per deployment. The cost is that **the browser
  must reach the API on the same origin as the page**. In development that is
  the Vite dev server, which proxies `/api` to `http://backend:9000`
  (`srcs/frontend/vite.config.ts`). Serving the built `dist/` from a plain
  static server with no such proxy makes every avatar and every preview 404
  against the static server — the fix is to put the reverse proxy in front
  (the Nginx step), not to introduce an absolute-URL variable.
- `FRONTEND_URL` is required and validated at startup (via `env.ts`) — the app won't boot without it, since both the OAuth post-login redirect and the CORS origin for credentialed auth requests depend on it.
