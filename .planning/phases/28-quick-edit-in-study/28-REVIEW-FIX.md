---
phase: 28-quick-edit-in-study
fixed_at: 2026-07-02T08:58:53Z
review_path: .planning/phases/28-quick-edit-in-study/28-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 28: Code Review Fix Report

**Fixed at:** 2026-07-02T08:58:53Z
**Source review:** .planning/phases/28-quick-edit-in-study/28-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (2 critical, 2 warning)
- Fixed: 4
- Skipped: 0

## Fixed Issues

### CR-02: `GET /api/study/deck/:deckId` grants view access on a revoked share

**Files modified:** `apps/backend/src/routes/study.ts`
**Commit:** 6c17f83
**Applied fix:** The access gate now rejects with 403 when the caller's `DeckShare` row exists
but `isActive` is `false`, not just when the row is missing (`if (!share || !share.isActive)`).
This matches the already-correct `/due` endpoint's behavior and prevents a revoked share from
downgrading to permanent view-only access instead of losing access entirely. Scoped to `study.ts`
only per the review's own scoping guidance — `cards.ts`'s `getDeckAccess` gap was noted as related
but out of this phase's file list, and left untouched.

### CR-01: Quick-edit dialog can open with focus landing nowhere (real-browser a11y regression)

**Files modified:** `apps/frontend/src/components/CardEditorModal.tsx`
**Commit:** 1f7fcd4
**Applied fix:** `onOpenAutoFocus` still prevents Radix's default (synchronous) focus-in behavior
when `skipOpenAutoFocus` is set (needed to avoid the JSDOM `DropdownMenu`+`Dialog` FocusScope race),
but now defers focus into the dialog by one animation frame via a new `contentRef` on `DialogContent`
(`requestAnimationFrame(() => contentRef.current?.focus())`) instead of dropping focus management
entirely. This lets the closing `DropdownMenu`'s FocusScope settle first while still moving focus
into the dialog for keyboard/screen-reader users. Verified against
`apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx` — all 24 tests pass, including
SEDIT-02 (the test that previously crashed the JSDOM worker before this phase's original fix).

### WR-01: `study-canedit.test.ts` has zero executing tests for new security-relevant logic

**Files modified:** `apps/backend/src/routes/__tests__/study-canedit.test.ts`
**Commit:** 71a5eed
**Applied fix:** Replaced all six `it.todo(...)` stubs with real mocked-Prisma tests, following the
`vi.mock('../../lib/prisma.js', ...)` + Hono test-app pattern established in
`library-remove.test.ts` (the only file in this test directory with genuinely executing
route-level permission assertions — `sharing.test.ts` and `study-rate-reviewlog.test.ts`,
also referenced by the original stub comment, turned out to be `it.todo`-only themselves).
Tests 1-5 cover the `GET /api/study/due` canEdit boolean expression across owner / EDIT share /
MANAGE share / READ share / no-access cases. Test 6 was adapted to the post-CR-02 behavior: since
CR-02 (fixed earlier in this same pass) now rejects revoked shares with 403 before `canEdit` is
even computed, Test 6 now asserts `GET /api/study/deck/:deckId` returns 403 (not a 200 with
`canEdit=false`) when the caller's EDIT share has `isActive=false` — this is the corrected
behavior, not the original pre-fix framing implied by the stub's title.

### WR-02: `onSuccess={() => {}}` no-op prop obscures intent

**Files modified:** `apps/frontend/src/pages/StudySessionPage.tsx`
**Commit:** 2558818
**Applied fix:** Added a one-line comment above the no-op call site explaining that
`onCardUpdated` handles the in-place update and no full list refetch is needed in a study session.

## Skipped Issues

None — all findings were fixed.

---

_Fixed: 2026-07-02T08:58:53Z_
_Fixer: Claude (orchestrator, applied inline — gsd-code-fixer agent type was unavailable in this
session; see conversation for detail)_
_Iteration: 1_
