---
phase: 05-import-pipeline
plan: 03
subsystem: ui
tags: [react, shadcn, intersection-observer, state-machine, form-data, import, lazy-rendering]

# Dependency graph
requires:
  - phase: 05-01
    provides: "parseKartex() pure function + ParsedCard, ParseWarning, KartexParseResult types from @kartex/shared"
  - phase: 05-02
    provides: "GET /api/import/config and POST /api/import endpoints; ImportConfig type from @kartex/shared"
provides:
  - "ImportPage component: 4-state machine (UPLOAD/PARSING/PREVIEW/SUCCESS) with lazy card preview"
  - "useImport hook: state machine, config fetch, file validation, FormData upload via api.postForm()"
  - "api.postForm() helper for FormData multipart uploads (fixes Pitfall 3)"
  - "/import route wired in App.tsx — replaces ComingSoon placeholder"
affects:
  - future-phases

# Tech tracking
tech-stack:
  added:
    - "shadcn/ui alert component (apps/frontend/src/components/ui/alert.tsx)"
    - "shadcn/ui progress component (apps/frontend/src/components/ui/progress.tsx)"
  patterns:
    - "LazyCard inline in ImportPage.tsx — IntersectionObserver { threshold: 0.1, rootMargin: '200px' } for lazy rendering"
    - "api.postForm() helper: passes FormData directly to baseFetch without JSON.stringify"
    - "4-state machine hook (useImport) following useStudySession pattern: typed return interface, flat useState, useCallback async"
    - "Amber warning banner using raw Tailwind color classes (border-amber-200 bg-amber-50 text-amber-800) — same precedent as Phase 4 rating buttons"

key-files:
  created:
    - "apps/frontend/src/pages/ImportPage.tsx — ImportPage + LazyCard inline component"
    - "apps/frontend/src/hooks/useImport.ts — useImport hook with ImportStep type"
    - "apps/frontend/src/components/ui/alert.tsx — shadcn alert component"
    - "apps/frontend/src/components/ui/progress.tsx — shadcn progress component"
  modified:
    - "apps/frontend/src/lib/api.ts — postForm() method added to api object"
    - "apps/frontend/src/App.tsx — /import route wired to ImportPage"

key-decisions:
  - "LazyCard inline in ImportPage.tsx (not a separate file) — only used in ImportPage; no cross-page reuse benefit"
  - "ZIP files have no client-side card preview — parseKartex() operates on text; zip extraction is server-side only; user sees informational note and imports directly"
  - "api.postForm() added to api object — clean extension over calling baseFetch directly; consistent with existing api.get/post/patch/delete API surface"
  - "pendingDeckName state pre-filled from parseResult.deck.deck when parseResult arrives; falls back to stripped filename for ZIP files"
  - "configError graceful degradation: if /api/import/config fetch fails, client-side size check is skipped (D-11) — import proceeds without client validation"

patterns-established:
  - "ImportPage state machine: step drives conditional rendering (upload/parsing/preview+importing/success), not nested component trees"
  - "LazyCard sentinel: min-h-[80px] on outer div ensures IntersectionObserver fires even before content loads"
  - "api.postForm() pattern for any future multipart upload endpoint"

requirements-completed:
  - IMPT-01
  - IMPT-05

# Metrics
duration: 12min
completed: 2026-05-28
---

# Phase 5, Plan 03: Import UI Summary

**React ImportPage with 4-state machine (upload/parsing/preview/success), IntersectionObserver LazyCard preview, amber warnings banner, and api.postForm() for multipart FormData upload — closes the import pipeline loop**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-05-28T18:48:00Z
- **Completed:** 2026-05-28T19:01:14Z
- **Tasks:** 2 (Task 1: shadcn components + api.ts; Task 2: useImport + ImportPage + App.tsx)
- **Files modified:** 6

## Accomplishments

- `useImport.ts` hook: 5 internal states (upload/parsing/preview/importing/success), config fetch on mount, client-side size + extension validation (D-11), `parseKartex()` integration for `.kartex` preview, `api.postForm()` for FormData upload with 201/422/413/network error handling
- `ImportPage.tsx`: drop zone with drag-and-drop, `LazyCard` inline with IntersectionObserver `{ threshold: 0.1, rootMargin: '200px' }`, amber warnings banner (D-06), editable deck name pre-filled from header (D-05), SUCCESS state with View Deck navigation
- `api.postForm()` added to `api` object — passes FormData to `baseFetch` without `JSON.stringify` (Pitfall 3 fix)
- `/import` route in `App.tsx` replaces `<ComingSoon title="Import" />` with `<ImportPage />`
- TypeScript build passes with 2531→2538 modules; all 41 non-Typst tests pass (2 pre-existing Typst WASM failures are out of scope)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add alert/progress shadcn components and postForm to api.ts** - `afc8f5c` (chore)
2. **Task 2: Add ImportPage with lazy card preview and 4-state machine** - `4f17426` (feat)

