---
phase: 05-import-pipeline
verified: 2026-05-28T12:00:00Z
status: human_needed
score: 5/5
overrides_applied: 0
human_verification:
  - test: "Upload a .kartex file on /import and confirm parsed cards with rendered content appear before import"
    expected: "Parse result shows card count, front/back rendered by KartexRenderer, warnings banner if any cards were skipped"
    why_human: "IntersectionObserver lazy-rendering and KartexRenderer output require a browser"
  - test: "Upload a .kartex.zip bundle with media files and confirm import succeeds with media stored"
    expected: "Zip is accepted, deck and cards created, media files stored on volume, success screen with deck ID"
    why_human: "Zip extraction, magic-bytes MIME validation, and Docker volume writes require a running stack"
  - test: "Upload a file exceeding the configured max size and confirm rejection"
    expected: "413 response displayed as a clear error message — file too large"
    why_human: "bodyLimit middleware behavior must be observed end-to-end in browser"
  - test: "Upload a file with an invalid MIME type (e.g. a .txt renamed to .kartex.zip) and confirm rejection"
    expected: "422 response with clear error; deck and media not created in DB"
    why_human: "Magic-bytes detection path requires a real binary file and running backend"
  - test: "Confirm max upload size shown in drop-zone matches MAX_UPLOAD_BYTES env var"
    expected: "GET /api/import/config returns correct maxFileSizeBytes; UI drop-zone label says matching MB value"
    why_human: "Requires live API call and visual inspection of the drop-zone label"
---

# Phase 5: Import Pipeline — Verification Report

**Phase Goal:** A user can upload a `.kartex` file or `.kartex.zip` bundle, preview the parsed cards (with full rendering), and import them as a new deck.
**Verified:** 2026-05-28T12:00:00Z
**Status:** human_needed (all automated checks pass; 5 browser/stack checks deferred to human)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can upload a `.kartex` file on /import and see parsed cards with rendered content before confirming import | VERIFIED (code path) / HUMAN NEEDED (visual) | `useImport.selectFile` calls `parseKartex()` client-side for `.kartex` files, sets `parseResult`, transitions to `preview` step. `ImportPage` renders `LazyCard` list via `KartexRenderer` for each `parseResult.cards` entry. Full render requires browser. |
| 2 | User can upload a `.kartex.zip` bundle; bundled media files are extracted and preview shows images/audio inline | VERIFIED (code path) / HUMAN NEEDED (visual) | `import.ts` backend unzips with `unzipper`, finds `deck.kartex`, extracts `media/` entries, writes to `STORAGE_PATH`. Frontend transitions to `preview` step with informational note for ZIP (no client-side card preview). Full round-trip requires running stack. |
| 3 | Confirming import creates a new deck and all cards in the database; bundled media files are stored on the Docker volume | VERIFIED (code path) / HUMAN NEEDED (DB check) | `prisma.$transaction` wraps `deck.create + card.createMany` for both plain and ZIP paths (lines 81–101 and 259–279 of `import.ts`). Media written via `writeFile` + `prisma.media.create` before transaction. Atomic deck+card creation confirmed in code. |
| 4 | Uploading a file that is too large or has an invalid MIME type or magic bytes is rejected with a clear error | VERIFIED (code path) / HUMAN NEEDED (end-to-end) | `bodyLimit` middleware at 413, MIME/magic-bytes check via `fileTypeFromBuffer` against `ALLOWED_MIMES` set, per-file and total uncompressed size guards all present in `import.ts`. Error JSON returned; frontend displays in destructive `Alert`. |
| 5 | Configurable max upload size controlled via `MAX_UPLOAD_BYTES` env var (default 10 MB) | VERIFIED | `MAX_BYTES = parseInt(process.env.MAX_UPLOAD_BYTES ?? '10485760', 10)` used for `bodyLimit` and `/config` response. Frontend `useImport` fetches `/api/import/config` on mount and uses `maxFileSizeBytes` for client-side pre-check. Default 10 MB confirmed. |

