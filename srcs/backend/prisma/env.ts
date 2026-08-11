import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { expand } from "dotenv-expand";

// Mirrors test/setup.ts: this script runs on the host against the db
// container's published port (see `make seed`), so it needs the repo-root
// .env — whose DATABASE_URL contains ${POSTGRES_*} placeholders — loaded and
// expanded before anything imports the Prisma client. Import this module
// first, before any import that touches ../src/lib/prisma.js, so the
// PrismaClient constructor sees a resolved DATABASE_URL.
const rootEnv = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env");
const result = config({ path: rootEnv, quiet: true });
if (result.parsed) expand(result);
