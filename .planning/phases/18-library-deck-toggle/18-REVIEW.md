---
phase: 18-library-deck-toggle
reviewed: 2026-06-12T16:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - apps/backend/prisma/schema.prisma
  - apps/backend/prisma/migrations/20260612000000_add_deckshare_isactive/migration.sql
  - packages/shared/src/schemas/deck.ts
  - apps/backend/src/routes/decks.ts
  - apps/backend/src/routes/study.ts
  - apps/frontend/src/pages/DecksPage.tsx
  - apps/frontend/src/pages/__tests__/DecksPage.test.tsx
  - apps/backend/src/routes/__tests__/library-toggle.test.ts
findings:
  critical: 2
  warning: 3
  info: 2
  total: 7
status: issues_found
---

# Phase 18: Code Review Report

**Reviewed:** 2026-06-12T16:00:00Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Phase 18 adds `DeckShare.isActive` as a per-user active flag for library (shared) decks, fixes `GET /api/decks` to return the recipient's own `isActive` value instead of the deck owner's, adds `PATCH /api/decks/:id/library` for toggling that flag, fixes `GET /api/study/due` to respect the new flag, and wires a Switch control into the library deck card on DecksPage.

The schema, migration, shared schema export, and the new PATCH endpoint are implemented correctly. The `GET /api/decks` list fix and the `GET /api/study/due` filter fix are both correct. The frontend handler implements optimistic update + rollback as specified. The AuthContext mock fix in the test file is correct.

Two critical gaps remain: the same `Deck.isActive` vs `DeckShare.isActive` confusion that was fixed in the list endpoint is still present in `GET /api/decks/:id` (single-deck view), and `POST /api/study/rate` does not check `DeckShare.isActive`, allowing a recipient to record study progress on a deck they have deactivated.

---

## Critical Findings

### CR-01: `GET /api/decks/:id` returns `Deck.isActive` instead of `DeckShare.isActive` for share recipients

**File:** `apps/backend/src/routes/decks.ts:101`

**Issue:** `GET /api/decks/:id` spreads the `deck` object directly when returning to a share recipient:
```ts
return c.json({ ...deck, userPermission: share.permission }, 200)
```
This spreads `deck.isActive` — the owner's activation state — rather than `share.isActive` — the recipient's per-user state. This is the identical bug that was fixed in `GET /api/decks` (list) by the `isActive: r.isActive` override at line 60. Any frontend page that uses `GET /api/decks/:id` to display or act on a library deck's `isActive` field (e.g., DeckDetailPage) will show the wrong value.

**Fix:**
```ts
// GET /api/decks/:id — include share.isActive for recipients
const share = await prisma.deckShare.findUnique({
  where: { deckId_sharedWithUserId: { deckId: id, sharedWithUserId: userId } },
})
if (!share) return c.json({ error: 'Forbidden.' }, 403)
return c.json({ ...deck, isActive: share.isActive, userPermission: share.permission }, 200)
```

---

### CR-02: `POST /api/study/rate` does not check `DeckShare.isActive` for shared decks

**File:** `apps/backend/src/routes/study.ts:158-166`

**Issue:** The rate endpoint checks `Deck.isActive` (line 159) but does not check `DeckShare.isActive` for share recipients. A user can deactivate a library deck (setting `DeckShare.isActive = false`, excluding it from the study queue) and then still call `POST /api/study/rate` with a `cardId` from that deck — the endpoint finds the share row (line 162-165) and proceeds to record study progress without checking whether the recipient's share is active. This creates a semantic inconsistency: the `isActive` flag controls whether cards appear in the queue but not whether rating those cards is permitted.

**Fix:**
```ts
if (card.deck.ownerId !== userId) {
  const share = await prisma.deckShare.findUnique({
    where: { deckId_sharedWithUserId: { deckId: card.deckId, sharedWithUserId: userId } },
  })
  if (!share) return c.json({ error: 'Forbidden.' }, 403)
  // D-03: respect recipient's per-user isActive state on the rate path
  if (!share.isActive) return c.json({ error: 'Forbidden.' }, 403)
}
```

---

## Warnings

### WR-01: `GET /api/study/deck/:deckId` does not check `DeckShare.isActive` for share recipients

**File:** `apps/backend/src/routes/study.ts:105-110`

**Issue:** The deck-mode study endpoint (`GET /api/study/deck/:deckId`) checks only that a `DeckShare` row exists — it does not check `share.isActive`. A recipient who has deactivated a library deck can still load all its cards via this endpoint (used by Deck Mode and Exam Mode). Phase 18 establishes the semantic that `DeckShare.isActive = false` means "exclude from my study flow", but this endpoint bypasses that intent. Consistent with the fix pattern applied to `GET /api/study/due`.

