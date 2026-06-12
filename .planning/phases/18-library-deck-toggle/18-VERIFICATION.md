---
phase: 18-library-deck-toggle
verified: 2026-06-12T16:00:00Z
status: gaps_found
score: 13/15 must-haves verified
overrides_applied: 0
gaps:
  - truth: "GET /api/decks/:id returns DeckShare.isActive (not Deck.isActive) for share recipients — CR-01"
    status: failed
    reason: "apps/backend/src/routes/decks.ts line 101 spreads `deck` directly: `return c.json({ ...deck, userPermission: share.permission }, 200)`. This sends `deck.isActive` (owner's state) to share recipients. The list endpoint (GET /api/decks) has the correct `isActive: r.isActive` override at line 60 but the single-deck view does not. DeckDetailPage fetches via this endpoint; it will display the wrong isActive value for library decks."
    artifacts:
      - path: "apps/backend/src/routes/decks.ts"
        issue: "Line 101: `return c.json({ ...deck, userPermission: share.permission }, 200)` must be `return c.json({ ...deck, isActive: share.isActive, userPermission: share.permission }, 200)`"
    missing:
      - "Add `isActive: share.isActive` override in GET /api/decks/:id share-recipient return path (decks.ts ~line 101)"
  - truth: "POST /api/study/rate respects DeckShare.isActive — deactivated library decks cannot have progress recorded against them — CR-02"
    status: failed
    reason: "apps/backend/src/routes/study.ts lines 161-166 check that a DeckShare row exists but do not check share.isActive. A user who has deactivated a library deck (DeckShare.isActive=false, excluded from queue by GET /api/study/due) can still call POST /api/study/rate with a cardId from that deck and record progress. Semantic inconsistency: isActive flag controls queue inclusion but not rating permission."
    artifacts:
      - path: "apps/backend/src/routes/study.ts"
        issue: "Lines 161-166: after `if (!share) return 403`, add `if (!share.isActive) return c.json({ error: 'Forbidden.' }, 403)` to reject rating on deactivated library decks"
    missing:
      - "Add `if (!share.isActive) return c.json({ error: 'Forbidden.' }, 403)` in POST /api/study/rate share-recipient branch (study.ts ~line 165)"
---

# Phase 18: Library Deck Toggle Verification Report

