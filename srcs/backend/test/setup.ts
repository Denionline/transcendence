import os from "node:os";
import path from "node:path";

//	Populates process.env from the repo-root .env. Must come before anything
//	that reads a variable at import time — src/lib/env.ts, above all.
import "../src/lib/load-dotenv.js";

//	That .env sets UPLOAD_DIR to a path that only exists inside the backend
//	container, so redirect tests at a per-pid temp directory. Not in
//	load-dotenv.ts, because `npm run seed` needs the real UPLOAD_DIR.
process.env.UPLOAD_DIR = path.join(os.tmpdir(), `artmate-test-uploads-${process.pid}`);
