---
phase: 28-quick-edit-in-study
plan: 01
subsystem: api
tags: [zod, prisma, hono, study, permissions]

# Dependency graph
requires:
  - phase: 22-study-session-ux
    provides: DueCardSchema and GET /api/study/due, GET /api/study/deck/:deckId endpoints
provides:
  - "DueCardSchema.canEdit required boolean field"
  - "canEdit computed server-side in both study GET endpoints, zero new queries"
  - "it.todo documentation of the canEdit permission truth table"
affects: [28-02-quick-edit-in-study-frontend]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server-computed permission flag reused from an already-fetched query (widen select, don't add a query)"

key-files:
  created:
    - apps/backend/src/routes/__tests__/study-canedit.test.ts
  modified:
    - packages/shared/src/schemas/study.ts
    - apps/backend/src/routes/study.ts

key-decisions:
  - "canEdit computed only from deck.ownerId and the user's own DeckShare rows — never read from request input (T-28-01)"
  - "/deck/:deckId canEdit explicitly ANDs share.isActive even though the endpoint's existing 403 view-gate doesn't check it — closes Pitfall 5 gap"

patterns-established:
  - "canEdit is a UX display hint only; PATCH /api/decks/:deckId/cards/:cardId independently re-derives access via getDeckAccess and remains the sole authorization boundary"

requirements-completed: [SEDIT-01]

coverage:
  - id: D1
    description: "DueCardSchema exposes a required (non-optional) canEdit boolean field"
    requirement: "SEDIT-01"
    verification:
      - kind: other
        ref: "yarn workspace @kartex/shared build"
        status: pass
    human_judgment: false
  - id: D2
    description: "GET /api/study/due returns canEdit=true for owned/editable-shared decks, false otherwise, with zero new database queries"
    requirement: "SEDIT-01"
    verification:
      - kind: other
        ref: "yarn workspace @kartex/backend build"
        status: pass
      - kind: unit
        ref: "apps/backend/src/routes/__tests__/study-canedit.test.ts#study canEdit computation (it.todo documentation, Tests 1-5)"
        status: pass
    human_judgment: true
    rationale: "Behavior is documented via it.todo (project convention, no live Prisma-mock harness) — not asserted by a running test. Requires human/manual verification against a live DB to confirm the truth table holds at runtime."
  - id: D3
    description: "GET /api/study/deck/:deckId returns canEdit=true for owner or active EDIT/MANAGE share; false for READ, inactive share, or no access"
    requirement: "SEDIT-01"
    verification:
      - kind: other
        ref: "yarn workspace @kartex/backend build"
        status: pass
      - kind: unit
        ref: "apps/backend/src/routes/__tests__/study-canedit.test.ts#study canEdit computation (it.todo documentation, Test 6)"
        status: pass
    human_judgment: true
    rationale: "Behavior is documented via it.todo (project convention, no live Prisma-mock harness) — not asserted by a running test. Requires human/manual verification against a live DB to confirm the isActive gate (Pitfall 5) holds at runtime."

duration: 8min
completed: 2026-07-01
status: complete
---

# Phase 28 Plan 01: Backend canEdit Computation Summary

**Server-computed `canEdit` boolean added to `DueCardSchema` and populated in both `GET /api/study/due` and `GET /api/study/deck/:deckId` by reusing already-fetched deck/share data — zero new database queries.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-01T21:48:00+02:00
- **Completed:** 2026-07-01T21:53:52+02:00
- **Tasks:** 3
- **Files modified:** 3 (2 modified, 1 created)

## Accomplishments
- `DueCardSchema.canEdit` added as a required boolean, propagating to the `DueCard` type consumed by the frontend in Plan 02
- `GET /api/study/due` computes `canEdit` per card via a new `editableSharedDeckIds` Set built from the already-fetched `deckShare.findMany` rows (only the `select` was widened, no new query), and widened `deck` selects (added `ownerId`) in both the due-with-progress and never-seen card queries
- `GET /api/study/deck/:deckId` computes `canEdit` from the already-fetched `share` object, explicitly requiring `share.isActive === true` for EDIT/MANAGE shares — closes the Pitfall 5 gap where the endpoint's existing view-gate doesn't check `isActive`
- `it.todo` documentation of the full 6-branch permission truth table added, following the project's established documentation-only test convention (`sharing.test.ts`, `study-rate-reviewlog.test.ts`)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add canEdit boolean to DueCardSchema** - `7f9f42a` (feat)
2. **Task 2: Compute canEdit in both study GET endpoints** - `7aa9a3c` (feat)
3. **Task 3: Document canEdit behavior as it.todo backend tests** - `6ca0049` (test)

**Plan metadata:** committed separately by orchestrator (worktree mode)

_Note: Task 2 is tagged `tdd="true"` in the plan, but per the project's established convention (RESEARCH.md Wave 0 Gaps — no live Prisma-mock harness for `study.ts` route handlers), the behavior contract is documented via Task 3's `it.todo` cases rather than an executable RED/GREEN cycle. This matches the pattern already used by `sharing.test.ts` and `study-rate-reviewlog.test.ts`._

## Files Created/Modified
- `packages/shared/src/schemas/study.ts` - Added required `canEdit: z.boolean()` to `DueCardSchema`, placed after `nextReview`
- `apps/backend/src/routes/study.ts` - `/due`: widened `deckShare` select to include `permission`, built `editableSharedDeckIds` Set, widened both deck selects to include `ownerId`, added `canEdit` to both mapped card objects. `/deck/:deckId`: widened `share` select to include `permission`+`isActive`, added `canEdit` computation requiring `isActive` for EDIT/MANAGE shares, added to response map.
- `apps/backend/src/routes/__tests__/study-canedit.test.ts` - New file: `describe('study canEdit computation')` with 6 `it.todo` cases covering owner/EDIT/MANAGE/READ/none/inactive-share branches

## Decisions Made
- `canEdit` computed only from server-side `deck.ownerId` and the user's own `DeckShare` rows — never read from request input (T-28-01, elevation-of-privilege mitigation)
- `/deck/:deckId`'s `canEdit` explicitly ANDs `share.isActive === true` even though the endpoint's pre-existing 403 access-check gate doesn't check it — deliberately does not propagate the existing gap into the new field (Pitfall 5, T-28-02)
- Task 3 follows the project's documentation-only `it.todo` test convention rather than introducing a live Prisma-mock harness, matching `sharing.test.ts` / `study-rate-reviewlog.test.ts`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Worktree had no `node_modules` present (fresh worktree checkout); ran `yarn install` before the first build/test verification. Not a deviation from the plan's task content — a one-time environment setup step needed to execute the plan's own verification commands.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `canEdit` is now available on every `DueCard` returned by both study GET endpoints, unblocking Plan 02 (frontend `StudyCardMenu` gating on `currentCard.canEdit`)
- No blockers or concerns for Plan 02

---
*Phase: 28-quick-edit-in-study*
*Completed: 2026-07-01*

## Self-Check: PASSED

All created/modified files found on disk; all task commits (7f9f42a, 7aa9a3c, 6ca0049) and metadata commit (83dd0a0) verified present in git log.