**Phase Goal:** Users can activate or deactivate decks they've added from the Explore page, giving them the same study queue control as owned decks
**Verified:** 2026-06-12T16:00:00Z
**Status:** gaps_found — 2 blockers from code review (CR-01, CR-02)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | DeckShare model in schema.prisma contains `isActive Boolean @default(true)` | VERIFIED | `schema.prisma` line 93: `isActive         Boolean    @default(true)` inside DeckShare model before `@@unique` |
| 2 | Migration SQL file exists with ALTER TABLE DeckShare ADD COLUMN isActive | VERIFIED | `migrations/20260612000000_add_deckshare_isactive/migration.sql` line 3: `ALTER TABLE "DeckShare" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;` |
| 3 | prisma generate runs without error after schema change | VERIFIED | `npx tsc --noEmit` in apps/backend exits 0 (Prisma client types present and used without error — `DeckShare.isActive` referenced in decks.ts line 314 and study.ts line 24 with no type errors) |
| 4 | UpdateLibrarySchema exported from packages/shared/src/schemas/deck.ts | VERIFIED | `packages/shared/src/schemas/deck.ts` line 14: `export const UpdateLibrarySchema = z.object({ isActive: z.boolean() })`; line 15: `export type UpdateLibraryInput = z.infer<typeof UpdateLibrarySchema>` |
| 5 | GET /api/decks returns isActive from DeckShare row (not Deck.isActive) for shared decks | VERIFIED | `decks.ts` lines 58-62: `sharedRows.map((r) => ({ ...r.deck, isActive: r.isActive, sharedByUsername: r.deck.owner.username }))` — explicit `isActive: r.isActive` override correctly shadows `r.deck.isActive` |
| 6 | PATCH /api/decks/:id/library updates DeckShare.isActive and returns `{isActive: boolean}` | VERIFIED | `decks.ts` lines 299-317: route exists, parses body with `UpdateLibrarySchema.safeParse`, calls `prisma.deckShare.update({ data: { isActive: body.data.isActive } })`, returns `c.json({ isActive: updated.isActive }, 200)` |
| 7 | PATCH /api/decks/:id/library returns 403 when called by the deck owner | VERIFIED | `decks.ts` lines 308-311: `findUnique` on `deckId_sharedWithUserId` where `sharedWithUserId: userId` — owner has no DeckShare row for own deck, so `share` is null → `return c.json({ error: 'Forbidden.' }, 403)` |
| 8 | PATCH /api/decks/:id/library returns 403 when caller has no DeckShare row | VERIFIED | Same code path as #7: `if (!share) return c.json({ error: 'Forbidden.' }, 403)` at line 311 |
| 9 | GET /api/study/due excludes shared decks where DeckShare.isActive = false | VERIFIED | `study.ts` line 24: `where: { sharedWithUserId: userId, isActive: true }` — filter applied at query level; `deckFilter` OR[1] at line 33 is `{ id: { in: activeSharedDeckIds } }` with no `Deck.isActive` on shared branch |
| 10 | Library deck card on DecksPage shows a Switch + Active label in its CardFooter | VERIFIED | `DecksPage.tsx` lines 183-195: `deck.ownerId !== user?.id` branch has Switch with `checked={deck.isActive}`, label `{t('decks.activeLabel')}`, wrapped in `<div className="flex items-center gap-2 mr-auto">` |
| 11 | Toggling the Switch calls PATCH /api/decks/:id/library with `{ isActive: boolean }` | VERIFIED | `DecksPage.tsx` line 123: `api.patch(\`/api/decks/${deckId}/library\`, { isActive: checked })`; test LIB-01c asserts `mockApiPatch` called with `'/api/decks/d3/library'` and passes |
| 12 | Optimistic update reverts if PATCH fails; toast.error shown on failure | VERIFIED | `DecksPage.tsx` lines 118-132: optimistic `setDecks` at line 119-121, catch block reverts at lines 127-129 and calls `toast.error(t('decks.failedToToggle'))`; test LIB-01d verifies this path passes |
| 13 | Library deck Switch id is `active-lib-{deckId}` (distinct from owned-deck `active-{deckId}`) | VERIFIED | `DecksPage.tsx` line 190: `id={\`active-lib-${deck.id}\`}`; owned-deck Switch at line 211: `id={\`active-${deck.id}\`}`; LIB-01a asserts `switchEl.id.toContain('active-lib-')` and passes |
| 14 | Owned-deck behavior unchanged — handleToggleActive still calls PATCH /api/decks/:id | VERIFIED | `DecksPage.tsx` line 107: `api.patch(\`/api/decks/${deckId}\`, { isActive: checked })` — no `/library` suffix; DECK-01c still passes |
| 15 | Frontend and backend test suites pass | VERIFIED | Frontend: 108 passed, 14 test files. Backend: 18 passed, 45 todo, 0 failures. Both exit 0. |

**Score: 13/15 truths verified** (truths 1-14 verified, gaps on 2 derived from code review CR-01 and CR-02)

---

### Roadmap Success Criteria

