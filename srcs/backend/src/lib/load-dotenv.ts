import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { expand } from "dotenv-expand";

//	Import for the side effect, before anything reads process.env.
//
//	The seed and the test suite both run from srcs/backend, but the real
//	environment lives in the repo-root .env — whose DATABASE_URL contains
//	${POSTGRES_*} placeholders that are only interpolated at container start.
//	Load that file explicitly and expand the interpolations, so a bare
//	`npm test` or `npm run seed` works on the host.
//
//	When the file is absent this is a no-op, which covers both CI (where .env
//	is gitignored and the workflow sets the variables inline) and the backend
//	container (where compose's `env_file: ../.env` has already populated the
//	environment, and the build context does not include the file anyway).
const rootEnv = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../.env");
const result = config({ path: rootEnv, quiet: true });
if (result.parsed) expand(result);
