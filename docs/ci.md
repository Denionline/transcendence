# Continuous Integration

A basic CI pipeline runs on GitHub Actions to prevent broken code from being
merged into `main`. The workflow is defined in
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

## When it runs

- On every **push to `main`**.
- On every **pull request targeting `main`**.

Superseded runs on the same branch/PR are cancelled automatically.

## Jobs

| Job     | What it does                                                                 |
| ------- | --------------------------------------------------------------------------- |
| `lint`  | Runs ESLint (with the shared Prettier rules) on `frontend` and `backend`.   |
| `build` | Builds the frontend production bundle (`vite build`), validates thge Prisma schema (`prisma validate`) and syntax-checks the backend entrypoint (`node --check`). |
| `test`  | Runs the backend test suite (`node --test`).                                |

All jobs use Node 22, matching the `node:22-alpine` base image used by the
Docker services. Dependencies are installed with `npm install` because
`package-lock.json` files are not committed (see `.gitignore`); switch to
`npm ci` if/when lockfiles are added.

## Protecting the `main` branch

The checks above only *block* merges once `main` is protected. This must be
done once by a repository administrator (Settings → Branches → Add rule):

1. **Branch name pattern:** `main`
2. Enable **Require a pull request before merging**.
3. Enable **Require status checks to pass before merging** and select:
   - `Lint (frontend)`
   - `Lint (backend)`
   - `Test`
   - `Build`
4. (Recommended) Enable **Require branches to be up to date before merging**.
5. Save the rule.

> The status checks only appear in the list *after* the workflow has run at
> least once (e.g. after opening the first pull request that includes this
> workflow), so open a PR first, then add them to the rule.

Once configured, a pull request cannot be merged into `main` unless lint,
build, and test all pass.
