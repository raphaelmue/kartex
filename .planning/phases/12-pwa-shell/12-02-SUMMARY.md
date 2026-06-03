---
phase: 12-02
plan: 02
subsystem: backend/pwa
tags: [pwa, coep, coop, service-worker, cache-control, hono]
requires: []
provides: [coep-coop-headers, sw.js-no-store, workbox-no-store]
affects: [apps/backend/src/index.ts]
tech-stack:
  added: ["hono/secure-headers (built-in to hono ^4.7.9)"]
  patterns: [coep-coop-middleware, sw-cache-control]
key-files:
  created: []
  modified: [apps/backend/src/index.ts]
key-decisions:
  - "secureHeaders registered as step 0 (before health endpoint) to ensure COOP/COEP on all responses including static files and SPA fallback"
  - "crossOriginEmbedderPolicy explicitly set to require-corp (disabled by default in secureHeaders)"
  - "onFound parameter named filePath (not path) to avoid potential shadowing"
requirements-completed: [PWA-04, PWA-05]
duration: "~1 min"
completed: "2026-06-03T20:31:11Z"
---

# Phase 12 Plan 02: Backend COEP/COOP Headers and Service Worker Cache Control Summary

secureHeaders middleware with COOP/COEP added as step 0 in Hono server; explicit /sw.js GET route with Cache-Control: no-store before serveStatic; onFound callback on serveStatic sets no-store for workbox-*.js chunks.

**Duration:** ~1 min | **Tasks:** 2 | **Files:** 1 modified

## Tasks Completed

### Task 1: Add secureHeaders middleware (COEP/COOP)
- Added `import { secureHeaders } from 'hono/secure-headers'` to imports (line 6)
- Inserted secureHeaders app.use('*', ...) block before health endpoint (step 0, lines 20-29)
- crossOriginOpenerPolicy: 'same-origin' + crossOriginEmbedderPolicy: 'require-corp'
- TypeScript compilation: passed (0 errors)
- **Commit:** fb5fad0

### Task 2: Add /sw.js no-store route and onFound callback
- Inserted explicit GET /sw.js route (with readFileSync + no-store header) before serveStatic (step 7a, lines 76-87)
- Modified serveStatic to include onFound callback for workbox-[^/]+\.js$ pattern (step 7b, lines 89-100)
- Step 7 relabeled to 7b; /sw.js route is 7a
- SPA fallback (step 8) unchanged
- TypeScript compilation: passed (0 errors)
- **Commit:** ba422a5

## Verification Results

- crossOriginEmbedderPolicy in index.ts: passed
- secureHeaders import in index.ts: passed
- secureHeaders app.use before health endpoint (line 25 < line 32): passed
- /sw.js route present in index.ts: passed
- /sw.js route before serveStatic (line 78 < line 92): passed
- SPA fallback after serveStatic (line 104 > line 92): passed
- workbox regex in onFound: passed
- yarn workspace @kartex/backend typecheck: passed (0 errors, both tasks)

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- `apps/backend/src/index.ts` exists and contains all required changes: confirmed
- Commit fb5fad0 exists: confirmed (Task 1)
- Commit ba422a5 exists: confirmed (Task 2)

**Next:** Ready for Plan 12-04 (build + smoke test — Wave 3, depends on this plan + Plan 12-03)
