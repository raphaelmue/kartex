---
phase: 12-04
plan: 04
subsystem: frontend/pwa + backend/pwa
tags: [pwa, build-verification, lighthouse, smoke-test, coep, coop, service-worker]
requires: [12-01, 12-02, 12-03]
provides: [pwa-build-verified, lighthouse-audit-passed, http-headers-verified]
affects: [apps/frontend/vite.config.ts, apps/backend/src/index.ts]
tech-stack:
  added: []
  patterns: [production-build-verification, http-header-smoke-test, lighthouse-pwa-audit]
key-files:
  created: []
  modified: [apps/frontend/vite.config.ts, apps/backend/src/index.ts]
key-decisions:
  - "maximumFileSizeToCacheInBytes set to 3 MiB — main bundle (2.16 MB) exceeded Workbox default 2 MiB limit"
  - "seedAdminIfNeeded wrapped in try-catch — Hono now starts gracefully without a DB connection (admin seed skipped with warning)"
requirements-completed: [PWA-01, PWA-02, PWA-03, PWA-04, PWA-05]
duration: "~15 min"
completed: "2026-06-03"
---

# Phase 12 Plan 04: Production Build Verification and Lighthouse PWA Audit Summary

Production build passes cleanly (precache 12 entries, 2297 KiB, no WASM in manifest); all HTTP header smoke tests pass (COOP/COEP on GET /, Cache-Control: no-store on sw.js and workbox chunk); Lighthouse PWA audit approved by human checkpoint (installable, SW registers, no COEP blocking errors).

**Duration:** ~15 min | **Tasks:** 3 (Tasks 1-2 automated, Task 3 human checkpoint) | **Files:** 2 modified (auto-fixes)

## Tasks Completed

### Task 1: Production build and Workbox artifact inspection

- Ran: `yarn workspace @kartex/frontend build` → exit code 0
- Build output: `PWA v1.3.0 — precache 12 entries (2297.26 KiB)` — no errors
- **Deviation (auto-fixed):** Initial build failed with `maximumFileSizeToCacheInBytes` error — main bundle is 2.16 MB, exceeding the Workbox default 2 MiB limit. Added `maximumFileSizeToCacheInBytes: 3 * 1024 * 1024` to `workbox` config in vite.config.ts. Commit: `df063be`
- manifest.webmanifest verified: `display: standalone`, `name: Kartex`, icons with 192×192 and 512×512 entries
- sw.js verified: exists, no `.wasm` URL entries in precache manifest (Typst WASM handled by CacheFirst runtime rule)
- Workbox runtime chunk: `workbox-7b9cf9cb.js` (16,136 bytes)

### Task 2: HTTP header smoke test against running Hono server

- Ran: `yarn workspace @kartex/backend build` → exit code 0
- **Deviation (auto-fixed):** `seedAdminIfNeeded()` panicked at import time with Prisma `ECONNREFUSED` when no DB is reachable. Wrapped in try-catch — server now logs `[server] Admin seed skipped — database not reachable at startup` and continues. Commit: `06d5ff5`
- Server started successfully on `http://localhost:3000`
- GET / → `cross-origin-opener-policy: same-origin` ✅ and `cross-origin-embedder-policy: require-corp` ✅
- GET /sw.js → status 200, `Cache-Control: no-store` ✅
- GET /workbox-7b9cf9cb.js → status 200, `Cache-Control: no-store` ✅

### Task 3: Lighthouse PWA audit — human checkpoint

- Chrome Lighthouse PWA audit: **APPROVED**
  - "Web app manifest meets the installability requirements" ✅
  - "Registers a service worker that controls page and start_url" ✅
  - Install icon (+ or monitor icon) visible in Chrome address bar ✅
- DevTools Network tab: no `blocked:coep` resources ✅
- DevTools Console: no COEP/SharedArrayBuffer errors ✅

## Verification Results

| Criterion | Result |
|-----------|--------|
| yarn build exits code 0 | ✅ PASS |
| No Workbox WASM size warnings in final build | ✅ PASS (fixed) |
| manifest.webmanifest exists with display:standalone | ✅ PASS |
| manifest.webmanifest contains pwa-192x192.png and pwa-512x512.png | ✅ PASS |
| sw.js exists with no .wasm URLs in precache | ✅ PASS |
| workbox-*.js chunk exists | ✅ PASS (workbox-7b9cf9cb.js) |
| GET / → cross-origin-opener-policy: same-origin | ✅ PASS |
| GET / → cross-origin-embedder-policy: require-corp | ✅ PASS |
| GET /sw.js → 200 + Cache-Control: no-store | ✅ PASS |
| GET /workbox-*.js → 200 + Cache-Control: no-store | ✅ PASS |
| Lighthouse PWA audit → installable, SW registers | ✅ PASS (human) |
| No blocked:coep resources in DevTools Network | ✅ PASS (human) |

## Deviations from Plan

**[Rule 1 - Bug] Workbox maximumFileSizeToCacheInBytes exceeded**
- Found during: Task 1 (initial build)
- Issue: Main JS bundle (2.16 MB) exceeded Workbox default 2 MiB precache limit
- Fix: Added `maximumFileSizeToCacheInBytes: 3 * 1024 * 1024` to workbox config in apps/frontend/vite.config.ts
- Files modified: apps/frontend/vite.config.ts
- Verification: Build succeeds with `precache 12 entries (2297.26 KiB)`, no warnings
- Commit: df063be

**[Rule 3 - Blocking] Hono server crash without DB connection**
- Found during: Task 2 (server startup)
- Issue: `seedAdminIfNeeded()` was called at top-level with no error handling — process exited immediately when Prisma could not connect to PostgreSQL
- Fix: Wrapped `await seedAdminIfNeeded()` in try-catch in apps/backend/src/index.ts; server logs warning and continues
- Files modified: apps/backend/src/index.ts
- Verification: Server starts cleanly, logs `Admin seed skipped — database not reachable at startup`, responds on :3000
- Commit: 06d5ff5

**Total deviations:** 2 auto-fixed (1 config fix, 1 resilience fix). **Impact:** Both are improvements — the Workbox fix is necessary for the build to pass; the try-catch fix improves server resilience in development and testing environments.

## Self-Check: PASSED

**Phase 12 complete.** All five PWA requirements verified:
- PWA-01 ✅ manifest.webmanifest with 192×192 + 512×512 icons, display:standalone — Lighthouse approved
- PWA-02 ✅ SW precache contains JS/CSS/HTML only (no WASM URLs) — verified by reading sw.js
- PWA-03 ✅ /api/* is NetworkOnly — verified by SW config + Lighthouse SW audit
- PWA-04 ✅ COOP + COEP on all responses — verified by curl against running Hono server
- PWA-05 ✅ sw.js and workbox-*.js with Cache-Control: no-store — verified by curl

**Next:** Phase 12 complete — ready for `/gsd-plan-phase 13` (Documentation)
