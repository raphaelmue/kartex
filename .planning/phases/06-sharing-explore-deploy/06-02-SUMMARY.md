---
phase: 06-sharing-explore-deploy
plan: 02
subsystem: frontend/explore + backend/fork
tags: [react, hono, prisma, explore, fork, sharing-ui, sonner, shadcn]
dependency_graph:
  requires:
    - DeckShare API (06-01) — POST/PATCH/DELETE /api/decks/:id/shares
    - canManageDeck helper (06-01)
    - ExploreDeckSchema, DeckListItemSchema, ShareSchema (06-01, packages/shared)
    - GET /api/decks returns sharedByUsername (06-01)
    - GET /api/decks/:id returns userPermission (06-01)
  provides:
    - GET /api/explore — PUBLIC decks list with owner.username (SHAR-04)
    - POST /api/decks/:id/fork — fork with access check + $transaction (SHAR-05)
    - ExplorePage component with deck grid and fork interaction
    - DecksPage shared deck tiles (sharedByUsername rendering)
    - DeckDetailPage sharing panel (add/revoke/update permission, non-owner attribution)
    - /explore route wired in App.tsx
    - Backend explore test stubs (SHAR-04, SHAR-05)
  affects:
    - apps/backend/src/routes/explore.ts (new)
    - apps/backend/src/routes/decks.ts (fork route appended)
    - apps/backend/src/index.ts (exploreRouter registered)
    - apps/frontend/src/pages/ExplorePage.tsx (new)
    - apps/frontend/src/pages/DecksPage.tsx (DeckListItem type + shared rendering)
    - apps/frontend/src/pages/DeckDetailPage.tsx (sharing panel + non-owner attribution)
    - apps/frontend/src/App.tsx (/explore route)
    - apps/backend/src/routes/__tests__/explore.test.ts (new)
tech_stack:
  added: []
  patterns:
    - "$transaction for fork — deck.create + card.createMany atomic (same pattern as import.ts)"
    - "Public OR DeckShare access check before fork (T-06-05, T-06-07 mitigated)"
    - "useEffect on deck?.id + user?.id to trigger fetchShares after deck loads"
    - "DeckWithPermission intersection type — avoids modifying shared schema for local page state"
    - "Sonner toast action — 'View deck' navigates to forked deck ID"
key_files:
  created:
    - apps/backend/src/routes/explore.ts
    - apps/backend/src/routes/__tests__/explore.test.ts
    - apps/frontend/src/pages/ExplorePage.tsx
  modified:
    - apps/backend/src/routes/decks.ts (fork route + Prisma.TransactionClient type fix)
    - apps/backend/src/routes/import.ts (Prisma.TransactionClient type fix — pre-existing noImplicitAny)
    - apps/backend/src/index.ts (exploreRouter import + app.route)
    - apps/frontend/src/pages/DecksPage.tsx (DeckListItem type + sharedByUsername JSX)
    - apps/frontend/src/pages/DeckDetailPage.tsx (sharing panel + non-owner attribution)
    - apps/frontend/src/App.tsx (/explore → ExplorePage)
decisions:
  - "DeckWithPermission intersection type used locally in DeckDetailPage — avoids schema changes for page-level state"
  - "Edit Deck / Delete Deck buttons hidden for non-owners (DeckDetailPage) — only owner can modify own deck"
  - "fetchShares triggered by second useEffect on [deck?.id, user?.id] — avoids race with fetchDeck async batch"
  - "Fork access check: PUBLIC || DeckShare (any permission) — matches SHAR-05 spec and T-06-05 threat"
metrics:
  duration: "~8 minutes"
  completed: "2026-05-29"
  tasks_completed: 3
  tasks_total: 3
  files_created: 3
  files_modified: 6
---

# Phase 06 Plan 02: Explore Page + Fork Endpoint + Sharing UI Summary

**One-liner:** GET /api/explore + POST /api/decks/:id/fork backend routes with full ExplorePage deck grid, fork interaction, DeckDetailPage sharing panel, and DecksPage shared-deck tile attribution.

