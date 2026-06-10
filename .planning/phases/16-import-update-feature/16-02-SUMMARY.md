---
phase: 16-import-update-feature
plan: "02"
subsystem: backend-routes
tags: [wave-1, backend, tdd, import-update, i18n]
dependency_graph:
  requires:
    - apps/backend/src/routes/__tests__/deck-update.test.ts (Plan 16-01 — Wave 0 stubs)
  provides:
    - apps/backend/src/routes/deckUpdate.ts
    - POST /api/decks/:id/update/preview
    - POST /api/decks/:id/update/apply
    - deckUpdate.* i18n namespace (16 keys, en + de)
  affects:
    - apps/backend/src/index.ts
    - apps/frontend/src/locales/en.json
    - apps/frontend/src/locales/de.json
tech_stack:
  added: []
  patterns:
    - bodyLimit-first handler chain pattern (Hono — T-16-03 DoS guard)
    - Prisma interactive transaction (createMany + update loop + deleteMany)
    - computeDiff pure function (no DB side effects — enables preview/apply separation)
    - stateless re-computation on apply (TOCTOU prevention per RESEARCH.md)
key_files:
  created:
    - apps/backend/src/routes/deckUpdate.ts
  modified:
    - apps/backend/src/routes/__tests__/deck-update.test.ts
    - apps/backend/src/index.ts
    - apps/frontend/src/locales/en.json
    - apps/frontend/src/locales/de.json
decisions:
  - computeDiff uses sortedTagsJson comparison (JSON.stringify([...tags].sort())) for tag equality — order-independent
  - keepRemoved defaults to true (string !== 'false') — absent keepRemoved body field keeps cards (safe default)
  - apply route re-fetches deck and re-parses file independently of preview — stateless, prevents TOCTOU
  - tx.card.update data payload contains only frontContent/backContent/tags — kartexId and CardProgress fields intentionally excluded
metrics:
  duration: "9m 33s"
  completed: "2026-06-10"
  tasks_completed: 2
  files_changed: 4
---

# Phase 16 Plan 02: Backend Routes for Deck Import-Update Summary

Two Hono POST routes (`/:id/update/preview` and `/:id/update/apply`) backed by a pure `computeDiff` function and a single Prisma interactive transaction, with 16 i18n keys added to both locale files.

## What Was Built

1. **`apps/backend/src/routes/deckUpdate.ts`** — New file exporting `deckUpdateRouter` with:
   - `computeDiff(fileCards, deckCards)` — pure function classifying cards into added/updated/unchanged/removed buckets. Tags compared sorted (order-independent). Returns enriched result with `addedCards`, `updatedCards`, `removedIds` for use in the apply transaction.
   - `POST /:id/update/preview` — owner-gated, file-validated endpoint returning `{ added, updated, unchanged, removed }`. Uses bodyLimit (5 MB cap, T-16-03) as first middleware arg.
   - `POST /:id/update/apply` — same validation pipeline, re-computed stateless (TOCTOU prevention). Executes atomic Prisma `$transaction`: `createMany` for added cards, individual `update` (frontContent/backContent/tags only) for updated cards, `deleteMany` when `keepRemoved=false`. Returns `{ added, updated, unchanged, removed, deckId }`.
   - Duplicate kartexId guard in both routes → 422 before any DB write.
   - `userId` always from `c.get('userId')` (JWT) — never from body (T-16-12).

2. **`apps/backend/src/routes/__tests__/deck-update.test.ts`** — All 12 `it.todo` stubs (T-16-01 through T-16-12) replaced with passing Vitest assertions using `vi.mock` for Prisma and `parseKartex`. Tests exercise: 403/404/422 guard cases, diff count correctness, keepRemoved true/false, transaction atomicity, and JWT-only userId extraction.

3. **`apps/backend/src/index.ts`** — Added `deckUpdateRouter` import and mount at `app.route('/api/decks', deckUpdateRouter)` after the existing `decksRouter` mount (step 5f).

4. **`apps/frontend/src/locales/en.json` + `de.json`** — Both files extended with `"deckUpdate"` top-level namespace containing all 16 required keys.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create deckUpdate.ts — computeDiff + preview + apply routes (TDD GREEN) | 5592aa2 | apps/backend/src/routes/deckUpdate.ts, apps/backend/src/routes/__tests__/deck-update.test.ts |
| 2 | Mount deckUpdateRouter in index.ts + add deckUpdate.* i18n keys | 0e0ec4b | apps/backend/src/index.ts, apps/frontend/src/locales/en.json, apps/frontend/src/locales/de.json |

## TDD Gate Compliance

- **RED gate:** Wave 0 Plan 01 created 12 `it.todo` stubs (commit ec6041d) — locked behavioral contract before implementation.
- **GREEN gate:** Task 1 replaced all 12 stubs with assertions that pass against the new implementation (commit 5592aa2) — `feat(16-02)` commit after test commit.
- All 12 backend tests (T-16-01..T-16-12) pass. Pre-existing 3 failures in `kartex-parser-id.test.ts` are unrelated (confirmed pre-existing in Plan 16-01 summary).

## Verification Results

1. `yarn workspace @kartex/backend test --run`: 12 deck-update tests PASS, 38 todos, 3 pre-existing failures in unrelated file — no regressions
2. `yarn workspace @kartex/backend build`: exits 0 (no TypeScript errors)
3. `yarn workspace @kartex/frontend build`: exits 0 (no JSON syntax errors)
4. en.json deckUpdate key count: 16
5. de.json deckUpdate key count: 16
6. `grep "deckUpdateRouter" apps/backend/src/index.ts` → import on line 17, mount on line 76

## Deviations from Plan

None — plan executed exactly as written.

The TDD execution followed the RED (Wave 0 stubs from Plan 01) → GREEN (Task 1 implementation) sequence. No architectural changes were needed, all validations pass.

## Known Stubs

None. All implementation is complete with real logic. No hardcoded empty values or placeholder text in production code paths.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| trust_boundary: multipart | apps/backend/src/routes/deckUpdate.ts | Two new POST endpoints accepting multipart/form-data at `/api/decks/:id/update/preview` and `/api/decks/:id/update/apply` — guarded by bodyLimit (T-16-03), owner gate (T-16-01/02), parseKartex validation (T-16-04), and duplicate id check. Matches plan threat model exactly. |

All STRIDE mitigations from the plan's threat register are implemented:
- T-16-01: `deck.ownerId !== userId → 403` before any DB write
- T-16-03: `bodyLimit({ maxSize: MAX_BYTES })` as first handler arg
- T-16-04: duplicate kartexId guard + parseKartex fatal check
- T-16-05: `update` payload excludes `kartexId` and all `CardProgress` fields
- T-16-07: `userId = c.get('userId')` only

## Self-Check: PASSED

- [x] `apps/backend/src/routes/deckUpdate.ts` — FOUND (5592aa2)
- [x] `apps/backend/src/routes/__tests__/deck-update.test.ts` — FOUND (5592aa2)
- [x] `apps/backend/src/index.ts` contains `deckUpdateRouter` import and mount — FOUND (0e0ec4b)
- [x] Both locale files have 16 deckUpdate keys — VERIFIED
- [x] Both commits verified in git log (5592aa2, 0e0ec4b)