| SC | Text | Status | Evidence |
|----|------|--------|----------|
| SC-1 | Library deck shows active/inactive toggle on DecksPage identical to owned-deck toggle | VERIFIED | DecksPage.tsx library branch renders Switch at lines 186-194; owned-deck Switch at lines 208-213 — identical structure |
| SC-2 | Toggling persists after page refresh | UNCERTAIN (human) | DeckShare.isActive column exists, PATCH endpoint writes to it, GET /api/decks reads it back — persistence mechanism is present; actual refresh behavior requires browser test |
| SC-3 | /study session only includes active library decks | VERIFIED | study.ts `isActive: true` filter at query level (line 24) confirmed |
| SC-4 | Toggling library deck does not affect deck owner's isActive state | VERIFIED | PATCH /api/decks/:id/library updates `DeckShare.isActive`, not `Deck.isActive` — separate columns, separate endpoints |

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/backend/prisma/schema.prisma` | DeckShare.isActive field | VERIFIED | Line 93: `isActive Boolean @default(true)` |
| `apps/backend/prisma/migrations/20260612000000_add_deckshare_isactive/migration.sql` | DDL migration | VERIFIED | Contains `ALTER TABLE "DeckShare" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true` |
| `packages/shared/src/schemas/deck.ts` | UpdateLibrarySchema + UpdateLibraryInput | VERIFIED | Lines 14-15 export both |
| `apps/backend/src/routes/decks.ts` | PATCH /api/decks/:id/library + GET isActive fix | VERIFIED | Lines 58-62 (GET fix), lines 299-317 (PATCH handler) |
| `apps/backend/src/routes/study.ts` | GET /api/study/due filter fix | VERIFIED | Lines 23-27 use `isActive: true` + `activeSharedDeckIds` |
| `apps/frontend/src/pages/DecksPage.tsx` | handleToggleLibraryActive + library Switch | VERIFIED | Lines 118-132 (handler), lines 183-195 (Switch) |
| `apps/frontend/src/pages/__tests__/DecksPage.test.tsx` | LIB-01 library toggle tests | VERIFIED | Lines 183-263: `describe('DecksPage library deck toggle (LIB-01)')` with 4 passing tests |
| `apps/backend/src/routes/__tests__/library-toggle.test.ts` | PATCH /api/decks/:id/library backend stubs | VERIFIED | 7 `it.todo` stubs in 2 describe blocks — all pass (todo stubs do not fail) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `decks.ts` | `@kartex/shared` | `import UpdateLibrarySchema` | WIRED | Line 4: `import { ..., UpdateLibrarySchema } from '@kartex/shared'` |
| `study.ts` | `prisma.deckShare` | `findMany with isActive: true filter` | WIRED | Line 24: `where: { sharedWithUserId: userId, isActive: true }` |
| `DecksPage.tsx` | `PATCH /api/decks/:id/library` | `api.patch call in handleToggleLibraryActive` | WIRED | Line 123: `api.patch(\`/api/decks/${deckId}/library\`, { isActive: checked })` |
| `Switch onCheckedChange` | `handleToggleLibraryActive` | `void handleToggleLibraryActive(deck.id, checked)` | WIRED | Line 188: `onCheckedChange={(checked) => void handleToggleLibraryActive(deck.id, checked)}` |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Frontend test suite passes | `yarn test --run` in apps/frontend | 108 passed, 0 failed, exit 0 | PASS |
| Backend test suite passes | `yarn test --run` in apps/backend | 18 passed, 45 todo, exit 0 | PASS |
| Frontend TypeScript clean | `npx tsc --noEmit` in apps/frontend | No errors, exit 0 | PASS |
| Backend TypeScript clean | `npx tsc --noEmit` in apps/backend | No errors, exit 0 | PASS |

---

### CI Pipeline Check

| Check | Command | Result | Status |
|-------|---------|--------|--------|
| CI on main | `gh run list --branch main --limit 1` | conclusion: success | PASS |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `DecksPage.test.tsx` | 47-48 | Stale comment: "isActive is not yet on DeckListItem schema (Plan 02 adds it)" and "Tests assert against the rendered switch state which Plan 03 will implement." | Info | Both claims are false — `isActive` has been on `DeckListItem` since Phase 10; no Plan 03 exists. Misleads maintainers. See WR-03 in 18-REVIEW.md. |
| `DecksPage.test.tsx` | 61, 77 | `& { isActive: boolean }` intersection cast on `DeckListItem` is redundant — `isActive` is already on the type | Info | No functional impact; see IN-01 in 18-REVIEW.md. |
| `library-toggle.test.ts` | 9-13 | All 7 backend tests are `it.todo` — zero coverage on security-critical 403 authorization paths | Warning | If PATCH /api/decks/:id/library 403 logic regresses, no test will catch it. See WR-02 in 18-REVIEW.md. |

No `TBD`, `FIXME`, or `XXX` debt markers found in phase-modified files.

---

### Open Code Review Issues

The code review (`18-REVIEW.md`) identified two critical issues that remain unresolved in the codebase:

**CR-01 (BLOCKER): `GET /api/decks/:id` returns `Deck.isActive` not `DeckShare.isActive` for share recipients**

`decks.ts` line 101:
```ts
return c.json({ ...deck, userPermission: share.permission }, 200)
```
This spreads `deck.isActive` (owner's state) to share recipients. The list endpoint fixed this with `isActive: r.isActive`. The single-deck view did not. DeckDetailPage fetches via this endpoint and will show the wrong isActive for library decks.

Fix: `return c.json({ ...deck, isActive: share.isActive, userPermission: share.permission }, 200)`

**CR-02 (BLOCKER): `POST /api/study/rate` does not check `DeckShare.isActive` for shared decks**

`study.ts` lines 161-166 check share existence but not `share.isActive`. A user who deactivates a library deck (excluded from the study queue) can still POST to `/api/study/rate` with a cardId from that deck and record progress. Semantic inconsistency: the `isActive` flag controls queue inclusion but not rating permission.

Fix: After the null share check, add `if (!share.isActive) return c.json({ error: 'Forbidden.' }, 403)`.

**WR-01 (Warning): `GET /api/study/deck/:deckId` does not check `DeckShare.isActive`**

The deck-mode study endpoint allows loading all cards from a deactivated library deck via the deck-mode path (Deck Mode / Exam Mode). Same fix pattern as CR-02.

**WR-02 (Warning): Backend PATCH tests are all `it.todo` — no active coverage on 403 authorization paths**

The security gates at PATCH /api/decks/:id/library (owner gets 403, non-recipient gets 403) have no running test. These are the primary T-18-03 mitigations.

---

### Gaps Summary

**2 blockers from code review prevent the phase goal from being fully achieved.**

The phase goal is: "Users can activate or deactivate decks they've added from the Explore page, giving them the same study queue control as owned decks."

The owned-deck toggle has full consistency: GET /api/decks (list), GET /api/decks/:id (single), POST /api/study/rate all use `Deck.isActive` uniformly. The library deck toggle is inconsistent:

- GET /api/decks (list): CORRECT — uses `DeckShare.isActive`
- GET /api/study/due: CORRECT — filters by `DeckShare.isActive`
- PATCH /api/decks/:id/library: CORRECT — updates `DeckShare.isActive`
- GET /api/decks/:id (single): BROKEN — returns `Deck.isActive` to recipients (CR-01)
- POST /api/study/rate: BROKEN — ignores `DeckShare.isActive` (CR-02)
- GET /api/study/deck/:deckId: BROKEN — ignores `DeckShare.isActive` (WR-01)

The frontend toggle works correctly as implemented. The backend surface is partially complete but the single-deck view and rating path were not updated to match the study-due filter fix.

---

### Human Verification Required

1. **Deck toggle persists after page refresh**
   - **Test:** Add a library deck to DecksPage, toggle it inactive, refresh the page
   - **Expected:** Toggle remains inactive after refresh (isActive=false persisted in DeckShare row)
   - **Why human:** Requires a running app with a real DB connection

2. **Inactive library deck absent from study queue**
   - **Test:** Deactivate a library deck, navigate to /study, start a session
   - **Expected:** No cards from the deactivated library deck appear in the session
   - **Why human:** Requires a running app with card data in the deactivated library deck

---

_Verified: 2026-06-12T16:00:00Z_
_Verifier: Claude (gsd-verifier)_