## What Was Built

### Task 1 — Backend: explore.ts + fork route + index registration + test stubs

Created `apps/backend/src/routes/explore.ts` exporting `exploreRouter` with a single `GET /` handler that queries `prisma.deck.findMany({ where: { visibility: 'PUBLIC' } })` including `owner: { select: { username: true } }` and `_count: { select: { cards: true } }`. Auth is inherited from global `authMiddleware`.

Appended `POST /:id/fork` to `apps/backend/src/routes/decks.ts`:
- Fetches source deck with cards included
- Checks `isPublic = source.visibility === 'PUBLIC'` OR `hasShare` (DeckShare record for caller)
- Returns 404 if not found, 403 if no access (T-06-05, T-06-07 mitigated)
- `prisma.$transaction` creates new deck (`title: 'Copy of ${source.title}'`, `visibility: 'PRIVATE'`) and `card.createMany` copies all cards

Registered `exploreRouter` in `index.ts` at step 5e: `app.route('/api/explore', exploreRouter)`.

Created `apps/backend/src/routes/__tests__/explore.test.ts` with `it.todo` stubs for 4 GET /api/explore behaviors and 7 POST /api/decks/:id/fork behaviors (SHAR-04, SHAR-05).

**Auto-fixed:** Pre-existing `TS7006 Parameter 'tx'/'r' implicitly has an 'any' type` errors in `decks.ts` (sharedRows map callback from 06-01) and `import.ts` (two $transaction callbacks from 05-xx). Added `Prisma.TransactionClient` type annotation and `(typeof arr)[number]` pattern per STATE.md decision from 04-01. This was required to make `yarn workspace @kartex/backend typecheck exits 0` as specified in acceptance criteria.

**Commit:** `6ad90a6`

### Task 2 — Frontend: ExplorePage + App.tsx route + DecksPage shared tiles

