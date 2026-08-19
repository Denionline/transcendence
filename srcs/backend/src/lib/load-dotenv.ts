import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { expand } from "dotenv-expand";

//	Import for the side effect, before anything reads process.env. The seed
//	and the test suite run from srcs/backend, but the real environment lives
//	in the repo-root .env, whose DATABASE_URL needs expanding. A no-op when
//	the file is absent, which covers CI and the container.
const rootEnv = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../.env");
const result = config({ path: rootEnv, quiet: true });
if (result.parsed) expand(result);
