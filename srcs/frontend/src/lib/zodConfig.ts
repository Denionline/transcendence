import { z } from "zod";

//	zod v4 JIT-compiles its validators with `new Function`, which trips the
//	`script-src 'self'` CSP (`unsafe-eval`). `jitless` keeps parsing on the
//	plain interpreter path — imperceptible at the size of our form schemas.
//	Imported first from main.tsx so it runs before any schema is used.
z.config({ jitless: true });
