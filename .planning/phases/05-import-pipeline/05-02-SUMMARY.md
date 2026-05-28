---
phase: 05-import-pipeline
plan: 02
subsystem: api
tags: [hono, prisma, unzipper, file-type, yaml, import, zip, mime, magic-bytes, media-storage]

# Dependency graph
requires:
  - phase: 05-01
    provides: "parseKartex() pure function + DeckHeader/ParsedCard/ParseWarning/KartexParseResult types from @kartex/shared"
provides:
  - "GET /api/import/config endpoint returning { maxFileSizeBytes } from MAX_UPLOAD_BYTES env"
  - "POST /api/import endpoint accepting .kartex and .kartex.zip files with full validation, media storage, and deck/card creation"
  - "importRouter registered at /api/import in index.ts (JWT-protected)"
affects:
  - 05-03-import-ui

# Tech tracking
tech-stack:
  added:
    - "unzipper@0.12.3 — in-memory ZIP extraction via unzipper.Open.buffer()"
    - "@types/unzipper@0.10.11 — TypeScript types for unzipper"
    - "file-type@22.0.1 — magic bytes validation via fileTypeFromBuffer() (pure ESM)"
    - "yaml@2.9.0 — added to @kartex/shared for YAML deck header parsing"
  patterns:
    - "bodyLimit as first middleware in POST route chain (Pitfall 6 — before parseBody)"
    - "Validation-before-write: collect ALL media errors before writing any file to disk (D-08)"
    - "UUID-based filenames for all stored media (T-5-02 path traversal prevention)"
    - "Magic bytes over client-declared MIME type (T-5-03 spoofing prevention)"
    - "prisma.$transaction for atomic deck + card creation in both .kartex and .kartex.zip paths"

key-files:
  created:
    - "apps/backend/src/routes/import.ts — Hono importRouter with GET /config and POST / handlers"
  modified:
    - "apps/backend/src/index.ts — importRouter registered at /api/import (step 5d)"
    - "apps/backend/package.json — added unzipper, @types/unzipper, file-type"
    - "packages/shared/package.json — added yaml"
    - "yarn.lock — updated with new dependencies"

key-decisions:
  - "esModuleInterop: true already in apps/backend/tsconfig.json (A2 confirmed) — unzipper CJS default import is safe"
  - "file-type@22 pure ESM import works in backend (type: module confirmed); fileTypeFromBuffer verified as typeof function"
  - "Validation-before-write pattern for D-08 compliance: entryBuffers Map caches all bytes, entire validation pass completes before any writeFile call"
  - "D-09 missing media references: warned only (not fatal), cardIndex: 0 used as deck-level warning sentinel"
  - "T-5-07 orphaned media on disk accepted: MVP scope, low risk for 2-5 users, cleanup deferred"
  - "Worktree merged main branch to get 05-01 kartex-parser output before building import route"

patterns-established:
  - "Import route pattern: bodyLimit -> parseBody -> File guard -> extension check -> deckName override -> branch on isKartex/isZip"
  - "ZIP media validation: two-phase (validate all, then store all) with Map cache for bytes"
  - "D-09 warning: scan card text for media:// refs, warn if not in storedFilenames Map"

requirements-completed: [IMPT-02, IMPT-03, IMPT-04, MDIA-01, MDIA-02, MDIA-03, MDIA-04]

# Metrics
duration: 22min
completed: 2026-05-28
---

# Phase 5, Plan 02: Import API Summary

**Hono import API with bodyLimit enforcement, ZIP extraction via unzipper, magic bytes validation via file-type, and atomic Prisma transactions for deck/card/media creation**

## Performance

- **Duration:** ~22 min
- **Started:** 2026-05-28T18:30:00Z
- **Completed:** 2026-05-28T18:52:35Z
- **Tasks:** 2 (+ merge step)
- **Files modified:** 5

## Accomplishments

