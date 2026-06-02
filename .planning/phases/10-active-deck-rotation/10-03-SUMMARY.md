---
phase: 10-active-deck-rotation
plan: "03"
subsystem: backend-filter + frontend-toggle
tags: [deck-toggle, isActive, DECK-01, DECK-02, optimistic-update, switch, owner-only]
dependency_graph:
  requires: ["10-01", "10-02"]
  provides: [DECK-01-green, DECK-02-server-enforcement]
  affects: [apps/backend/src/routes/study.ts, apps/frontend/src/pages/DecksPage.tsx, apps/frontend/src/pages/DeckDetailPage.tsx]
tech_stack:
  added: []
  patterns: [isActive-filter-deckFilter, optimistic-toggle-revert, owner-only-switch-guard, opacity-60-inactive-card]
key_files:
  created: []
  modified:
    - apps/backend/src/routes/study.ts
    - apps/frontend/src/pages/DecksPage.tsx
    - apps/frontend/src/pages/DeckDetailPage.tsx
decisions:
  - "10-03: deckFilter OR[0] changed from { ownerId: userId } to { ownerId: userId, isActive: true } — single line change; shared-deck branch unchanged (owner-only scope v1.2)"
  - "10-03: Switch toggle group on DecksPage uses its own !deck.sharedByUsername guard separate from the Edit/Delete guard; both are equivalent but independently maintained"
  - "10-03: DeckDetailPage handleToggleActive captures prev = deck.isActive before optimistic flip to enable clean revert on failure"
  - "10-03: key moved from <Card> to outer opacity wrapper <div> on DecksPage deck list"
metrics:
  duration: "~2 min"
  completed: "2026-06-02"
  tasks_completed: 3
  tasks_total: 3
  files_created: 0
  files_modified: 3
---

# Phase 10 Plan 03: Backend isActive Filter + DecksPage/DeckDetailPage Toggle Summary

**One-liner:** DECK-02 enforced server-side by adding `isActive: true` to the owned-deck branch of `deckFilter` in `/api/study/due`; DECK-01 delivered by adding `Switch` toggle with optimistic update + revert on both DecksPage (card footer) and DeckDetailPage (header, owner-only); Plan 01 RED tests turned GREEN.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add isActive filter to /api/study/due owned-deck branch (DECK-02) | 8d05e2b | apps/backend/src/routes/study.ts |
| 2 | Add isActive Switch + optimistic toggle to DecksPage (DECK-01) | 976c8c1 | apps/frontend/src/pages/DecksPage.tsx |
| 3 | Add owner-only isActive Switch to DeckDetailPage header (DECK-01) | 918e372 | apps/frontend/src/pages/DeckDetailPage.tsx |

## What Was Built

### Task 1: Backend isActive Filter (DECK-02)

`apps/backend/src/routes/study.ts`:
- `deckFilter` owned-deck branch changed from `{ ownerId: userId }` to `{ ownerId: userId, isActive: true }`
- Both consumers of `deckFilter` (`cardProgress.findMany` and `card.findMany`) receive the filter automatically
- Shared-deck branch `{ id: { in: sharedDeckIds } }` left unchanged (owner-only scope for v1.2)
- `GET /api/study/deck/:deckId` handler NOT modified — deck-specific study always works regardless of `isActive`

### Task 2: DecksPage Toggle (DECK-01)

`apps/frontend/src/pages/DecksPage.tsx`:
- Added `import { Switch } from '@/components/ui/switch'`
- `handleToggleActive(deckId, checked)`: optimistic flip via `setDecks`, `PATCH /api/decks/:id { isActive: checked }`, on success `toast.success(activatedToast/deactivatedToast)`, on failure revert + `toast.error(failedToToggle)`
- `CardFooter`: Switch toggle group (`{!deck.sharedByUsername && (...)}`) with `mr-auto` wrapper — pushes Study/Open/Edit/Delete buttons right
- Each deck `<Card>` wrapped in `<div key={deck.id} className={deck.isActive ? '' : 'opacity-60'}>` — key moved to outer wrapper
- All 4 DECK-01 test cases (DECK-01a through DECK-01d) turned GREEN

