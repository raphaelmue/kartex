---
status: complete
phase: 12-pwa-shell
source:
  - 12-01-SUMMARY.md
  - 12-02-SUMMARY.md
  - 12-03-SUMMARY.md
  - 12-04-SUMMARY.md
started: 2026-06-04T00:00:00Z
updated: 2026-06-06T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server/service. Start from scratch (docker compose up -d or dev server). Server boots without errors. App loads at http://localhost:3000 with no white screen or JS console errors.
result: pass

### 2. Chrome Install Prompt (PWA-01)
expected: Visit http://localhost:3000 (or your deployed URL) in Chrome. An install icon (monitor with down-arrow, or "+" in address bar) appears. Clicking it shows an "Install Kartex" dialog. After installing, the app opens in a standalone window (no browser chrome).
result: pass

### 3. Service Worker Registers (PWA-02)
expected: Open Chrome DevTools → Application → Service Workers. A service worker for the app's origin is listed and shows "Activated and is running." Refreshing the page shows requests served from the SW cache in the Network tab (status "from ServiceWorker").
result: pass

### 4. Typst WASM Not Precached, API Bypasses SW (PWA-03)
expected: In DevTools Application → Cache Storage, open the precache. No .wasm files appear in the precache list. In the Network tab during a card study session, requests to /api/* show "from network" (not "from ServiceWorker") — live data is never returned from cache.
result: pass

### 5. COEP/COOP Headers Present (PWA-04)
expected: In DevTools Network tab, click any request (e.g., GET /). The Response Headers panel shows cross-origin-opener-policy: same-origin and cross-origin-embedder-policy: require-corp. Both headers present, no "blocked:coep" warnings in Console.
result: pass

### 6. sw.js Served with Cache-Control no-store (PWA-05)
expected: In DevTools Network tab, find the sw.js request. Response Headers show cache-control: no-store. Same for any workbox-*.js chunk.
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
