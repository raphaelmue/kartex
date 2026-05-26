# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-25)

**Core value:** A user can open their dashboard, see their due cards, and complete a spaced-repetition study session — that loop must always work.
**Current focus:** Phase 3 — Card Rendering & Study Engine

## Current Position

Phase: 2 of 6 (Deck & Card Management) — COMPLETE
Plan: 3 of 3 in phase 2 — all plans done
Status: Phase 2 complete; ready to begin Phase 3
Last activity: 2026-05-26 — 02-03 executed: DecksPage, DeckDetailPage, DeckFormModal, CardEditorModal, App.tsx routes wired

Progress: [████████████████████░░░░] 33% (2/6 phases complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: ~6 min/plan
- Total execution time: ~0.6 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 3/3 | ~18 min | ~6 min |
| 2 | 3/3 | ~20 min | ~7 min |

**Recent Trend:**
- Last 5 plans: 01-03, 02-01, 02-02, 02-03
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
- 02-03: Use z.input<typeof Schema> instead of z.infer<> for useForm type when schema has .default() fields — matches zodResolver generic expectations

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
Stopped at: Completed 02-03-PLAN.md — DecksPage, DeckDetailPage, DeckFormModal, CardEditorModal, App.tsx routes
Resume file: .planning/phases/03-card-rendering-study/03-01-PLAN.md