### Task 3: DeckDetailPage Toggle (DECK-01)

`apps/frontend/src/pages/DeckDetailPage.tsx`:
- Added `import { Switch } from '@/components/ui/switch'`
- `handleToggleActive(checked)`: guards on `!deckId || !deck`, captures `prev = deck.isActive`, optimistic `setDeck`, `PATCH /api/decks/:id { isActive: checked }`, on success toast, on failure `setDeck(d => d ? { ...d, isActive: prev } : d)` + `toast.error`
- Switch rendered as first item in header button group, wrapped in `{deck.ownerId === user?.id && (...)}` owner guard
- No card-level opacity on DeckDetailPage (full-width detail page; dimming would be confusing per UI-SPEC §2)
- Existing DeckDetailPage test suite (3 tests) stays green

## Verification Results

| Check | Result |
|-------|--------|
| `yarn workspace @kartex/backend run build` | PASS — exit 0 |
| `deckFilter` owned branch has `isActive: true` | PASS |
| Shared-deck branch has no `isActive` | PASS |
| `GET /api/study/deck/:deckId` has no `isActive` reference | PASS |
| DecksPage.test.tsx — all 4 DECK-01 cases | PASS (GREEN) |
| DeckDetailPage.test.tsx — all 3 tests | PASS (still green) |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All toggle logic is fully wired: Switch renders, PATCH fires, toast shows, revert works.

## Threat Flags

None. All threat mitigations from the plan's threat model are accounted for:
- T-10-04: Existing `deck.ownerId !== c.get('userId')` check in PATCH /api/decks/:id enforces ownership. UI hides toggle for non-owners (DecksPage `!deck.sharedByUsername`, DeckDetailPage `deck.ownerId === user?.id`). No route change needed.
- T-10-05: `isActive: z.boolean().optional()` on UpdateDeckSchema (added Plan 02) rejects non-boolean.
- T-10-06: Server-side `isActive: true` filter on owned-deck branch (Task 1) — inactive owned-deck cards never returned regardless of client state.

## Self-Check: PASSED

- [x] `apps/backend/src/routes/study.ts` owned-deck branch has `{ ownerId: userId, isActive: true }` — FOUND
- [x] `apps/backend/src/routes/study.ts` shared-deck branch has no `isActive` — CONFIRMED
- [x] `apps/backend/src/routes/study.ts` `/deck/:deckId` handler has no `isActive` — CONFIRMED
- [x] `apps/frontend/src/pages/DecksPage.tsx` imports `Switch` from `@/components/ui/switch` — CONFIRMED
- [x] `apps/frontend/src/pages/DecksPage.tsx` contains `handleToggleActive` — CONFIRMED
- [x] `apps/frontend/src/pages/DecksPage.tsx` Switch guarded by `!deck.sharedByUsername` — CONFIRMED
- [x] `apps/frontend/src/pages/DecksPage.tsx` inactive cards wrapped with `opacity-60` and `key` on outer div — CONFIRMED
- [x] `apps/frontend/src/pages/DeckDetailPage.tsx` imports `Switch` from `@/components/ui/switch` — CONFIRMED
- [x] `apps/frontend/src/pages/DeckDetailPage.tsx` contains `handleToggleActive` — CONFIRMED
- [x] `apps/frontend/src/pages/DeckDetailPage.tsx` Switch wrapped in `deck.ownerId === user?.id &&` — CONFIRMED
- [x] Commits 8d05e2b, 976c8c1, 918e372 exist in git log — CONFIRMED
- [x] 4 DECK-01 test cases GREEN — CONFIRMED
- [x] 3 DeckDetailPage tests still green — CONFIRMED
