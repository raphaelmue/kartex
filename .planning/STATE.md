# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-25)

**Core value:** A user can open their dashboard, see their due cards, and complete a spaced-repetition study session — that loop must always work.
**Current focus:** Phase 2 — Deck & Card Management

## Current Position

Phase: 2 of 6 (Deck & Card Management)
Plan: 2 of 3 in current phase
Status: In progress — plan 02-02 complete; 1 plan remaining
Last activity: 2026-05-26 — 02-02 executed: react-markdown + shadcn dialog/tabs/select + KartexRenderer component

Progress: [████████████████░░░░] 17% (1/6 phases complete, phase 2 in progress)

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: ~6 min/plan
- Total execution time: ~0.3 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 3/3 | ~18 min | ~6 min |
| 2 | 1/3 | ~2 min | ~2 min |

**Recent Trend:**
- Last 5 plans: 01-01, 01-02, 01-03, 02-01, 02-02
- Trend: on track

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Init: Typst WASM (typst.ts) is a v1 hard requirement — included in Phase 3
- Init: Videos as external links only (no self-hosted video storage)
- Init: httpOnly JWT cookies, 15-min access + 30-day refresh token
- Init: Invite-only registration (no open sign-up)
- 02-02: KartexRenderer named export (not default) — consumers use import { KartexRenderer } from '@/components/KartexRenderer'
- 02-02: XSS safety: allowDangerousHtml not enabled in react-markdown v10 (T-02-07 accepted)

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-05-26
Stopped at: Completed 02-02-PLAN.md — react-markdown + shadcn dialog/tabs/select + KartexRenderer
Resume file: .planning/phases/02-deck-card-management/02-03-PLAN.md
