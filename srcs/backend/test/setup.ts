import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { expand } from "dotenv-expand";

// Tests run from srcs/backend, but the real environment lives in the repo-root
// .env — whose DATABASE_URL contains ${POSTGRES_*} placeholders that are only
// interpolated at container start. Load that file explicitly and expand the
// interpolations so a bare `npm test` (or a single-file run) works on the host.
// In CI the .env file is gitignored (absent), so this is a no-op and the
// workflow's inline env vars are used instead.
const rootEnv = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env");
const result = config({ path: rootEnv, quiet: true });
if (result.parsed) expand(result);
