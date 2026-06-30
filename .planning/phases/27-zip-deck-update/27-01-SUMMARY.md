---
phase: 27-zip-deck-update
plan: "01"
subsystem: backend
status: complete
tags: [backend, import, deck-update, zip, media, tdd]
dependency_graph:
  requires:
    - 16-02-SUMMARY.md  # deckUpdate.ts apply/preview handlers (Phase 16)
    - 05-SUMMARY.md     # media storage pattern (Phase 5)
  provides:
    - importMedia.ts shared helper (rewriteMediaRefs, collectAndValidateMedia, storeMediaBuffers)
    - deckUpdate zip branch (DECKU-01..04)
  affects:
    - apps/backend/src/routes/import.ts (refactored — no behavior change)
    - apps/backend/src/routes/deckUpdate.ts (extended)
tech_stack:
  added: []
  patterns:
    - importMedia.ts utility extraction from import.ts
    - collectAndValidateMedia validate-all-then-write pattern (D-08)
    - storeMediaBuffers UUID-based storage (T-5-02)
    - deckUpdate zip branch stateless preview (no media in preview)
    - rewriteMediaRefs applied in apply tx only
key_files:
  created:
    - apps/backend/src/lib/importMedia.ts
    - apps/backend/src/lib/__tests__/importMedia.test.ts
  modified:
    - apps/backend/src/routes/import.ts
    - apps/backend/src/routes/deckUpdate.ts
    - apps/backend/src/routes/__tests__/deck-update.test.ts
decisions:
  - 27-01: storeMediaBuffers prismaClient parameter uses concrete MediaCreateData struct instead of Record<string,unknown> — avoids Prisma generic type incompatibility at call site
  - 27-01: deckUpdate zip preview is stateless — no media extraction or validation in preview; only deck.kartex parsed and diff computed (Pitfall 1 prevention)
  - 27-01: collectAndValidateMedia returns CollectResult discriminated union (ok:true/false) — callers use result.ok check without separate error array variable
metrics:
  duration: "8 minutes"
  completed: "2026-06-30"
  tasks_completed: 3
  files_modified: 5
---

# Phase 27 Plan 01: Zip Deck Update — Backend Helper + Route Extension Summary

**One-liner:** Extracted `importMedia.ts` shared helper (validate + store media from zip) and wired `.kartex.zip` acceptance into both deckUpdate preview and apply handlers with full media lifecycle (magic-byte validation, UUID storage, ref rewriting) while leaving SM-2 progress untouched.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Extract importMedia.ts shared helper (TDD) | bae00a7 | `importMedia.ts`, `__tests__/importMedia.test.ts` (RED: 20bf4d1) |
| 2 | Refactor import.ts to consume importMedia.ts | 52898ad | `import.ts`, `importMedia.ts` (type fix) |
| 3 | Add .kartex.zip branch to deckUpdate + extend tests | f7f61aa | `deckUpdate.ts`, `deck-update.test.ts` |

## Verification Results

- `yarn workspace @kartex/backend test importMedia` — 10/10 tests pass
- `yarn workspace @kartex/backend test deck-update` — 16/16 tests pass (12 original T-16 + 4 new DECKU)
- `yarn workspace @kartex/backend build` — TypeScript typecheck clean, exit 0
- Manual grep: no `5 * 1024 * 1024` in deckUpdate.ts; no `(not .kartex.zip)` string

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Type] MediaCreateData concrete struct for storeMediaBuffers prismaClient parameter**
- **Found during:** Task 2 (build verification after import.ts refactor)
- **Issue:** `Record<string, unknown>` as the `data` type in `storeMediaBuffers` prismaClient interface was not assignable to Prisma's generated `MediaCreateArgs` type — TypeScript error TS2345
- **Fix:** Introduced a concrete `MediaCreateData = { ownerId: string; filename: string; mimeType: string; storagePath: string; sizeBytes: number }` type alias in `importMedia.ts` and used it for the prismaClient parameter
- **Files modified:** `apps/backend/src/lib/importMedia.ts`
- **Commit:** 52898ad (same commit as refactor)

## Known Stubs

None — all wired logic is production-ready. The zip apply branch fully validates, stores, and rewrites media refs.

## Threat Flags

No new network endpoints or auth paths introduced. The threat mitigations defined in the plan threat register are all implemented:

| Flag | File | Status |
|------|------|--------|
| T-27-01 (Tampering — zip path) | importMedia.ts `storeMediaBuffers` | Mitigated: `basename()` strips directory; UUID filename used |
| T-27-02 (Tampering — MIME) | importMedia.ts `collectAndValidateMedia` | Mitigated: `fileTypeFromBuffer` magic-byte check |
| T-27-03 (DoS — size) | deckUpdate.ts `MAX_BYTES` from env, MAX_MEDIA_ENTRIES=100, MAX_TOTAL_BYTES ceiling | Mitigated |
| T-27-04 (EoP — owner gate) | deckUpdate.ts preview + apply | Mitigated: owner check before zip processing |
| T-27-05 (Tampering — UUID provenance) | importMedia.ts `storeMediaBuffers` | Mitigated: `randomUUID()` server-side only |
| T-27-06 (Spoofing — macOS metadata) | deckUpdate.ts apply zip branch | Mitigated: `__MACOSX/` + directory entry filter |

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| `apps/backend/src/lib/importMedia.ts` exists | FOUND |
| `apps/backend/src/lib/__tests__/importMedia.test.ts` exists | FOUND |
| `apps/backend/src/routes/deckUpdate.ts` exists | FOUND |
| Commit 20bf4d1 (test RED) | FOUND |
| Commit bae00a7 (feat GREEN) | FOUND |
| Commit 52898ad (refactor import.ts) | FOUND |
| Commit f7f61aa (deckUpdate zip branch) | FOUND |