Created `apps/frontend/src/pages/ExplorePage.tsx`:
- `useEffect` fetches `GET /api/explore` on mount
- Empty state: Compass icon + "No public decks yet" + "Decks made public will appear here."
- Card grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6`) matching DecksPage
- Each tile shows `by {deck.owner.username}` and card count
- Fork button with GitFork icon — disabled with "Forking…" label during in-flight state
- `handleFork` calls `api.post('/api/decks/:id/fork')` — success shows sonner toast with "View deck" action navigating to `/decks/${forked.id}`; error shows `toast.error`

Updated `apps/frontend/src/pages/DecksPage.tsx`:
- Import changed from `Deck` to `DeckListItem` from `@kartex/shared`
- State type `useState<DeckListItem[]>` and `useState<DeckListItem | undefined>`
- Added `{deck.sharedByUsername && <p className="text-xs text-muted-foreground">Shared by {deck.sharedByUsername}</p>}` in CardHeader after description

Updated `apps/frontend/src/App.tsx`:
- Added `import { ExplorePage } from '@/pages/ExplorePage'`
- Replaced `<Route path="/explore" element={<ComingSoon title="Explore" />} />` with `<Route path="/explore" element={<ExplorePage />} />`

**Commit:** `a6d90d3`

### Task 3 — Frontend: DeckDetailPage sharing panel + non-owner attribution

Extended `apps/frontend/src/pages/DeckDetailPage.tsx`:

**New imports:** `Share` (from `@kartex/shared`), `useAuth`, `Input`, `Select`/`SelectContent`/`SelectItem`/`SelectTrigger`/`SelectValue`

**New local types:** `DeckWithPermission = Deck & { userPermission?: string; owner?: { username: string } }` — used for deck state to include API-returned fields without modifying the shared schema.

**New local component:** `PermissionBadge` — amber for MANAGE, blue for EDIT, secondary for READ.

**New state:** `shares`, `shareUsername`, `sharePermission`, `shareError`, `shareLoading`

**New functions:**
- `fetchShares` — fetches `GET /api/decks/:id/shares`; non-blocking (empty try/catch)
- Second `useEffect` on `[deck?.id, user?.id]` — calls `fetchShares` when owner or MANAGE
- `handleAddShare` — `api.post('/api/decks/:id/shares', { username, permission })`, clears input on success, sets shareError on failure
- `handleRevokeShare` — `api.delete('/api/decks/:id/shares/:userId')`, filters shares state
- `handleUpdateSharePermission` — `api.patch('/api/decks/:id/shares/:userId', { permission })`, maps shares state

**JSX changes:**
1. Non-owner attribution: `{deck.ownerId !== user?.id && deck.owner && <p>Owned by {deck.owner.username}</p>}` after VisibilityBadge
2. Edit/Delete buttons wrapped with `{deck.ownerId === user?.id && (...)}` — owner-only
3. Sharing panel: `{(deck.ownerId === user?.id || deck.userPermission === 'MANAGE') && (...)}` section with add-user form (Input + Select + Button), share table with PermissionBadge + per-row Select + "Revoke Access" button, and "Not shared with anyone yet." empty state

**Commit:** `aac2136`

## Verification Results

```
yarn workspace @kartex/backend typecheck   → exit 0 (TYPECHECK: OK)
yarn workspace @kartex/frontend typecheck  → exit 0 (TYPECHECK: OK)
yarn workspace @kartex/backend test --run  → 1 passed, 25 todo (2 test files)
yarn workspace @kartex/frontend test --run → 41 passed, 2 pre-existing failures (KartexRenderer Typst)
yarn workspace @kartex/shared build        → exit 0
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing noImplicitAny errors blocking typecheck exit 0**
- **Found during:** Task 1 verification (`yarn workspace @kartex/backend typecheck`)
- **Issue:** Three `Parameter implicitly has an 'any' type` (TS7006) errors in `decks.ts` (line 50, `r` callback) and `import.ts` (lines 91 and 269, `tx` callbacks) — inherited from prior phases, previously masked by yarn workspace resolution in CI
- **Fix:** Added `Prisma.TransactionClient` type annotation to `$transaction` callbacks; used `(typeof sharedRows)[number]` for map callback per STATE.md 04-01 decision pattern
- **Files modified:** `apps/backend/src/routes/decks.ts`, `apps/backend/src/routes/import.ts`
- **Commit:** `6ad90a6`

## Known Stubs

None — all data paths in production code are wired to real API calls. The test stubs in `explore.test.ts` are `it.todo` entries (not production stubs) and are intentional scaffolding for future integration tests.

## Threat Flags

No new security-relevant surfaces beyond what is declared in the plan's threat model. All T-06-05 through T-06-08 mitigations are implemented:
- T-06-05: Fork access check — `if (!isPublic && !hasShare) return 403`
- T-06-06: explore query — `where: { visibility: 'PUBLIC' }` (no other visibility returned)
- T-06-07: hasShare checked via `prisma.deckShare.findUnique` before fork proceeds
- T-06-08: `canManageDeck` called on GET /shares (implemented in 06-01, untouched)

## Self-Check: PASSED

Files exist:
- `apps/backend/src/routes/explore.ts` — FOUND
- `apps/backend/src/routes/__tests__/explore.test.ts` — FOUND
- `apps/frontend/src/pages/ExplorePage.tsx` — FOUND
- `apps/backend/src/routes/decks.ts` (contains fork route) — FOUND
- `apps/backend/src/index.ts` (contains exploreRouter) — FOUND
- `apps/frontend/src/pages/DecksPage.tsx` (contains DeckListItem) — FOUND
- `apps/frontend/src/pages/DeckDetailPage.tsx` (contains sharing panel) — FOUND
- `apps/frontend/src/App.tsx` (contains ExplorePage route) — FOUND

Commits:
- `6ad90a6` — FOUND (Task 1: backend routes + test stubs)
- `a6d90d3` — FOUND (Task 2: ExplorePage + App.tsx + DecksPage)
- `aac2136` — FOUND (Task 3: DeckDetailPage sharing panel)
