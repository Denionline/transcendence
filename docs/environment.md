# Environment Variables

Copy `.env.example` to `.env` before running `make up`.

| Variable          | Required | Used by            | Description                          |
|-------------------|----------|---------------------|---------------------------------------|
| POSTGRES_USER     | yes      | database, backend   | Postgres superuser created on init    |
| POSTGRES_PASSWORD | yes      | database, backend   | Password for POSTGRES_USER            |
| POSTGRES_DB       | yes      | database, backend   | Database name created on init         |


## Notes
- `.env.example` ships with empty values on purpose. Fill them in yourself before copying to `.env`.
- Never commit a real `.env`, it's gitignored; only `.env.example` is tracked.
- `DATABASE_URL` used by the backend is built from these three at container start (see `srcs/docker-compose.yml`).