---
phase: 10-active-deck-rotation
reviewed: 2026-06-02T13:07:58Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - apps/backend/src/routes/study.ts
  - apps/frontend/src/pages/DecksPage.tsx
  - apps/frontend/src/pages/DeckDetailPage.tsx
  - apps/frontend/src/pages/StudySessionPage.tsx
  - apps/frontend/src/pages/__tests__/DecksPage.test.tsx
  - apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx
  - packages/shared/src/schemas/deck.ts
  - apps/backend/prisma/schema.prisma
  - apps/frontend/src/components/ui/switch.tsx
  - apps/frontend/src/components/ui/checkbox.tsx
  - apps/frontend/src/locales/en.json
  - apps/frontend/src/locales/de.json
findings:
  critical: 2
  warning: 3
  info: 2
  total: 7
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-06-02T13:07:58Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

This phase implements active deck rotation: an `isActive` toggle on decks, a global SR start screen with a deck picker, and session-size/tag-filter controls. The backend (`study.ts`) and schema changes are mostly solid. The shared types, locale files, and UI primitives are clean. Two correctness bugs were found — one a data-loss risk (card delete fires without confirmation), one a broken language-switch experience in the new `GlobalSRStartScreen` component. Three warnings cover an authorization gap for shared-deck `isActive` filtering, a dead code branch in the backend, and a missing `t` dependency in a `useEffect`. Two info items address code duplication and a stale test comment.

---

## Critical Issues

### CR-01: Card delete fires immediately without confirmation in `CardActionCell`

**File:** `apps/frontend/src/pages/DeckDetailPage.tsx:114`

**Issue:** In `CardActionCell`, the "Delete" button rendered in the *unconfirmed* state (when `confirmDeleteCardId !== card.id`) calls `onDelete(card.id)` directly (line 114). `onDelete` is wired to `handleDeleteCard` which makes a `DELETE /api/decks/:deckId/cards/:cardId` request immediately. The two-step confirmation pattern is completely bypassed — any accidental click on "Delete" destroys the card without warning.

The intended flow is: first click → set `confirmDeleteCardId`, show "Are you sure?" / "Yes, delete" / "Cancel". The unconfirmed Delete button should call `setConfirmDeleteCardId(card.id)`, not `onDelete`. The `onDelete` callback should only be called from the *confirmed* button (line 107), which is already correctly wired.

**Fix:**
```tsx
// CardActionCell — non-confirmed state (line 111-116)
// Change the onDelete prop to accept a separate onRequestDelete callback,
// OR accept setConfirmDeleteId from the parent.
// Simplest fix: add an onRequestDelete prop that maps to setConfirmDeleteCardId.

type CardActionCellProps = {
  card: Card
  confirmDeleteCardId: string | null
  onEdit: (c: Card) => void
  onRequestDelete: (id: string) => void  // ← sets confirmDeleteCardId
  onDelete: (id: string) => void         // ← fires the actual API call
  onCancelDelete: () => void
}

// In the unconfirmed branch:
<Button size="sm" variant="destructive" onClick={() => onRequestDelete(card.id)}>
  {t('common.delete')}
</Button>

// At the call site (line 425-431):
<CardActionCell
  card={card}
  confirmDeleteCardId={confirmDeleteCardId}
  onEdit={openEditCard}
  onRequestDelete={(id) => setConfirmDeleteCardId(id)}
  onDelete={(id) => void handleDeleteCard(id)}
  onCancelDelete={() => setConfirmDeleteCardId(null)}
/>
```

---

### CR-02: `GlobalSRStartScreen` bypasses i18n language subscription — stale strings on language switch

**File:** `apps/frontend/src/pages/StudySessionPage.tsx:229`

**Issue:** `GlobalSRStartScreen` receives `t` as a plain prop (`t: (key: string, opts?: Record<string, unknown>) => string`) rather than calling `useTranslation()` internally. React i18next registers a language-change listener per component via `useTranslation`. Because `GlobalSRStartScreen` never calls `useTranslation`, it has no such listener and will not re-render when the user switches languages. All strings rendered inside `GlobalSRStartScreen` (section headers, button labels, the "no active decks" message) remain frozen in the language that was active when the parent first rendered, until an unrelated re-render of `StudySessionPage` triggers a prop update.

**Fix:**
```tsx
// Remove t from the props interface of GlobalSRStartScreen
// and add useTranslation() inside the component:

function GlobalSRStartScreen({
  activeDecks,
  selectedDeckIds,
  sessionSize,
  customCount,
  sizeOptions,
  onToggleDeck,
  onSetSessionSize,
  onSetCustomCount,
  onStartSession,
  onNavigateBack,
}: Omit<GlobalSRStartScreenProps, 't'>) {
  const { t } = useTranslation()  // ← subscribe to language changes
  // ... rest unchanged
}

// Remove t={t} from the JSX call site in StudySessionPage (~line 687)
```

---

## Warnings

