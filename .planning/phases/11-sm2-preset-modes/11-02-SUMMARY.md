---
phase: 11-sm2-preset-modes
plan: "02"
subsystem: backend-api
tags: [hono, prisma, sm2, auth, study-mode]
dependency_graph:
  requires:
    - StudyModeSchema (packages/shared — from 11-01)
    - UpdateStudyModeSchema (packages/shared — from 11-01)
    - User.studyMode column (Phase 10 migration)
  provides:
    - GET /api/auth/me returns studyMode field
    - PATCH /api/auth/me endpoint (authenticated, validates body, persists studyMode)
    - POST /api/study/rate applies study mode multiplier to nextReview
  affects:
    - apps/backend/src/routes/auth.ts
    - apps/backend/src/routes/study.ts
tech_stack:
  added: []
  patterns:
    - Inline authMiddleware on auth routes (critical — global middleware does not cover /api/auth/*)
    - Zod safeParse with early 400 return
    - Promise.all for parallel DB fetches (CardProgress + user.studyMode)
    - SM-2 multiplier as nextReview post-processor — raw interval never modified
key_files:
  modified:
    - apps/backend/src/routes/auth.ts
    - apps/backend/src/routes/study.ts
decisions:
  - "PATCH /me uses inline authMiddleware as 2nd arg — auth routes bypass global /api/* middleware (T-11-03 mitigation)"
  - "UpdateStudyModeSchema.safeParse rejects non-enum studyMode values with 400 (T-11-04 mitigation)"
  - "STUDY_MODE_MULTIPLIERS[x] ?? 1.0 fallback — unknown mode defaults to normal multiplier, no amplification (T-11-05 mitigation)"
  - "CardProgress.interval always stores sm2.interval (raw) — never multiplied; only nextReview is adjusted (SM2-03 invariant)"
  - "Promise.all fetches CardProgress and user.studyMode in parallel to avoid sequential DB round-trips"
  - "adjustedNextReview uses Math.max(1, Math.ceil(interval * multiplier)) — 1-day floor prevents past scheduling even at 0.25x"
metrics:
  duration: "~5 min"
  completed: "2026-06-02"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 2
---

# Phase 11 Plan 02: SM-2 Preset Modes Backend Summary

**One-liner:** GET /me extended with studyMode, PATCH /me added with inline auth guard and UpdateStudyModeSchema validation, POST /rate applies study mode multiplier (0.25x–1.0x) to nextReview while always preserving raw sm2.interval in CardProgress.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Extend GET /me with studyMode; add PATCH /me endpoint | 1101d55 | apps/backend/src/routes/auth.ts |
| 2 | Apply study mode multiplier in POST /rate (nextReview only) | 7fd6319 | apps/backend/src/routes/study.ts |

## What Was Built

### Task 1 — auth.ts

- `UpdateStudyModeSchema` added to `@kartex/shared` import
- GET `/me` select extended: `studyMode: true` added alongside existing fields
- PATCH `/me` handler added after GET `/me` (before `export`):
  - `authMiddleware` applied inline as 2nd argument (T-11-03 mitigation — auth routes bypass global middleware)
  - `UpdateStudyModeSchema.safeParse` validates body; invalid values return 400 (T-11-04 mitigation)
  - `prisma.user.update` persists `studyMode`; returns full user shape including `studyMode`
- `yarn workspace @kartex/backend run build` exits 0

### Task 2 — study.ts

- `STUDY_MODE_MULTIPLIERS` constant added at module scope: `{ normal: 1.0, intensive: 0.5, exam_prep: 0.25 }`
- POST `/rate` handler updated:
  - Sequential `existing` fetch replaced by `Promise.all([cardProgress fetch, user.studyMode fetch])`
  - Multiplier post-processor inserted between `calculateSM2` and upsert
  - `adjustedNextReview = today + Math.max(1, Math.ceil(sm2.interval * multiplier))`
  - `setHours(0,0,0,0)` normalizes to midnight
  - Unknown mode falls back to `1.0` via `?? 1.0` operator (T-11-05 mitigation)
  - Upsert `update` and `create` both use `nextReview: adjustedNextReview` (SM2-02)
  - Upsert `update` and `create` both use `interval: sm2.interval` (raw — SM2-03 invariant preserved)
- `yarn workspace @kartex/backend run build` exits 0

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

All threats in the plan's threat model are mitigated by this implementation:

| Flag | File | Description |
|------|------|-------------|
| T-11-03 mitigated | apps/backend/src/routes/auth.ts | authMiddleware applied inline as 2nd arg to auth.patch('/me') |
| T-11-04 mitigated | apps/backend/src/routes/auth.ts | UpdateStudyModeSchema.safeParse rejects non-enum studyMode with 400 |
| T-11-05 mitigated | apps/backend/src/routes/study.ts | STUDY_MODE_MULTIPLIERS[x] ?? 1.0 — unknown mode falls back to normal |
| T-11-06 mitigated | apps/backend/src/routes/study.ts | interval: sm2.interval in upsert update+create — never multiplied |

## Self-Check: PASSED

- [x] apps/backend/src/routes/auth.ts — imports UpdateStudyModeSchema from @kartex/shared
- [x] apps/backend/src/routes/auth.ts — GET /me select contains studyMode: true (line 211)
- [x] apps/backend/src/routes/auth.ts — auth.patch('/me', authMiddleware, ...) exists (line 223)
- [x] apps/backend/src/routes/auth.ts — PATCH handler uses UpdateStudyModeSchema.safeParse (line 224)
- [x] apps/backend/src/routes/study.ts — STUDY_MODE_MULTIPLIERS constant at module scope (line 8)
- [x] apps/backend/src/routes/study.ts — Promise.all fetches existing + ratingUser (line 165)
- [x] apps/backend/src/routes/study.ts — nextReview: adjustedNextReview in upsert update (line 200) and create (line 209)
- [x] apps/backend/src/routes/study.ts — interval: sm2.interval in upsert update (line 198) and create (line 207)
- [x] Commits: 1101d55, 7fd6319 — both exist in git log
- [x] yarn workspace @kartex/backend run build exits 0
