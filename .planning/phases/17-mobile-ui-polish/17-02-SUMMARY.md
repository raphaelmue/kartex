---
phase: 17-mobile-ui-polish
plan: "02"
subsystem: frontend/decks
tags: [ui, mobile, dropdown-menu, alert-dialog, i18n, shadcn]
dependency_graph:
  requires: []
  provides: [DecksPage-DropdownMenu-pattern, DecksPage-AlertDialog-delete-confirm]
  affects: [DecksPage.tsx, en.json, de.json, dropdown-menu.tsx, alert-dialog.tsx]
tech_stack:
  added:
    - "@radix-ui/react-dropdown-menu@^2.1.17"
    - "@radix-ui/react-alert-dialog@^1.1.16"
    - "shadcn dropdown-menu component (copy-paste)"
    - "shadcn alert-dialog component (copy-paste)"
  patterns:
    - "Single shared AlertDialog instance outside map loop, controlled by deleteTargetId state"
    - "DropdownMenu per owned deck card — Edit + Delete items"
    - "Shared/library deck footer: Study + Open only (no dropdown)"
key_files:
  created:
    - apps/frontend/src/components/ui/dropdown-menu.tsx
    - apps/frontend/src/components/ui/alert-dialog.tsx
  modified:
    - apps/frontend/src/pages/DecksPage.tsx
    - apps/frontend/src/locales/en.json
    - apps/frontend/src/locales/de.json
decisions:
  - "deleteTargetId replaces confirmDeleteId — AlertDialog open state controls delete flow"
  - "DropdownMenuItem destructive style via className (text-destructive focus:text-destructive) — shadcn DropdownMenuItem has no variant prop"
  - "AlertDialogAction uses className for destructive background — not a shadcn Button variant"
  - "Single AlertDialog outside map loop — one instance shared across all deck cards"
metrics:
  duration_seconds: 355
  completed_date: "2026-06-11"
  tasks_completed: 3
  files_changed: 5
requirements_satisfied:
  - DECK-05
---

# Phase 17 Plan 02: Deck Card Footer DropdownMenu Restructure Summary

Replaced inline Edit + Delete buttons and `confirmDeleteId` inline confirm UI in DecksPage with a ⋮ DropdownMenu (owned decks) + shared AlertDialog delete confirmation. Deck card buttons are now fully contained at all viewport sizes.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Install shadcn DropdownMenu and AlertDialog | fe6e033 | dropdown-menu.tsx, alert-dialog.tsx, package.json, yarn.lock |
| 2 | Add three new i18n keys to en.json and de.json | 3ee5f79 | en.json, de.json |
| 3 | Restructure DecksPage CardFooter | bac751b | DecksPage.tsx |

## What Was Built

**dropdown-menu.tsx** — shadcn DropdownMenu component installed via `npx shadcn@latest add dropdown-menu`, wrapping `@radix-ui/react-dropdown-menu`. Exports: DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, and others.

**alert-dialog.tsx** — shadcn AlertDialog component installed via `npx shadcn@latest add alert-dialog`, wrapping `@radix-ui/react-alert-dialog`. Exports: AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel, and others.

**DecksPage.tsx** changes:
- Removed `confirmDeleteId` state variable and all inline "Are you sure?" / "Yes, delete" / "Cancel" button JSX
- Added `deleteTargetId` state variable (same type `string | null`)
- Replaced inline Edit + Delete buttons for owned decks with a ⋮ `DropdownMenu` containing Edit and Delete `DropdownMenuItem`s
- Delete `DropdownMenuItem` calls `setDeleteTargetId(deck.id)` to open the AlertDialog
- Added single `AlertDialog` instance outside the map loop — controlled by `deleteTargetId !== null`
- Shared/library deck `CardFooter` (when `deck.sharedByUsername` is set): Study + Open only — no DropdownMenu
- Added `MoreVertical` to lucide-react import
- Added DropdownMenu* and AlertDialog* component imports

**Locale files**: Both `en.json` and `de.json` received three new keys in the `decks` section:
- `decks.moreActions` — "More actions" / "Weitere Aktionen"
- `decks.deleteConfirmTitle` — "Delete deck?" / "Deck löschen?"
- `decks.deleteConfirmBody` — "This cannot be undone." / "Dies kann nicht rückgängig gemacht werden."

## Decisions Made

1. **deleteTargetId replaces confirmDeleteId** — AlertDialog open state (`deleteTargetId !== null`) is the single source of truth for the delete confirmation flow. No separate boolean needed.

2. **DropdownMenuItem destructive styling via className** — shadcn DropdownMenuItem has no `variant` prop; apply `text-destructive focus:text-destructive` directly as `className`.

3. **AlertDialogAction uses className for destructive background** — AlertDialogAction is a Radix primitive styled with `buttonVariants()`, not a shadcn Button with variant system; className override `bg-destructive text-destructive-foreground hover:bg-destructive/90` applies destructive colors.

4. **Single AlertDialog outside map loop** — One shared AlertDialog instance avoids N dialog instances in the DOM when there are N deck cards.

## Verification Results

- `grep -n "confirmDeleteId" DecksPage.tsx` → no output (state removed)
- `grep -n "DropdownMenu" DecksPage.tsx` → imports and usage present
- `grep -n "AlertDialog" DecksPage.tsx` → imports and usage present
- `node -e "require('./apps/frontend/src/locales/en.json').decks.moreActions"` → "More actions"
- `node -e "require('./apps/frontend/src/locales/de.json').decks.moreActions"` → "Weitere Aktionen"
- `cd apps/frontend && npx tsc --noEmit` → exit 0
- `cd apps/frontend && npm run build` → exit 0 (✓ built in 34.18s)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

No new threat surface introduced. The DropdownMenu Delete action is authenticated-user-only (deck list already gated by JWT middleware); deleteTargetId is scoped to the current user's deck list. T-17-02-01 mitigation is in place.

## Self-Check: PASSED

- apps/frontend/src/components/ui/dropdown-menu.tsx — FOUND
- apps/frontend/src/components/ui/alert-dialog.tsx — FOUND
- apps/frontend/src/pages/DecksPage.tsx — FOUND (modified)
- apps/frontend/src/locales/en.json — FOUND (3 new keys)
- apps/frontend/src/locales/de.json — FOUND (3 new keys)
- Commit fe6e033 — FOUND (Task 1)
- Commit 3ee5f79 — FOUND (Task 2)
- Commit bac751b — FOUND (Task 3)
