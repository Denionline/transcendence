import os from "node:os";
import path from "node:path";

//	Populates process.env from the repo-root .env. Must come before anything
//	that reads a variable at import time — src/lib/env.ts, above all.
import "../src/lib/load-dotenv.js";

//	That .env sets UPLOAD_DIR to /app/uploads, a path that exists inside the
//	backend container and nowhere else. Tests must never write there, nor into
//	the real volume, so redirect them at a per-pid temp directory. Every suite
//	imports this file first, so the override always wins; test/files.test.ts
//	removes the directory when it is done.
//
//	This lives here rather than in load-dotenv.ts on purpose: `npm run seed`
//	loads the same environment but must write to the *real* UPLOAD_DIR.
process.env.UPLOAD_DIR = path.join(os.tmpdir(), `artmate-test-uploads-${process.pid}`);