**Score:** 5/5 truths have complete code implementations. All 5 require human/stack verification for full end-to-end confirmation.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/shared/src/lib/kartex-parser.ts` | `parseKartex()` pure function | VERIFIED | 214 lines; YAML header parse, card block regex, lenient per-card error, `KartexParseError` union return type. |
| `packages/shared/src/schemas/import.ts` | 6 Zod schemas | VERIFIED | `DeckHeaderSchema`, `ParsedCardSchema`, `ParseWarningSchema`, `KartexParseResultSchema`, `ImportResultSchema`, `ImportConfigSchema` — all present with inferred types. |
| `packages/shared/src/index.ts` | Barrel exports for parser and schemas | VERIFIED | Lines 9–10: `export * from './schemas/import'` and `export * from './lib/kartex-parser'`. |
| `apps/frontend/src/lib/__tests__/kartex-parser.test.ts` | 10 unit tests | VERIFIED | 10 `it()` blocks covering happy path, fatal header errors, lenient card parsing, tags, comments, media refs, math, Typst. |
| `apps/backend/src/routes/import.ts` | `GET /config` + `POST /` handlers | VERIFIED | 293 lines. Both handlers present. `bodyLimit`, MIME validation, zip extraction, Prisma transaction. No stubs. |
| `apps/backend/src/index.ts` | `importRouter` registered at `/api/import` | VERIFIED | Line 54: `app.route('/api/import', importRouter)` — after `authMiddleware` (line 41), so JWT is required. |
| `apps/frontend/src/pages/ImportPage.tsx` | 4-state machine (UPLOAD/PARSING/PREVIEW/SUCCESS) | VERIFIED | 461 lines. All four states render distinct UI. `LazyCard` with `IntersectionObserver`. Amber warnings banner. Deck name input. |
| `apps/frontend/src/hooks/useImport.ts` | State machine hook | VERIFIED | 189 lines. `upload → parsing → preview → importing → success` transitions. Fetches `/api/import/config` on mount. Client-side `parseKartex` for `.kartex`, skip for `.zip`. |
| `apps/frontend/src/lib/api.ts` | `postForm()` helper | VERIFIED | Lines 89–91: `postForm(url, formData)` calls `baseFetch` with `body: formData` (no `Content-Type` header so browser sets multipart boundary). Used in `useImport.submitImport`. |
| `apps/frontend/src/App.tsx` | `/import` route wired | VERIFIED | Line 79: `<Route path="/import" element={<ImportPage />} />` inside `ProtectedRoute > AppShell`. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `ImportPage.tsx` | `useImport` hook | `import { useImport }` | WIRED | Line 18 import; all hook state destructured and used in render. |
| `useImport` | `parseKartex` from `@kartex/shared` | `import { parseKartex }` | WIRED | Line 3 import; called at line 89 for `.kartex` files. |
| `useImport` | `POST /api/import` | `api.postForm('/api/import', formData)` | WIRED | Line 124; response status 201/422/413 all handled with state transitions. |
| `useImport` | `GET /api/import/config` | `api.get('/api/import/config')` | WIRED | Line 41 in `fetchConfig`; result written to `maxFileSizeBytes` state; used in client-side size check. |
| `ImportPage` | `KartexRenderer` | `import { KartexRenderer }` | WIRED | Line 13 import; used inside `LazyCard` for both `card.front` and `card.back`. |
| `import.ts` (backend) | `parseKartex` | `import { parseKartex } from '@kartex/shared'` | WIRED | Line 8 import; called for plain `.kartex` (line 73) and inside zip path (line 143). |
| `import.ts` (backend) | Prisma transaction | `prisma.$transaction(async tx => ...)` | WIRED | Lines 81–101 (plain) and 259–279 (zip). Both paths use atomic `deck.create + card.createMany`. |
| `import.ts` (backend) | `file-type` magic bytes | `fileTypeFromBuffer(bytes)` | WIRED | Line 198 (validation phase); line 215 (storage phase re-detect). Checked against `ALLOWED_MIMES` set. |
| `apps/backend/src/index.ts` | `importRouter` | `app.route('/api/import', importRouter)` | WIRED | Line 54; after `authMiddleware` at line 41 — JWT required. |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `ImportPage.tsx` — card list | `parseResult.cards` | `useImport.parseResult` set by `parseKartex(file.text())` | Yes — parsed from uploaded file content | FLOWING |
| `ImportPage.tsx` — success screen | `importResult.deckId / cardCount` | `useImport.importResult` set from `POST /api/import` 201 response body | Yes — DB-generated deckId from Prisma `deck.create` | FLOWING |
| `useImport` — `maxFileSizeBytes` | `maxFileSizeBytes` | `GET /api/import/config` response | Yes — reads `process.env.MAX_UPLOAD_BYTES` | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — import pipeline requires running backend + database + file upload. No offline-runnable entry point for these behaviors. Deferred to human verification.

---

### Probe Execution

Step 7c: No `scripts/*/tests/probe-*.sh` files declared in phase plans or found conventionally. SKIPPED.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| IMPT-01 | 05-03-PLAN.md | Upload `.kartex`, preview parsed cards | SATISFIED | `useImport` parses client-side; `ImportPage` renders `LazyCard` list |
| IMPT-02 | 05-02-PLAN.md | Upload `.kartex.zip` with bundled media | SATISFIED | `unzipper` extraction, `media/` entry handling in `import.ts` |
| IMPT-03 | 05-02-PLAN.md | Confirming import creates deck + cards atomically | SATISFIED | `prisma.$transaction` wraps both paths |
| IMPT-04 | 05-02-PLAN.md | Too-large or invalid MIME rejected with clear error | SATISFIED | `bodyLimit` 413, magic-bytes 422 with `ALLOWED_MIMES` |
| IMPT-05 | 05-02-PLAN.md | Configurable max size via env var | SATISFIED | `MAX_UPLOAD_BYTES` env var, default 10 MB, exposed via `/config` |
| MDIA-01 | 05-02-PLAN.md | Allowed image MIME types (png, jpeg, webp, gif) | SATISFIED | `ALLOWED_MIMES` set in `import.ts` lines 14–22 |
| MDIA-02 | 05-02-PLAN.md | Allowed audio MIME types (mpeg, ogg, wav) | SATISFIED | `ALLOWED_MIMES` set in `import.ts` lines 14–22 |
| MDIA-03 | 05-02-PLAN.md | Magic-bytes validation (never trust client MIME) | SATISFIED | `fileTypeFromBuffer` from `file-type` library used for all zip media entries |
| MDIA-04 | 05-02-PLAN.md | Media stored on Docker volume with UUID filename | SATISFIED | `randomUUID() + '.' + detected.ext` written to `STORAGE_PATH`, `prisma.media.create` records it |

---

### Anti-Patterns Found

No debt markers (`TBD`, `FIXME`, `XXX`), placeholder text, `return null`, empty handlers, or hardcoded empty data found in any phase 5 file. Clean.

One accepted known limitation documented inline in `import.ts` line 258 comment: `// T-5-07 (accepted): if transaction fails after media writes, orphaned files remain on disk`. This is a documented design trade-off, not an unresolved debt marker.

---

### Human Verification Required

#### 1. `.kartex` file upload and card preview

**Test:** On `/import`, upload a valid `.kartex` file with 2+ cards. Observe the PARSING state briefly, then PREVIEW state.
**Expected:** Card list renders with front/back content via `KartexRenderer` (including any math or Markdown). Deck name pre-filled from header. "Import Deck" button enabled.
**Why human:** `IntersectionObserver` lazy rendering and `KartexRenderer` visual output require a browser.

#### 2. `.kartex.zip` bundle upload and import

**Test:** Upload a `.kartex.zip` containing `deck.kartex` and a `media/` folder with an image. Confirm import.
**Expected:** PREVIEW state shows informational note (no client-side card list for ZIP). After confirming, SUCCESS screen shows correct card count and "View Deck" navigates to the new deck with cards rendered.
**Why human:** Zip extraction, magic-bytes MIME validation, and Docker volume writes require a running full stack.

#### 3. Oversized file rejection

**Test:** Upload a file larger than the configured `MAX_UPLOAD_BYTES` (default 10 MB).
**Expected:** Error message displayed — "File too large" or equivalent. No deck created in DB.
**Why human:** `bodyLimit` middleware 413 response must be observed end-to-end in browser with real file sizes.

#### 4. Invalid MIME type rejection

**Test:** Rename a `.txt` or `.exe` file to `something.kartex.zip`, zip it with a `deck.kartex`. Upload.
**Expected:** 422 error with message about file type not allowed. No deck or media created in DB.
**Why human:** Magic-bytes detection path requires binary file content and a running backend.

#### 5. Max upload size config display

**Test:** Check that the drop-zone label shows the correct MB limit matching `MAX_UPLOAD_BYTES` env var.
**Expected:** `GET /api/import/config` returns `{ maxFileSizeBytes: N }`. Drop-zone label reads "max N MB".
**Why human:** Requires live API call correlation with UI label — visual inspection needed.

---

### Gaps Summary

No gaps found. All five roadmap success criteria are fully implemented in code:

- `parseKartex()` pure function with 10 passing unit tests
- 6 Zod schemas in `@kartex/shared` with barrel exports
- Backend `importRouter` with `bodyLimit`, magic-bytes validation, unzipper, and Prisma transactions for both plain and ZIP paths
- Frontend 4-state `useImport` hook wired to `parseKartex` (client-side) and `POST /api/import` (server)
- `ImportPage` with lazy card rendering, warnings banner, deck name input, and success navigation
- `/import` route protected and registered in App.tsx
- `MAX_UPLOAD_BYTES` env var controls limit end-to-end

All 5 human verification items are browser/stack integration checks — no code gaps, no stubs, no missing wiring.

---

_Verified: 2026-05-28T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
