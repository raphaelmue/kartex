---
phase: 27-zip-deck-update
verified: 2026-07-01T08:41:51Z
status: passed
score: 9/9 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 27: Zip Deck Update Verification Report

**Phase Goal:** Deck owners can update a deck in place by uploading a `.kartex.zip` bundle that includes media files (depends on Phase 16 import-update feature)
**Verified:** 2026-07-01T08:41:51Z
**Status:** passed
**Re-verification:** No — initial verification (a prior commit marked ROADMAP.md complete without ever running this step; no VERIFICATION.md or UAT.md existed before this run)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Deck-update file picker accepts both `.kartex` and `.kartex.zip` (ROADMAP SC1) | VERIFIED | `apps/frontend/src/pages/DeckDetailPage.tsx:570` — `accept=".kartex,.kartex.zip"`. Backend accept guard in `deckUpdate.ts:137-141` (`preview`) and `:224-229` (`apply`) computes `isZip`/`isKartex` and only 400s when neither matches — the old `.kartex.zip` rejection string is gone (grep confirms absence) |
| 2 | Uploading a zip correctly extracts, validates (magic bytes), and stores media from `media/` (ROADMAP SC2 / DECKU-02) | VERIFIED | `deckUpdate.ts` apply zip branch (lines 253-273) builds macOS-safe media entry list, calls `collectAndValidateMedia` (validates via `fileTypeFromBuffer` magic bytes against `ALLOWED_MIMES`, `importMedia.ts:56-89`) before any write, and `storeMediaBuffers` (`importMedia.ts:110-138`) writes via `writeFile` + `prisma.media.create` under `randomUUID()` filenames. Test `DECKU-02` (deck-update.test.ts:540-554) asserts a disallowed MIME returns 422 and `prisma.$transaction` is never called — passing |
| 3 | Card content references newly stored media UUIDs, not original zip filenames (ROADMAP SC3 / DECKU-03) | VERIFIED | `rewriteMediaRefs` (`importMedia.ts:20-25`) applied to both `tx.card.createMany` and `tx.card.update` payloads in the zip apply branch (`deckUpdate.ts:291-292, 304-305`). Test `DECKU-03` asserts `updateCall.data.frontContent` matches `/media:\/\/[0-9a-f-]{36}\.png/` — passing |
| 4 | SM-2 progress for kartexId-matched cards is completely untouched after a zip update (ROADMAP SC4 / DECKU-04) | VERIFIED | Zip apply `tx.card.update` data object (`deckUpdate.ts:301-308`) contains only `frontContent`, `backContent`, `tags` — no `kartexId`/SM-2 fields. Test `DECKU-04` explicitly asserts absence of `kartexId`, `easeFactor`, `interval`, `repetitions`, `nextReviewAt` — passing |
| 5 | Invalid MIME in any zip media entry returns 422 before any file is written to disk or DB | VERIFIED | `collectAndValidateMedia` collects all validation errors and only returns `ok:true` with zero errors (`importMedia.ts:92-96`); `deckUpdate.ts:267-273` returns 422 immediately on `collected.ok === false`, before `storeMediaBuffers` (writes) is ever called |
| 6 | `import.ts` refactor to consume the shared helper causes no behavior change | VERIFIED | `import.ts` now imports `rewriteMediaRefs, collectAndValidateMedia, storeMediaBuffers` from `../lib/importMedia.js` (line 8) and calls them in the same validate-then-store sequence previously inlined; plain `.kartex` and zip-with-deck.kartex parsing paths are unchanged |
| 7 | `importMedia.ts` exports the documented API and is unit-tested | VERIFIED | `apps/backend/src/lib/importMedia.ts` exports `ALLOWED_MIMES`, `rewriteMediaRefs`, `MAX_MEDIA_ENTRIES`, `collectAndValidateMedia`, `storeMediaBuffers` exactly as specified; `importMedia.test.ts` — 10/10 tests pass (ran live, not just SUMMARY claim) |
| 8 | `deckUpdate.ts` zip branch + retained T-16 tests are green | VERIFIED | `deck-update.test.ts` — 16/16 tests pass (12 retained T-16 + 4 new DECKU) — ran live |
| 9 | Frontend and backend build cleanly with these changes | VERIFIED | `yarn workspace @kartex/backend build` — exit 0, no errors. `yarn workspace @kartex/frontend build` — exit 0 (2 assets, PWA precache generated), no TS errors |