**Fix:**
```ts
if (deck.ownerId !== userId) {
  const share = await prisma.deckShare.findUnique({
    where: { deckId_sharedWithUserId: { deckId, sharedWithUserId: userId } },
  })
  if (!share) return c.json({ error: 'Forbidden.' }, 403)
  // Respect DeckShare.isActive — inactive library decks are excluded from study
  if (!share.isActive) return c.json({ error: 'Forbidden.' }, 403)
}
```

---

### WR-02: Backend PATCH tests are all `it.todo` — zero coverage on the security-critical 403 paths

**File:** `apps/backend/src/routes/__tests__/library-toggle.test.ts:9-13`

**Issue:** All seven backend test cases in `library-toggle.test.ts` are `it.todo` stubs. The plan intended these as deferred integration tests, but the PATCH endpoint is now live with no automated verification of its authorization logic. In particular, the "returns 403 when called by the deck owner" and "returns 403 when no DeckShare row exists" cases test the primary security gate of the new endpoint (T-18-03 mitigation). If that logic regresses, no test will catch it.

**Fix:** Implement at minimum the two 403 cases using a mocked `prisma` client (matching the pattern in other backend test files). The `it.todo` for the 200-path cases can remain deferred, but the 403 authorization paths should be promoted to active tests.

---

### WR-03: Stale and misleading factory comment in `DecksPage.test.tsx`

**File:** `apps/frontend/src/pages/__tests__/DecksPage.test.tsx:47-48`

**Issue:** Lines 47-48 read:
```ts
// isActive is not yet on DeckListItem schema (Plan 02 adds it), so we cast to any.
// Tests assert against the rendered switch state which Plan 03 will implement.
```
Both claims are false: `DeckListItem` has had `isActive: boolean` since `DeckSchema` (`z.boolean().default(true)`, package `deck.ts` line 23) which predates phase 18. There is no Plan 03 in scope. The `as unknown as DeckListItem & { isActive: boolean }` intersection is redundant — `isActive` is already on `DeckListItem`. This comment will mislead future maintainers into thinking the type is incomplete.

**Fix:** Replace the comment with:
```ts
// DeckListItem includes isActive (from DeckSchema). The `as unknown` cast is required
// because DeckListItemSchema.isActive has .default(true) which widens the input type.
```
And simplify the cast to `as DeckListItem`.

---

## Info

### IN-01: `& { isActive: boolean }` intersection in test factories is redundant

**File:** `apps/frontend/src/pages/__tests__/DecksPage.test.tsx:61`, `apps/frontend/src/pages/__tests__/DecksPage.test.tsx:77`

**Issue:** Both `makeDeck` and `makeLibraryDeck` return:
```ts
} as unknown as import('@kartex/shared').DeckListItem & { isActive: boolean }
```
`DeckListItem` already includes `isActive: boolean` (via `DeckSchema`). The `& { isActive: boolean }` intersection adds no type information. The `as unknown` cast is the actual work here; the intersection is noise.

**Fix:** Use `as unknown as import('@kartex/shared').DeckListItem` in both factories.

---

### IN-02: `PATCH /:id/library` validates body before checking share existence — minor information leak

**File:** `apps/backend/src/routes/decks.ts:304-307`

**Issue:** The endpoint validates the request body with `UpdateLibrarySchema.safeParse` and returns 400 on failure before checking whether the caller has a `DeckShare` row. This means an unauthenticated or non-recipient caller who sends a malformed body (e.g., `{}`) receives 400 rather than 403. The response code reveals that the endpoint exists and rejects malformed input. An owner calling this endpoint with a valid body receives 403; with an invalid body, receives 400. This is a minor information asymmetry.

The current ordering is consistent with the plan spec and does simplify the handler. Reordering (share lookup before body parse) would remove the leak but is a judgment call. No action required unless the security model requires opaque responses for non-recipients.

---

## Verdict

**Ship-blocking:** Yes — CR-01 and CR-02 must be fixed before this feature can be considered complete.

CR-01 leaves `DeckDetailPage` showing incorrect `isActive` state for library decks whenever that page fetches a deck by ID. CR-02 creates a semantic inconsistency where deactivating a library deck stops it from appearing in the study queue but does not prevent the user from recording progress against its cards directly.

WR-01 extends the same incomplete fix to the deck-mode study path and should be addressed in the same pass as CR-02. WR-02 (no active backend tests for the 403 authorization paths) represents real regression risk for the security gate introduced by this feature.

---

_Reviewed: 2026-06-12T16:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