**Plan metadata:** (committed with this SUMMARY)

## Files Created/Modified

- `apps/frontend/src/pages/ImportPage.tsx` — ImportPage component with LazyCard inline
- `apps/frontend/src/hooks/useImport.ts` — useImport hook, ImportStep type
- `apps/frontend/src/components/ui/alert.tsx` — shadcn alert (new)
- `apps/frontend/src/components/ui/progress.tsx` — shadcn progress (new)
- `apps/frontend/src/lib/api.ts` — postForm() method added
- `apps/frontend/src/App.tsx` — /import route wired to ImportPage

## Decisions Made

- **LazyCard inline:** Only used in ImportPage — extracting to `src/components/LazyCard.tsx` would add indirection with no reuse benefit. Co-located per UI-SPEC Component Inventory.
- **ZIP files no client-side preview:** `parseKartex()` operates on text strings; extracting ZIP contents in the browser would require a browser ZIP library. Server-side only per RESEARCH.md architecture. User sees an informational note and can still confirm import.
- **`api.postForm()` over direct `baseFetch`:** Adds a consistent, discoverable helper to the `api` object surface. Future multipart endpoints can use the same pattern.
- **`pendingDeckName` pre-fill:** `useEffect` watches `parseResult` and `selectedFile` — pre-fills the Input from `parseResult.deck.deck` for `.kartex` files, falls back to stripped filename for ZIP files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Merged main to obtain wave 1 + wave 2 commits**
- **Found during:** Pre-execution setup
- **Issue:** Worktree was created from main before waves 1 and 2 completed. `packages/shared/src/lib/kartex-parser.ts`, `packages/shared/src/schemas/import.ts`, and `apps/backend/src/routes/import.ts` were absent from the worktree. TypeScript cannot resolve `@kartex/shared` exports for `parseKartex`, `ImportConfig`, `KartexParseResult`, `ParseWarning` types needed by `useImport.ts`.
- **Fix:** Ran `git merge main --no-edit` to pull wave 1+2 commits (fast-forward). All 13 files merged cleanly.
- **Verification:** `ls packages/shared/src/lib/kartex-parser.ts` confirmed; `yarn workspace @kartex/shared build` and `yarn workspace @kartex/frontend build` both exit 0.
- **Committed in:** Merge commit (fast-forward, implicit)

---

**Total deviations:** 1 auto-fixed (Rule 3 blocking — worktree merge to get prior-wave dependency)
**Impact on plan:** Essential for build to succeed. No scope creep.

## Issues Encountered

- **Worktree missing node_modules:** Fresh worktree had no node_modules. Ran `yarn install` + `yarn workspace @kartex/shared build` before any build/test commands. Same pattern as 05-01 and 05-02.
- **Pre-existing Typst WASM test failures:** `KartexRenderer.test.tsx` CARD-08 (2 tests) fail in worktree — these are pre-existing failures from Phase 3 that exist on main before this plan. Out of scope.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Import pipeline is complete end-to-end: `.kartex` parser → import API → import UI
- Requirements IMPT-01 through IMPT-05 and MDIA-01 through MDIA-04 are all met
- The `/import` page is live for logged-in users
- Phase 6 (infrastructure/Docker) is the next planned phase

## Known Stubs

None — all states render real data from the API or from `parseKartex()`. The "Card preview is not available for .kartex.zip bundles" message is intentional behavior (server-side-only ZIP parsing), not a stub.

## Threat Flags

None — new UI surface (`/import` page) was explicitly covered by the plan's threat model:
- T-5-UI-01: deck name tampering — accepted (Prisma parameterized queries)
- T-5-UI-02: KartexRenderer XSS — accepted (react-markdown allowDangerousHtml: false)
- T-5-UI-03: large card list DoS — mitigated by LazyCard IntersectionObserver

---
*Phase: 05-import-pipeline*
*Completed: 2026-05-28*