**Score:** 9/9 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/backend/src/lib/importMedia.ts` | Exports ALLOWED_MIMES, rewriteMediaRefs, collectAndValidateMedia, storeMediaBuffers | VERIFIED | All four symbols present with matching signatures (plus `MAX_MEDIA_ENTRIES`, types) |
| `apps/backend/src/lib/__tests__/importMedia.test.ts` | Unit tests for helper | VERIFIED | 10 tests, all passing on live run |
| `apps/backend/src/routes/deckUpdate.ts` | Zip branch in both preview and apply | VERIFIED | Both handlers branch on `isZip`; apply branch does full extract/validate/store/rewrite; preview branch is stateless (no media touch), matching plan's Pitfall-1 guard |
| `apps/backend/src/routes/import.ts` | Refactored to consume the helper, no behavior change | VERIFIED | Imports the three helper functions; inline `ALLOWED_MIMES`/`rewriteMediaRefs`/validation loop/storage loop are gone, replaced by helper calls in the same sequence |
| `apps/backend/src/routes/__tests__/deck-update.test.ts` | Extended with zip-path DECKU tests, T-16 tests retained | VERIFIED | New `describe('... zip path (DECKU-01..DECKU-04)')` block present with 4 tests; all 12 original T-16 tests still present and passing |
| `apps/frontend/src/pages/DeckDetailPage.tsx` | `accept=".kartex,.kartex.zip"` on update file input | VERIFIED | Line 570 confirmed |
| `apps/frontend/src/locales/en.json` / `de.json` | `deckUpdate.parseError` mentions `.kartex.zip` | VERIFIED | Both files updated in parity (line 435 each) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `deckUpdate.ts` apply zip branch | `importMedia.storeMediaBuffers` / `rewriteMediaRefs` | direct function calls | WIRED | `storeMediaBuffers` called at line 282; `rewriteMediaRefs` applied to both `createMany` (291-292) and `update` (304-305) payloads |
| `import.ts` | `importMedia.ts` | ESM import (`.js` extension) | WIRED | `import { rewriteMediaRefs, collectAndValidateMedia, storeMediaBuffers } from '../lib/importMedia.js'` — refactor preserves behavior, both files' logic is a byte-for-byte match on phase intent |
| `DeckDetailPage.tsx` file input | `DeckUpdateModal` | `updateFile` state → modal `open`/`file` props | WIRED | `updateFileInputRef` onChange sets `updateFile`; `<DeckUpdateModal open={updateFile !== null} file={updateFile} .../>` at line 582-585 |
| `DeckUpdateModal.tsx` | backend `deckUpdate.ts` routes | `api.postForm` | WIRED | Posts to `/api/decks/${deckId}/update/preview` (line 51) and `/api/decks/${deckId}/update/apply` (line 76) — the exact endpoints extended in 27-01 |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| importMedia unit tests pass | `yarn workspace @kartex/backend test importMedia --run` | 10/10 passed | PASS |
| deckUpdate route tests pass (incl. DECKU-01..04) | `yarn workspace @kartex/backend test deck-update --run` | 16/16 passed | PASS |
| Backend typechecks/builds | `yarn workspace @kartex/backend build` | exit 0 | PASS |
| Frontend typechecks/builds | `yarn workspace @kartex/frontend build` | exit 0, built in 15.48s | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DECKU-01 | 27-01, 27-02 | Deck update path accepts `.kartex.zip` in addition to `.kartex` | SATISFIED | Backend accept guard (both handlers) + frontend `accept` attribute + i18n copy — all verified above |
| DECKU-02 | 27-01 | Media files from zip's `media/` folder extracted, validated (magic bytes), stored | SATISFIED | `collectAndValidateMedia`/`storeMediaBuffers` wired into apply branch; test asserts 422 + no transaction on bad MIME |
| DECKU-03 | 27-01 | Media references in updated card content rewritten to new UUID filenames | SATISFIED | `rewriteMediaRefs` applied to both createMany and update payloads; test asserts UUID-pattern match |
| DECKU-04 | 27-01 | SM-2 progress for matched cards untouched by zip update | SATISFIED | Update payload restricted to frontContent/backContent/tags; test explicitly asserts absence of SM-2 fields |

No orphaned requirements — REQUIREMENTS.md maps exactly DECKU-01..04 to Phase 27, all four are claimed and satisfied across the two plans.

### Anti-Patterns Found

None. Grep for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER|not yet implemented|not available|coming soon` (case-insensitive) across `importMedia.ts` and `deckUpdate.ts` returned zero matches. No empty-implementation or hardcoded-empty-return patterns found in the zip branches.

### Human Verification Required

None. All must-haves resolved to VERIFIED via passing automated tests, live builds, and direct code inspection of wiring. No visual/UX/real-time behavior claims in this phase's must-haves that require manual confirmation beyond what the existing automated test suite (which directly asserts the DECKU-01..04 behaviors, including the SM-2-field-absence and UUID-rewrite invariants) already covers.

### Gaps Summary

No gaps. All 4 requirement IDs (DECKU-01..04) are implemented, wired, and covered by passing tests that were re-run live during this verification (not merely asserted in SUMMARY.md). REQUIREMENTS.md's existing "Complete" checkmarks for DECKU-01..04 are accurate. The ROADMAP.md "Complete" marking for Phase 27 was procedurally premature (no VERIFICATION.md existed before this run), but substantively correct — the underlying code and tests support the claim.

---

_Verified: 2026-07-01T08:41:51Z_
_Verifier: Claude (gsd-verifier)_
