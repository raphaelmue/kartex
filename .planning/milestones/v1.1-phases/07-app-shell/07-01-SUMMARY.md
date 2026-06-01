---
phase: 07-app-shell
plan: 01
subsystem: ui
tags: [react, tailwind, vite, responsive-layout, mobile, footer, aria]

requires:
  - phase: 06-ci-pipeline
    provides: test infrastructure (Vitest, yarn workspaces) used in Task 1-4

provides:
  - Mobile-first responsive AppShell with hamburger topbar, CSS-transform overlay drawer, and sticky footer
  - Build-time __APP_VERSION__ injected via Vite define + createRequire
  - TypeScript global declaration for __APP_VERSION__ in vite-env.d.ts
  - 9 unit tests covering SHELL-01, SHELL-02, SHELL-03 behaviors

affects: [08-study-ux, 09-i18n, any phase that modifies AppShell.tsx or adds nav items]

tech-stack:
  added: []
  patterns:
    - "Tailwind md: breakpoint toggle (hidden md:flex / flex md:hidden) for desktop/mobile element swap"
    - "CSS transform drawer (translate-x-0 / -translate-x-full) with transition-transform duration-200 for animatable slide"
    - "Vite define + createRequire for build-time constant injection from package.json"
    - "vi.mock + vi.importActual pattern for partial react-router-dom override in Vitest"

key-files:
  created:
    - apps/frontend/src/components/__tests__/AppShell.test.tsx
  modified:
    - apps/frontend/src/components/AppShell.tsx
    - apps/frontend/vite.config.ts
    - apps/frontend/src/vite-env.d.ts

key-decisions:
  - "createRequire (not resolveJsonModule) used to read package.json version — resolveJsonModule incompatible with moduleResolution: bundler + allowImportingTsExtensions"
  - "CSS transform always-in-DOM drawer chosen over conditional render — enables 200ms exit animation"
  - "Backdrop at z-40, drawer panel at z-50 — correct stacking per UI-SPEC T-07-01"
  - "Both footer links carry rel=noopener noreferrer — mitigates T-07-01 (target=_blank opener exposure)"
  - "Explicit vitest imports (describe/it/expect/vi) added to test file — matches existing CardFlip.test.tsx pattern for TypeScript compat without adding types to tsconfig"

patterns-established:
  - "AppShell topbar: header.md:hidden wrapping hamburger Button + brand span + currentLabel span"
  - "Mobile drawer: fixed top-0 left-0 z-50 panel always in DOM with cn() translate toggle"
  - "Footer: footer.h-10.shrink-0 in flex-col wrapper with min-h-0 (Safari overflow fix)"

requirements-completed: [SHELL-01, SHELL-02, SHELL-03]

duration: 4min
completed: 2026-05-31
---

# Phase 7 Plan 01: App Shell Summary

**Responsive AppShell with hamburger topbar, CSS-transform overlay drawer (200ms slide), sticky footer, and Vite build-time __APP_VERSION__ injection — all 9 unit tests pass, full suite green, typecheck clean**

## Performance

- **Duration:** 3m 43s
- **Started:** 2026-05-31T07:06:51Z
- **Completed:** 2026-05-31T07:10:34Z
- **Tasks:** 4 (3 code tasks + 1 verification gate)
- **Files modified:** 4

## Accomplishments
- AppShell.tsx extended from 127 → 284 lines with mobile topbar, overlay drawer, and footer (well under 500-line limit)
- Mobile sidebar collapses by default (`hidden md:flex`) and hamburger triggers CSS-transform slide-in drawer (SHELL-01, SHELL-02)
- Footer shows build-time version `v0.1.0`, copyright `© Raphael Müßeler`, GitHub and Docs links with `rel="noopener noreferrer"` (SHELL-03)
- `__APP_VERSION__` injected via Vite `define` + `createRequire` — no `resolveJsonModule` needed (tsconfig-compatible)
- All 52 frontend unit tests pass with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create failing AppShell test stub (RED)** - `123282b` (test)
2. **Task 2: Inject __APP_VERSION__ via Vite define** - `7cbc3e1` (feat)
3. **Task 3: Implement mobile topbar, overlay drawer, footer** - `8add58e` (feat)

