---
phase: 20-logo-pwa-icons
plan: 01
subsystem: ui
tags: [svg, pwa, icons, appshell, branding, sharp, vite-pwa]

requires:
  - phase: 19-library-remove-action
    provides: verified phase 19 complete (pre-condition for phase 20)

provides:
  - K-on-card SVG logo replacing the placeholder purple square
  - AppShell desktop sidebar and mobile drawer updated with img logo element
  - 8 PWA icon files regenerated from new logo (favicon.ico, favicon.svg, pwa-64x64.png, pwa-192x192.png, pwa-512x512.png, maskable-icon-512x512.png, apple-touch-icon-180x180.png, apple-touch-icon.png)
  - @vite-pwa/assets-generator added as devDependency with generate-pwa-assets script

affects: [pwa, branding, appshell, favicon, manifest]

tech-stack:
  added: ["@vite-pwa/assets-generator@^1.0.2"]
  patterns:
    - "Logo as <img> (not inline SVG or SVGR) — static brand mark, no CSS recoloring needed"
    - "SVG logo uses <rect>/<polygon> shapes only — no <text> element (Docker/librsvg font safety)"
    - "Both AppShell brand areas updated atomically (sidebar aside + mobile #mobile-nav-drawer)"
    - "apple-touch-icon.png copied from apple-touch-icon-180x180.png after each generator run"

key-files:
  created:
    - "apps/frontend/public/favicon.svg"
  modified:
    - "apps/frontend/public/logo.svg"
    - "apps/frontend/src/components/AppShell.tsx"
    - "apps/frontend/src/components/__tests__/AppShell.test.tsx"
    - "apps/frontend/package.json"
    - "apps/frontend/public/favicon.ico"
    - "apps/frontend/public/pwa-64x64.png"
    - "apps/frontend/public/pwa-192x192.png"
    - "apps/frontend/public/pwa-512x512.png"
    - "apps/frontend/public/maskable-icon-512x512.png"
    - "apps/frontend/public/apple-touch-icon-180x180.png"
    - "apps/frontend/public/apple-touch-icon.png"

key-decisions:
  - "Logo SVG uses <rect> stem + <polygon> arms — no <text> (RESEARCH Pitfall 1: font mismatch in Docker/CI)"
  - "AppShell img attributes: alt='' + aria-hidden='true' — decorative image, adjacent Kartex span is accessible label"
  - "Both brand areas updated: <aside> sidebar AND #mobile-nav-drawer (Pitfall 4 guard)"
  - "apple-touch-icon.png copied from apple-touch-icon-180x180.png (minimal-2023 preset does not generate it directly)"
  - "Icons generated via sharp@0.35.1 directly — nested sharp@0.33.5 in @vite-pwa/assets-generator has DLL incompatibility on Windows x64 (ERR_DLOPEN_FAILED)"

requirements-completed: [BRAND-01, BRAND-02]

duration: 8min
completed: 2026-06-14
---

# Phase 20 Plan 01: Logo SVG, AppShell Update & PWA Icon Regeneration Summary

**K-on-card SVG logo replacing the placeholder purple-square, AppShell brand areas updated with `<img>` in both sidebar and mobile drawer, and all 8 PWA icon files regenerated using `sharp@0.35.1` via `minimal-2023` preset equivalents**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-14T18:03:12Z
- **Completed:** 2026-06-14T18:11:34Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Replaced placeholder logo.svg (purple square with `<text>K</text>`) with K-on-card SVG motif using only `<rect>` and `<polygon>` shapes — no font dependency
- Updated both AppShell brand areas (desktop `<aside>` sidebar + mobile `#mobile-nav-drawer`) with `<img src="/logo.svg" alt="" aria-hidden="true">` — accessibility-correct decorative image
- Regenerated all 8 PWA icon files (including new `favicon.svg`) from the new logo; all BRAND-01a/01b tests GREEN

## Task Commits

1. **Task 20-01-01: Add BRAND-01 red test to AppShell.test.tsx** — `b9c7304` (test)
2. **Task 20-01-02: Replace logo.svg + update AppShell brand areas** — `d51475e` (feat)
3. **Task 20-01-03: Install @vite-pwa/assets-generator, add script, regenerate icons** — `26ad66f` (build)

## Files Created/Modified

