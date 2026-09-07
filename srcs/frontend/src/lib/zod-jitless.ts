import { config } from "zod";

// zod v4 decides whether to use its JIT-compiled fast validators by probing for
// eval support — `new Function("")` inside a try/catch — the first time a schema
// is built. Under our `script-src 'self'` CSP (no 'unsafe-eval') that probe
// trips a securitypolicyviolation report in the console even though zod swallows
// the throw. jitless mode skips the probe entirely and uses the interpreted
// validators; the handful of form schemas here are nowhere near hot enough to
// care about the difference.
//
// This runs as a side effect on import, and main.tsx imports it before anything
// that defines a schema — a schema built before this call would probe first.
config({ jitless: true });
