---
phase: 12-03
plan: 03
subsystem: frontend/pwa
tags: [pwa, vite-plugin-pwa, workbox, manifest, service-worker]
requires: [12-01]
provides: [vite-pwa-plugin, web-app-manifest, service-worker-config, workbox-rules]
affects: [apps/frontend/vite.config.ts, apps/frontend/package.json]
tech-stack:
  added: ["vite-plugin-pwa@1.3.0", "workbox-window@7.4.1"]
  patterns: [vite-pwa-plugin, workbox-generate-sw, runtime-caching]
key-files:
  created: []
  modified: [apps/frontend/vite.config.ts, apps/frontend/package.json]
key-decisions:
  - "VitePWA placed last in plugins array (after react, wasm, topLevelAwait) per Pitfall 6 (WASM compatibility)"
  - "globPatterns: ['**/*.{js,css,html}'] — wasm explicitly excluded to avoid Typst WASM 28MB precache failure"
  - "devOptions.enabled: false — prevents SW from conflicting with Vite dev proxy for /api/*"
  - "NetworkOnly for /api/* + navigateFallbackDenylist prevents SW from serving cached HTML for API navigation requests"
requirements-completed: [PWA-01, PWA-02, PWA-03]
duration: "~6 min"
completed: "2026-06-03T20:36:48Z"
---

# Phase 12 Plan 03: VitePWA Plugin Configuration Summary

vite-plugin-pwa@1.3.0 and workbox-window@7.4.1 installed; VitePWA configured as final plugin with manifest (name/icons/display:standalone), Workbox precache (js/css/html only, no wasm), NetworkOnly for /api/*, and CacheFirst for *.wasm.

**Duration:** ~6 min | **Tasks:** 1 completed (Task 1 checkpoint cleared by orchestrator) | **Files:** 2 modified

## Tasks Completed

### Task 2: Install packages and configure VitePWA
- Installed vite-plugin-pwa@1.3.0 and workbox-window@7.4.1 as devDependencies via `yarn workspace @kartex/frontend add -D`
- Added `import { VitePWA } from 'vite-plugin-pwa'` to vite.config.ts (after wasm import)
- Added VitePWA() as last plugin (after react, wasm, topLevelAwait) with full manifest + workbox config
- manifest: name 'Kartex', short_name 'Kartex', theme_color '#ffffff', display 'standalone', start_url '/', 192x192 and 512x512 icons
- globPatterns: ['**/*.{js,css,html}'] — wasm explicitly excluded (Pitfall 1 compliance)
- navigateFallbackDenylist: [/^\/api\//] — prevents SW from intercepting API navigation (Pitfall 2 compliance)
- NetworkOnly handler for /api/* pathname prefix (PWA-03)
- CacheFirst handler for *.wasm with cacheName: 'wasm-cache', cacheableResponse: { statuses: [0, 200] } (PWA-02)
- devOptions: { enabled: false } — no service worker in dev (Pitfall 7 compliance)
- TypeScript typecheck: 0 errors
- Frontend tests: 84/84 passed (11 test files)
- **Commit:** 509750a

## Verification Results

- vite-plugin-pwa in package.json devDependencies: YES (1.3.0)
- workbox-window in package.json: YES (7.4.1)
- VitePWA import in vite.config.ts: YES
- registerType: 'autoUpdate': YES
- globPatterns without 'wasm': YES — ['**/*.{js,css,html}']
- navigateFallbackDenylist: YES — [/^\/api\//]
- NetworkOnly handler: YES
- CacheFirst handler for *.wasm: YES
- wasm-cache cacheName: YES
- pwa-192x192.png in manifest icons: YES
- pwa-512x512.png in manifest icons: YES
- display: 'standalone': YES
- VitePWA last in plugins array: YES (after topLevelAwait())
- yarn workspace @kartex/frontend typecheck: 0 errors (exit 0)
- yarn workspace @kartex/frontend test --run: 84/84 passed

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

No new security-relevant surface introduced beyond what the plan's threat model covers. NetworkOnly for /api/* and navigateFallbackDenylist are both present as required by T-12-06. Package legitimacy checkpoint (T-12-05) was cleared by orchestrator before this plan executed.

## Self-Check: PASSED

Files verified:
- apps/frontend/vite.config.ts: EXISTS and contains VitePWA config
- apps/frontend/package.json: EXISTS and contains vite-plugin-pwa@1.3.0 and workbox-window@7.4.1
- Commit 509750a: CONFIRMED in git log

**Next:** Ready for Plan 12-04 (build + smoke test + Lighthouse — Wave 3, depends on this plan + Plan 12-02)