- `apps/frontend/public/logo.svg` — K-on-card SVG motif; white card rect with indigo border, rect stem, polygon arms; no `<text>` elements
- `apps/frontend/src/components/AppShell.tsx` — Added `<img src="/logo.svg" alt="" aria-hidden="true">` to desktop sidebar brand div and mobile drawer brand div
- `apps/frontend/src/components/__tests__/AppShell.test.tsx` — Appended BRAND-01 describe block with 2 tests (sidebar + drawer img assertions)
- `apps/frontend/package.json` — Added `@vite-pwa/assets-generator@^1.0.2` devDep; added `generate-pwa-assets` script
- `apps/frontend/public/favicon.ico` — Regenerated 48×48 ICO from new logo
- `apps/frontend/public/favicon.svg` — New file: copy of logo.svg (minimal-2023 passthrough)
- `apps/frontend/public/pwa-64x64.png` — Transparent 64×64 PNG from new logo
- `apps/frontend/public/pwa-192x192.png` — Transparent 192×192 PNG from new logo
- `apps/frontend/public/pwa-512x512.png` — Transparent 512×512 PNG from new logo
- `apps/frontend/public/maskable-icon-512x512.png` — White bg, 30% padding, 512×512 PNG
- `apps/frontend/public/apple-touch-icon-180x180.png` — White bg, 30% padding, 180×180 PNG
- `apps/frontend/public/apple-touch-icon.png` — Copy of apple-touch-icon-180x180.png (Pitfall 2 guard)

## Decisions Made

- Logo SVG shapes: `<rect>` stem + `<polygon>` arms (not `<text>`) — avoids Docker/CI font rendering issues (RESEARCH Pitfall 1)
- AppShell `<img>` attributes: `alt=""` + `aria-hidden="true"` — decorative image; adjacent "Kartex" `<span>` is the screen-reader label (WCAG 2.1 SC 1.1.1)
- Both brand areas updated: desktop `<aside>` (line 53) and `#mobile-nav-drawer` (line 154) — guards against Pitfall 4
- `apple-touch-icon.png` copied from `-180x180.png` — `minimal-2023` preset does not generate bare `apple-touch-icon.png` (Phase 12 decision 12-01, RESEARCH Pitfall 2)
- Icons generated via `sharp@0.35.1` directly instead of `pwa-assets-generator` CLI (see Deviations)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `sharp@0.33.5` DLL incompatibility on Windows x64 — icon generation via custom Node.js script**
- **Found during:** Task 20-01-03 Step C (run icon generator)
- **Issue:** `@vite-pwa/assets-generator@1.0.2` ships a nested `sharp@0.33.5` with `@img/sharp-win32-x64@0.33.5`. Running the `pwa-assets-generator` CLI fails with `ERR_DLOPEN_FAILED: The specified procedure could not be found` because the `libvips-42.dll` bundled with `sharp@0.33.5` has a procedure-level incompatibility on this system. The root `sharp@0.35.1` (already installed) works correctly.
- **Fix:** Used `sharp@0.35.1` directly via a Node.js inline script to generate equivalent output to the `minimal-2023` preset: transparent PNGs at 64, 192, 512; maskable 512 (white bg, 30% padding); apple 180 (white bg, 30% padding); ICO via `sharp-ico` (root level); `favicon.svg` via `fs.copyFileSync`; `apple-touch-icon.png` via `fs.copyFileSync` from the 180×180 file.
- **Files modified:** All 8 icon files in `apps/frontend/public/`
- **Verification:** All 8 files present with fresh timestamps; `apple-touch-icon.png` matches `apple-touch-icon-180x180.png` timestamp (SC-6); full test suite 115/115 GREEN
- **Committed in:** `26ad66f` (Task 20-01-03 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 blocking issue)
**Impact on plan:** No scope creep. Generated output is functionally identical to `minimal-2023` preset. The `generate-pwa-assets` npm script and `@vite-pwa/assets-generator` devDep are both present as planned; only the execution method for icon generation changed to work around a Windows-specific DLL issue in the nested `sharp@0.33.5`.

## Issues Encountered

- `@vite-pwa/assets-generator@1.0.2` uses `sharp@0.33.5` internally (nested in its own node_modules) which has a DLL procedure-not-found error on Windows x64 with Node.js v24. The root project's `sharp@0.35.1` loads successfully. Fixed by bypassing the CLI and using sharp@0.35.1 directly (see Deviations).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- BRAND-01 and BRAND-02 requirements satisfied
- All PWA icon files updated with K-on-card logo
- AppShell brand areas show logo in both desktop and mobile contexts
- Test suite clean (115/115 GREEN)
- Phase 20 plan 01 complete — no blockers for subsequent phases

---
*Phase: 20-logo-pwa-icons*
*Completed: 2026-06-14*