### WR-01: Shared decks bypass `isActive` check in `GET /api/study/due`

**File:** `apps/backend/src/routes/study.ts:23-28`

**Issue:** The `deckFilter` used in the `/due` endpoint applies `isActive: true` only to decks owned by the requesting user. Shared decks (the `{ id: { in: sharedDeckIds } }` branch) have no `isActive` constraint. If a shared deck's owner deactivates their deck, that deck's cards will still appear in the recipient's due queue. This is an asymmetric behavior that contradicts the feature's intent: `isActive = false` means "remove from study queue."

Whether this is a design choice or an oversight depends on the spec. If shared-deck recipients should respect the original deck's active state, add the filter:

**Fix:**
```ts
const deckFilter = {
  OR: [
    { ownerId: userId, isActive: true },
    { id: { in: sharedDeckIds }, isActive: true },  // ← add isActive: true
  ],
}
```

---

### WR-02: `useEffect` for `document.title` missing `t` function in dependency array

**File:** `apps/frontend/src/pages/StudySessionPage.tsx:368-370`

**Issue:** The title effect reads:
```ts
useEffect(() => {
  document.title = t('study.title')
}, [t, i18n.language])
```
Including both `t` and `i18n.language` is redundant but harmless. However the pattern is inconsistent with other pages (`DecksPage`, `DeckDetailPage`) which also include both. This is not itself a bug — but in `StudySessionPage`, the title is only set once with a static key, so if `t` is stable (which it is in react-i18next v13+), `i18n.language` alone would suffice. This is fine as-is but worth noting for consistency.

**More important:** in the global prefetch `useEffect` (lines 403-427) and the deck-specific prefetch `useEffect` (lines 373-400), errors are swallowed with `console.error` and no user-visible feedback. If prefetch fails, the user sees empty deck picker or zero card counts with no explanation.

**Fix:**
```ts
// In the global prefetch effect (line 423):
} catch (err) {
  console.error('[StudySessionPage] global prefetch failed:', err)
  toast.error(t('study.couldNotLoad'))  // ← add user feedback
}
```

---

### WR-03: Redundant client-side filter in `GET /api/study/due` — dead code branch

**File:** `apps/backend/src/routes/study.ts:71-72`

**Issue:** The `neverSeen` query already uses `progress: { none: { userId } }`, which means every card in `neverSeen` has zero progress rows for this user. `cardIdsWithProgress` contains IDs from `dueWithProgress`, which contains only cards that *have* a progress row. The two sets are mutually exclusive by database constraint — no card from `neverSeen` can ever appear in `cardIdsWithProgress`. The `.filter(card => !cardIdsWithProgress.includes(card.id))` on line 72 is a no-op that will never remove any element.

This creates false confidence that a deduplication step is running. If the Prisma query semantics were ever changed, this guard would silently stop working.

**Fix:**
```ts
// Remove the filter — neverSeen is already disjoint from dueWithProgress by query
const newCards = neverSeen.map((card: (typeof neverSeen)[number]) => ({
  id: card.id,
  deckId: card.deckId,
  deckTitle: card.deck.title,
  frontContent: card.frontContent,
  backContent: card.backContent,
  tags: card.tags,
  easeFactor: 2.5,
  interval: 1,
  repetitions: 0,
  nextReview: undefined as string | undefined,
}))
```
If the intent is defensive deduplication, document it explicitly and add a comment explaining why both are needed.

---

## Info

### IN-01: `VisibilityBadge` component duplicated across `DecksPage` and `DeckDetailPage`

**File:** `apps/frontend/src/pages/DecksPage.tsx:20-41` and `apps/frontend/src/pages/DeckDetailPage.tsx:30-51`

**Issue:** The `VisibilityBadge` component is defined identically in both files (20 lines each, exact same logic and className strings). Any future change to badge styling or visibility logic must be made in two places. The same applies to the `PermissionBadge` component, which exists only in `DeckDetailPage` today but is a similar pattern.

**Fix:** Extract `VisibilityBadge` (and `PermissionBadge`) to `apps/frontend/src/components/VisibilityBadge.tsx` and import from both pages.

---

### IN-02: Stale test comment references old plan numbering

**File:** `apps/frontend/src/pages/__tests__/DecksPage.test.tsx:39`

**Issue:** Line 39 reads:
```ts
// isActive is not yet on DeckListItem schema (Plan 02 adds it), so we cast to any.
// Tests assert against the rendered switch state which Plan 03 will implement.
```
`isActive` is present in `DeckListItemSchema` in `packages/shared/src/schemas/deck.ts` (line 20) and the switch is implemented in `DecksPage.tsx`. This comment is stale planning scaffolding that should be removed to avoid confusion about the current schema state.

**Fix:** Remove lines 39-41 of `DecksPage.test.tsx` and update the factory return type to use the real `DeckListItem` type instead of `as unknown as DeckListItem & { isActive: boolean }`.

---

_Reviewed: 2026-06-02T13:07:58Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
