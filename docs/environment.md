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


## Notes
- `.env.example` ships with empty values on purpose. Fill them in yourself before copying to `.env`.
- Never commit a real `.env`, it's gitignored; only `.env.example` is tracked.
- There is a **single** template — the root `.env.example`. Every service reads the root `.env` via `env_file` in `srcs/docker-compose.yml`; there is no per-service env file.
- `DATABASE_URL` and `PORT` used by the backend are set by `srcs/docker-compose.yml` at container start (`DATABASE_URL` is built from the three `POSTGRES_*` vars), so they are not listed here.
- Generate the two JWT secrets with `openssl rand -hex 32` (one per secret). `FT_API_UID` / `FT_API_SECRET` come from registering an app at <https://profile.intra.42.fr/oauth/applications/new> with the redirect URI set to `FT_API_CALLBACK_URL`.
- `FRONTEND_URL` is required and validated at startup (via `env.ts`) — the app won't boot without it, since both the OAuth post-login redirect and the CORS origin for credentialed auth requests depend on it.
