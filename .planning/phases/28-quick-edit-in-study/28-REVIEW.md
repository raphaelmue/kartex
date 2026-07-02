---
phase: 28-quick-edit-in-study
reviewed: 2026-07-02T08:45:27Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - apps/backend/src/routes/__tests__/study-canedit.test.ts
  - apps/backend/src/routes/study.ts
  - apps/frontend/src/components/__tests__/CardFlip.test.tsx
  - apps/frontend/src/components/CardEditorModal.tsx
  - apps/frontend/src/components/StudyCardMenu.tsx
  - apps/frontend/src/locales/de.json
  - apps/frontend/src/locales/en.json
  - apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx
  - apps/frontend/src/pages/StudySessionPage.tsx
  - packages/shared/src/schemas/study.ts
findings:
  critical: 2
  warning: 2
  info: 0
  total: 4
status: issues_found
---

# Phase 28: Code Review Report

**Reviewed:** 2026-07-02T08:45:27Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Phase 28 adds a quick-edit affordance to the study session (`StudyCardMenu` + `CardEditorModal`
reuse) and computes a new `canEdit` flag server-side in `GET /api/study/due` and
`GET /api/study/deck/:deckId`. The `canEdit` computation itself is correct: it requires ownership
or an *active* EDIT/MANAGE share in both endpoints, and the `/due` endpoint's `editableSharedDeckIds`
set is built only from rows already filtered by `isActive: true`, so it can't leak edit rights from
a revoked share.

Two problems were found that should be fixed before shipping:

1. The double `preventDefault()` workaround for the JSDOM-only Radix FocusScope race
   (`CardEditorModal`'s `skipOpenAutoFocus` + `StudyCardMenu`'s `onCloseAutoFocus`) removes *all*
   focus management from the open path, not just the racing part — in real browsers, opening the
   quick-edit dialog via keyboard/screen reader leaves focus nowhere, which is exactly the
   regression flagged as a risk for this fix.
2. `GET /api/study/deck/:deckId`'s access gate only checks that a `DeckShare` row exists, never
   that it is active — a user whose share has been revoked (`isActive: false`) can continue to
   view (not edit) every card in that deck indefinitely. This asymmetric with `/due`, which does
   correctly restrict to active shares.

Additionally, the dedicated backend test file for this phase's core security-relevant logic
(`study-canedit.test.ts`) contains only `it.todo(...)` stubs — none of the six documented
scenarios actually execute, so the canEdit permission matrix has zero automated coverage despite
being the piece explicitly called out as new security-relevant surface.

## Critical Issues

### CR-01: Quick-edit dialog can open with focus landing nowhere (real-browser a11y regression)

**File:** `apps/frontend/src/components/CardEditorModal.tsx:122-125`, `apps/frontend/src/components/StudyCardMenu.tsx:30-40`

**Issue:** The fix for the JSDOM-only Radix `DropdownMenu` + `Dialog` FocusScope race disables
focus management on *both* sides of the transition:

- `StudyCardMenu`'s `DropdownMenuContent` calls `event.preventDefault()` in `onCloseAutoFocus`, so
  Radix never returns focus to the trigger button when the menu closes.
- `CardEditorModal`'s `DialogContent` calls `event.preventDefault()` in `onOpenAutoFocus` whenever
  `skipOpenAutoFocus` is true (which is exactly the case for this call site — the only place that
  passes `skipOpenAutoFocus`), so Radix never moves focus into the dialog either.

The selected `DropdownMenuItem` unmounts when the menu closes. With both auto-focus behaviors
suppressed, focus has nowhere to go and the browser falls back to `document.body`. For a
keyboard or screen-reader user who opens "Edit this card" via the keyboard, the modal opens but:
- No element inside the dialog is focused, so screen readers do not announce the dialog and its
  content.
- `Tab` from `document.body` does not reliably land inside the (focus-trapped) dialog — Radix's
  `FocusScope` guards focus *leaving* the boundary, but does not proactively pull focus in if it
  was never inside to begin with.

This is precisely the "focus never lands in the dialog at all" regression that needed to be ruled
out before shipping; both `preventDefault()` calls should not have been combined without a manual
fallback.

**Fix:** Keep the `onCloseAutoFocus` prevention (needed to avoid the race), but stop suppressing
`onOpenAutoFocus` unconditionally — either let the Dialog use its default focus behavior, or if
the race genuinely requires deferring it, manually move focus into the dialog on the next tick
instead of dropping it entirely:

