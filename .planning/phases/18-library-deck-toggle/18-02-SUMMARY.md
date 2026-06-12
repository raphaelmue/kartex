---
phase: 18-library-deck-toggle
plan: "02"
subsystem: frontend
tags: [react, switch, optimistic-update, test, library-toggle]
dependency_graph:
  requires: [18-01]
  provides: [handleToggleLibraryActive, library-Switch-CardFooter, LIB-01-frontend-tests, library-toggle-backend-stubs]
  affects:
    - apps/frontend/src/pages/DecksPage.tsx
    - apps/frontend/src/pages/__tests__/DecksPage.test.tsx
    - apps/backend/src/routes/__tests__/library-toggle.test.ts
tech_stack:
  added: []
  patterns: [optimistic-update-with-revert, Switch-onCheckedChange, AuthContext-mock-in-test]
key_files:
  created:
    - apps/backend/src/routes/__tests__/library-toggle.test.ts
  modified:
    - apps/frontend/src/pages/DecksPage.tsx
    - apps/frontend/src/pages/__tests__/DecksPage.test.tsx
decisions:
  - "Library Switch uses id=active-lib-{id} prefix (not active-{id}) — prevents DOM id collision with owned-deck Switch when same deckId could theoretically appear in both branches (T-18-07)"
  - "AuthContext mock user includes studyMode field — required to match the User interface shape (User.studyMode: StudyMode); DeckDetailPage tests confirmed this pattern"
  - "handleToggleLibraryActive mirrors handleToggleActive exactly except URL — same optimistic-update-then-revert pattern, only /library suffix differs"
metrics:
  duration: "4 min"
  completed: "2026-06-12T13:44:00Z"
  tasks_completed: 2
  files_modified: 3
---

# Phase 18 Plan 02: Library Deck Toggle Frontend Summary

Library deck active toggle on DecksPage: handleToggleLibraryActive handler targeting PATCH /api/decks/:id/library, Switch in library CardFooter, and complete LIB-01 test coverage including AuthContext mock fix.

## What Was Built

### handleToggleLibraryActive (DecksPage.tsx)

Added after `handleToggleActive` (line 118). Identical structure: optimistic setDecks update, api.patch to `/api/decks/${deckId}/library`, toast.success on success, revert + toast.error on failure. Differs from handleToggleActive only in the URL — `/library` suffix targets the DeckShare.isActive field.

### Library CardFooter Switch

In the `deck.ownerId !== user?.id` branch (library decks), added a Switch block before the Study button. Switch uses `id="active-lib-{deck.id}"` to avoid id collision with owned-deck Switch (`id="active-{deck.id}"`). onCheckedChange calls `void handleToggleLibraryActive(deck.id, checked)`. The `opacity-60` wrapper at line 145 already uses `deck.isActive` and works automatically once DeckShare.isActive is returned by the backend (Plan 18-01).

### DecksPage.test.tsx updates

Three additions:
1. AuthContext mock (`vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1', ... } }) }))`) — fixes pre-existing DECK-01a-d failures caused by "useAuth must be used within an AuthProvider"
2. `makeLibraryDeck` factory with `ownerId: 'other-user'` — triggers the library branch rendering
3. `describe('DecksPage library deck toggle (LIB-01)')` with 4 passing tests: LIB-01a (checked), LIB-01b (unchecked), LIB-01c (PATCH /library called), LIB-01d (revert on failure)

### library-toggle.test.ts (backend stubs)

Created `apps/backend/src/routes/__tests__/library-toggle.test.ts` with two describe blocks and 7 `it.todo` stubs matching the PATCH endpoint behaviors from Plan 18-01.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add handleToggleLibraryActive + library Switch to DecksPage | 8cdba0e | DecksPage.tsx |
| 2 | Expand DecksPage.test.tsx for library toggle + backend stubs | faed305 | DecksPage.test.tsx, library-toggle.test.ts |

## Deviations from Plan

None — plan executed exactly as written. The AuthContext mock user shape required a `studyMode` field (User interface includes `studyMode: StudyMode`) which was added automatically; this does not affect test behavior.

## Threat Mitigations Applied

| Threat | Mitigation |
|--------|-----------|
| T-18-07 Switch id collision | Library Switch uses `id="active-lib-{id}"`, owned-deck uses `id="active-{id}"` — distinct prefixes prevent label-for mismatch |

## Self-Check: PASSED

| Item | Status |
|------|--------|
| apps/frontend/src/pages/DecksPage.tsx | FOUND |
| apps/frontend/src/pages/__tests__/DecksPage.test.tsx | FOUND |
| apps/backend/src/routes/__tests__/library-toggle.test.ts | FOUND |
| handleToggleLibraryActive in DecksPage.tsx | FOUND |
| active-lib- Switch id in DecksPage.tsx | FOUND |
| LIB-01 describe block in DecksPage.test.tsx | FOUND |
| Commit 8cdba0e | FOUND |
| Commit faed305 | FOUND |
| Frontend tests: 108 passed | PASSED |
| Backend tests: 18 passed, 45 todo | PASSED |