- Installed unzipper@0.12.3, @types/unzipper@0.10.11, file-type@22.0.1 (backend) and yaml@2.9.0 (shared); file-type ESM import verified working via `typeof fileTypeFromBuffer === 'function'`
- Created `apps/backend/src/routes/import.ts` with all 7 STRIDE threats addressed: bodyLimit (T-5-01), UUID filenames (T-5-02), magic bytes over client MIME (T-5-03), per-file size check (T-5-04), parseKartex try/catch (T-5-05), react-markdown XSS accepted (T-5-06), orphaned media accepted (T-5-07)
- Two-phase media validation (all errors collected before any write, D-08) and D-09 missing-media warning logic implemented
- Registered importRouter at `/api/import` in index.ts; TypeScript build passes with no errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Install backend dependencies (unzipper, file-type, @types/unzipper) and shared yaml** - `31eebb0` (chore)
2. **Task 2: Create apps/backend/src/routes/import.ts and register in index.ts** - `2d5862f` (feat)

**Plan metadata:** (committed with this SUMMARY)

## Files Created/Modified

- `apps/backend/src/routes/import.ts` — Hono importRouter: GET /config returns `{ maxFileSizeBytes }`, POST / handles .kartex (parse+transaction) and .kartex.zip (validate-then-store-media + transaction)
- `apps/backend/src/index.ts` — Added import for importRouter + `app.route('/api/import', importRouter)` after dashboardRouter (step 5d)
- `apps/backend/package.json` — Added unzipper@^0.12.3, @types/unzipper@^0.10.11, file-type@^22.0.1
- `packages/shared/package.json` — Added yaml@^2.9.0
- `yarn.lock` — Updated with new dependency entries

## Decisions Made

- `esModuleInterop: true` confirmed in `apps/backend/tsconfig.json` — `import unzipper from 'unzipper'` (CJS default import) is safe in the ESM backend
- `file-type@22` pure ESM is compatible with the backend's `"type": "module"` — verified at runtime
- Validation-before-write (D-08): all media entry bytes are read and validated in a first pass before any `writeFile` or `prisma.media.create` call. A `Map<entryName, Buffer>` caches the bytes to avoid re-reading in the storage phase.
- For D-09 missing media warnings, `cardIndex: 0` is used as a deck-level sentinel (not card-specific). The `ParseWarningSchema` uses `.positive()` but the route does not validate warnings through Zod before returning them.
- T-5-07 (orphaned media if DB transaction fails after disk writes) accepted at MVP scope per threat model — low risk for 2-5 users.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Merged main branch to obtain 05-01 kartex-parser output**
- **Found during:** Task 2 pre-work
- **Issue:** The worktree was created from main before wave 1 completed. `packages/shared/src/lib/kartex-parser.ts` and `packages/shared/src/schemas/import.ts` did not exist in the worktree working tree, making `import { parseKartex } from '@kartex/shared'` fail at build time.
- **Fix:** Ran `git merge main --no-edit` to pull the wave 1 commits (05-01 kartex-parser TDD plan output) into this worktree branch. The merge resolved cleanly.
- **Files modified:** All 05-01 output files (kartex-parser.ts, schemas/import.ts, index.ts barrel) pulled via merge
- **Verification:** `ls packages/shared/src/lib/kartex-parser.ts` confirmed; `yarn workspace @kartex/backend build` exits 0
- **Committed in:** Merge commit (implicit — not a separate task commit)

---

**Total deviations:** 1 auto-fixed (blocking — worktree merge to get wave 1 dependency)
**Impact on plan:** Essential for build to succeed; no scope creep.

## Issues Encountered

- KartexRenderer.test.tsx has 2 pre-existing Typst WASM failures (`renders #typst block as SVG after async render`, `renders RenderErrorBlock when Typst compilation fails`) — these exist on main before this plan and are unrelated to import route work. Per scope boundary rules, these are out of scope and not touched.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `GET /api/import/config` and `POST /api/import` endpoints are fully implemented and registered
- Frontend (Plan 05-03) can now call `GET /api/import/config` to get the upload limit for client-side validation
- Frontend (Plan 05-03) must use `baseFetch` directly or a `postForm` helper for multipart upload (NOT `api.post()` which JSON-stringifies the body — Pitfall 3 from RESEARCH.md)
- Environment variable `MAX_UPLOAD_BYTES` defaults to 10485760 (10MB); configurable via Docker env
- Environment variable `STORAGE_PATH` defaults to `/app/media`; must match Docker volume mount

## Threat Flags

None — all new surface (`GET /api/import/config`, `POST /api/import`) was explicitly covered by the plan's threat model (T-5-01 through T-5-07) with mitigations in place.

## Known Stubs

None — all logic is fully implemented.

---
*Phase: 05-import-pipeline*
*Completed: 2026-05-28*