Task 4 was a verification-only gate (no file changes).

## Files Created/Modified
- `apps/frontend/src/components/__tests__/AppShell.test.tsx` - 9 unit tests covering SHELL-01/02/03 (created)
- `apps/frontend/src/components/AppShell.tsx` - Responsive shell: hamburger topbar, CSS-transform drawer, sticky footer (modified)
- `apps/frontend/vite.config.ts` - Added createRequire + define block for __APP_VERSION__ (modified)
- `apps/frontend/src/vite-env.d.ts` - Added `declare const __APP_VERSION__: string` (modified)

## Decisions Made
- `createRequire` (not `resolveJsonModule`) used to read `package.json` version — `resolveJsonModule` is incompatible with `moduleResolution: "bundler"` + `allowImportingTsExtensions: true` in the project's tsconfig
- CSS transform (always-in-DOM drawer) chosen over conditional render — enables smooth 200ms exit animation
- Drawer at `z-50`, backdrop at `z-40` per UI-SPEC Z-index stacking contract
- Explicit `vitest` imports (`describe`, `it`, `expect`, `vi`) added to test file — follows established pattern in `CardFlip.test.tsx` for TypeScript type compatibility

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added explicit vitest imports to AppShell.test.tsx**
- **Found during:** Task 2 (typecheck verification)
- **Issue:** Test file used `describe`, `it`, `expect`, `vi` as globals (per `globals: true` in vitest config) but TypeScript typecheck failed with "Cannot find name" errors — the tsconfig has no `types: ["vitest/globals"]` entry
- **Fix:** Added `import { describe, it, expect, vi } from 'vitest'` at top of test file, matching the existing pattern in `CardFlip.test.tsx`
- **Files modified:** `apps/frontend/src/components/__tests__/AppShell.test.tsx`
- **Verification:** `yarn workspace @kartex/frontend typecheck` exits 0
- **Committed in:** `7cbc3e1` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug, TypeScript typecheck failure)
**Impact on plan:** Auto-fix was necessary for typecheck compliance. No scope creep.

## Issues Encountered
- Shell was configured with `packageManager: yarn@4.15.0` (not pnpm as PLAN.md suggested). Used `yarn workspace @kartex/frontend` commands throughout — no impact on output.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. All new surfaces are client-side layout only.

## Threat Flags

None — threat model from PLAN.md fully implemented:
- T-07-01: `rel="noopener noreferrer"` on both footer anchors (verified by grep count = 2)
- T-07-02: `__APP_VERSION__` is build-time constant from package.json (not user input)
- T-07-03: `aria-hidden={!drawerOpen}` on drawer panel removes it from accessibility tree when closed

## Self-Check

### Checking created files exist:
- [x] `apps/frontend/src/components/__tests__/AppShell.test.tsx` — EXISTS
- [x] `apps/frontend/src/components/AppShell.tsx` — EXISTS (modified)
- [x] `apps/frontend/vite.config.ts` — EXISTS (modified)
- [x] `apps/frontend/src/vite-env.d.ts` — EXISTS (modified)

### Checking commits exist:
- [x] `123282b` — test(07-01): add failing AppShell tests — RED phase
- [x] `7cbc3e1` — feat(07-01): inject __APP_VERSION__ via Vite define
- [x] `8add58e` — feat(07-01): implement mobile topbar, overlay drawer, and footer

## Self-Check: PASSED

## Next Phase Readiness
- App shell is fully responsive for Phase 8 (Study UX) — mobile users can navigate via drawer
- Footer provides version visibility for all users — ready for Phase 9 (i18n) if footer strings need localization
- No blockers for Phase 8 (STUDY-01/02/03/04)

---
*Phase: 07-app-shell*
*Completed: 2026-05-31*
