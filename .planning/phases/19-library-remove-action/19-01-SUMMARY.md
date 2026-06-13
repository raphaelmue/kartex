---
phase: 19-library-remove-action
plan: "01"
subsystem: library-remove
tags: [library, decks, i18n, backend-route, tdd]
dependency_graph:
  requires: []
  provides: [DELETE /api/decks/:id/library, library-remove-UI]
  affects: [DecksPage, decks.ts, en.json, de.json]
tech_stack:
  added: []
  patterns: [Radix-DropdownMenu-JSDOM-pointerDown, optimistic-removal, AlertDialog-removeTargetId]
key_files:
  created:
    - apps/backend/src/routes/__tests__/library-remove.test.ts
  modified:
    - apps/backend/src/routes/decks.ts
    - apps/frontend/src/locales/en.json
    - apps/frontend/src/locales/de.json
    - apps/frontend/src/pages/DecksPage.tsx
    - apps/frontend/src/pages/__tests__/DecksPage.test.tsx
decisions:
  - "Use fireEvent.pointerDown before fireEvent.click to open Radix DropdownMenu in JSDOM (new decision)"
metrics:
  duration: "~7 min"
  completed: "2026-06-13T11:21:00Z"
  tasks_completed: 3
  files_modified: 6
---

# Phase 19 Plan 01: Library Remove Action Summary

**One-liner:** DELETE /api/decks/:id/library route with IDOR guard, 5 i18n keys in both locales, and library deck ⋮ menu with confirmation AlertDialog in DecksPage.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add DELETE /api/decks/:id/library backend route with ownership check | 7a8d7c4 | apps/backend/src/routes/decks.ts, apps/backend/src/routes/__tests__/library-remove.test.ts |
| 2 | Add 5 removeFromLibrary i18n keys to en.json and de.json | d7361bc | apps/frontend/src/locales/en.json, apps/frontend/src/locales/de.json |
| 3 (RED) | Add failing tests for library deck remove UI | 9f4c716 | apps/frontend/src/pages/__tests__/DecksPage.test.tsx |
| 3 (GREEN) | Wire library-card remove UI in DecksPage | 8b14b1e | apps/frontend/src/pages/DecksPage.tsx, apps/frontend/src/pages/__tests__/DecksPage.test.tsx |

## What Was Built

### Backend (Task 1)

`DELETE /api/decks/:id/library` appended to `decks.ts` after the existing `PATCH /:id/library` handler:

- Extracts `id` from `c.req.param()` and `userId` from `c.get('userId')` (JWT middleware)
- `prisma.deckShare.findUnique` on compound unique `{ deckId_sharedWithUserId: { deckId, sharedWithUserId } }`
- Returns 403 if no share exists (IDOR guard — T-19-01, T-19-02)
- `prisma.deckShare.delete` with same compound unique key
- Returns `c.body(null, 204)` on success
- Zero references to `cardProgress` (D-09 verified)

Behavior-stub test file `library-remove.test.ts` created with 4 `it.todo` stubs (all pending, suite green).

### i18n (Task 2)

5 new keys added to `decks` object in both locale files atomically:

| Key | en value | de value |
|-----|---------|---------|
| `removeFromLibrary` | "Remove from library" | "Aus der Bibliothek entfernen" |
| `removeFromLibraryTitle` | "Remove from library?" | "Aus der Bibliothek entfernen?" |
| `removeFromLibraryBody` | "Your study progress for this deck will be preserved. You can re-add it from Explore at any time." | "Ihr Lernfortschritt für dieses Deck bleibt erhalten. Sie können es jederzeit über Entdecken erneut hinzufügen." |
| `removeFromLibraryConfirm` | "Remove Deck" | "Deck entfernen" |
| `removedFromLibraryToast` | "Deck removed from your library" | "Deck aus Ihrer Bibliothek entfernt" |

### Frontend (Task 3 — TDD)

`DecksPage.tsx` extended with:

- `removeTargetId: string | null` state (mirrors `deleteTargetId` Phase 17 pattern)
- `handleRemoveFromLibrary(id: string)` — calls `api.delete('/api/decks/${id}/library')`, fires `toast.success`, optimistically removes deck, resets state
- Library card footer (`ownerId !== user?.id` branch) now includes a `DropdownMenu` with a single destructive `DropdownMenuItem` that sets `removeTargetId`
- Second `AlertDialog` controlled by `removeTargetId !== null` with title, body, Cancel, and destructive "Remove Deck" confirm button

5 new tests in `DecksPage.test.tsx` (LIB-02a–e), all passing. `mockApiDelete` hoisted to allow test control of `api.delete`.

## TDD Gate Compliance

- RED commit: `9f4c716` — 5 failing tests for LIB-02 behaviors
- GREEN commit: `8b14b1e` — implementation makes all 13 tests pass
- REFACTOR: not needed (code is clean as written)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Radix UI DropdownMenu requires pointerDown before click in JSDOM**

- **Found during:** Task 3 GREEN (tests failing: "Unable to find element with text: Remove from library")
- **Issue:** Radix UI DropdownMenu 2.x uses pointer events to detect trigger clicks. In JSDOM, `fireEvent.click` alone does not open the menu — a `fireEvent.pointerDown` must precede it.
- **Fix:** Added `fireEvent.pointerDown(trigger)` before `fireEvent.click(trigger)` in all 4 dropdown interaction tests.
- **Files modified:** `apps/frontend/src/pages/__tests__/DecksPage.test.tsx`
- **Commit:** 8b14b1e

## Decisions Made

- **Radix DropdownMenu JSDOM testing pattern:** `fireEvent.pointerDown(trigger)` + `fireEvent.click(trigger)` required to open Radix UI DropdownMenu in JSDOM. Logged for future test authors.

## Threat Flags

No new security surface introduced beyond what was modeled in the plan's threat register (T-19-01 through T-19-04). No new endpoints, file access patterns, or schema changes beyond the planned DELETE route.

## Known Stubs

None. All 4 `it.todo` stubs in `library-remove.test.ts` are intentional behavior stubs (pattern from Phase 18 `library-toggle.test.ts`) — full integration tests require Prisma mocking or a test DB, deferred per the established project pattern.

## Self-Check: PASSED

All created/modified files exist on disk. All 4 task commits verified in git history.