```tsx
// CardEditorModal.tsx
<DialogContent
  className="max-w-2xl"
  onOpenAutoFocus={(event) => {
    if (!skipOpenAutoFocus) return
    event.preventDefault()
    // Manually move focus in once the closing DropdownMenu's FocusScope has settled,
    // instead of dropping focus management entirely.
    requestAnimationFrame(() => {
      contentRef.current?.focus()
    })
  }}
  ref={contentRef}
>
```

(or equivalent — the key requirement is that *some* element inside the dialog receives focus
when it opens via this path, in real browsers as well as in JSDOM.)

### CR-02: `GET /api/study/deck/:deckId` grants view access on a revoked share

**File:** `apps/backend/src/routes/study.ts:112-119`

**Issue:**

```ts
if (deck.ownerId !== userId) {
  share = await prisma.deckShare.findUnique({
    where: { deckId_sharedWithUserId: { deckId, sharedWithUserId: userId } },
    select: { permission: true, isActive: true },
  })
  if (!share) return c.json({ error: 'Forbidden.' }, 403)
}
```

This gate only checks that a `DeckShare` row exists — it never checks `share.isActive`. Once a
deck owner revokes a user's access by setting `isActive: false` on the share (rather than
deleting the row), the revoked user can still call `GET /api/study/deck/:deckId` and receive the
full card list (front/back content, tags) for every card in that deck, indefinitely. Only the new
`canEdit` computed a few lines below correctly checks `share?.isActive === true` — the surrounding
*view* gate does not, so a revoked user is downgraded from editor to (permanent) viewer instead of
losing access entirely, which contradicts the intent of revoking a share.

This is asymmetric with `GET /api/study/due`, which filters shares by `isActive: true` before
building `deckFilter`, so revoked shares are correctly excluded there. (Note: `getDeckAccess` in
`apps/backend/src/routes/cards.ts` has the same gap — not in this phase's file list, but worth
fixing in the same pass since it's the helper this phase's own test file cites as the source of
truth for the permission rule.)

**Fix:**

```ts
if (deck.ownerId !== userId) {
  share = await prisma.deckShare.findUnique({
    where: { deckId_sharedWithUserId: { deckId, sharedWithUserId: userId } },
    select: { permission: true, isActive: true },
  })
  if (!share || !share.isActive) return c.json({ error: 'Forbidden.' }, 403)
}
```

## Warnings

### WR-01: `study-canedit.test.ts` has zero executing tests for new security-relevant logic

**File:** `apps/backend/src/routes/__tests__/study-canedit.test.ts:9-33`

**Issue:** All six documented scenarios (owner, active EDIT share, active MANAGE share,
READ-only share, no access, and the isActive=false Pitfall-5 case) are declared with `it.todo(...)`
only. None of them execute an assertion. This is the file explicitly introduced by this phase to
document the behavioral contract for the new `canEdit` permission surface — the exact area flagged
as new security-relevant code — yet it provides no automated regression protection at all. A future
refactor of `/due` or `/deck/:deckId` could silently reintroduce the exact permission bugs this
phase fixed (e.g. CR-02 above) without any test failing.

**Fix:** Implement at least the six described cases with mocked Prisma calls (the file's own
comment points at `sharing.test.ts` / `study-rate-reviewlog.test.ts` as the established
mock-based pattern in this codebase to follow). At minimum, promote this from "future test-harness
task" to a blocking follow-up before the phase is considered done, since it is documented as
covering the phase's core security-relevant contract.

### WR-02: `onSuccess={() => {}}` no-op prop obscures intent

**File:** `apps/frontend/src/pages/StudySessionPage.tsx:191`

**Issue:** `CardEditorModal` is given `onSuccess={() => {}}` for the quick-edit call site, with
`onCardUpdated` doing the real work of applying the update. `onSuccess` is a required prop on
`CardEditorModalProps`, so this is not itself a bug, but a silent no-op callback reads as
accidental (e.g. a forgotten toast/refresh) rather than deliberate to the next reader, and there's
no comment explaining why `onSuccess` is intentionally unused here while `onCardUpdated` is used
instead.

**Fix:** Add a one-line comment (e.g. `// onSuccess unused here — onCardUpdated below handles the
in-place update; no full list refetch is needed in a study session`) or make `onSuccess` optional
on `CardEditorModalProps` so call sites that don't need it can omit it entirely.

---

_Reviewed: 2026-07-02T08:45:27Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
