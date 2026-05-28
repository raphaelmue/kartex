# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-25)

**Core value:** A user can open their dashboard, see their due cards, and complete a spaced-repetition study session — that loop must always work.
**Current focus:** Phase 4 — Study Loops

## Current Position

Phase: 4 of 6 (Study Loops) — IN PROGRESS (UI-SPEC approved, ready for planning)
Plan: 0 of 3 in phase 4
Status: Phase 4 UI-SPEC approved — ready for planning
Last activity: 2026-05-28 — Phase 4 UI design contract approved (dashboard, study session, mode selector)

Progress: [████████████████████░░░░] 50% (3/6 phases complete, 3/3 plans in phase 3)

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
| 3 | 3/3 | ~19 min | ~6 min |

**Recent Trend:**
- Last 5 plans: 02-02, 02-03, 03-01, 03-02
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
- 03-01: Pinned vitest@2.1.9 (not 4.x) — Vitest 4.x requires Vite ^6.0; project uses Vite 5.x
- 03-01: Block math requires $$ on its own lines for remark-math display mode (single-line $$ = inline mode)
- 03-01: rehypeKatex before rehypeHighlight in rehypePlugins array (plugin order matters per RESEARCH.md Pitfall 2)
- 03-02: vi.hoisted() required for mock variables used inside vi.mock() factory — Vitest hoists vi.mock() but not const declarations
- 03-02: kartexComponents handles both p and h6 for #typst detection — Markdown may parse '#typst' as h6 or p depending on context (Pitfall 8)
- 03-03: react-markdown v10 defaultUrlTransform strips unknown protocols (returns ''). Custom kartexUrlTransform required to pass media:// through to img/a component handlers.
- 03-03: Split Hono router strategy for media: mediaPublicRouter (GET) before authMiddleware, mediaRouter (POST /upload) after — minimum viable auth split for browser img/audio src resolution

### Pending Todos

- [2026-05-28] Migrate to Prisma 7 — `.planning/todos/pending/2026-05-28-migrate-to-prisma-7.md`

### Blockers/Concerns

None yet.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260526-001 | Quality baseline: ESLint/Prettier, code smell fixes, decisions recorded | 2026-05-26 | 372837e | [260526-001-quality-baseline](.planning/quick/260526-001-quality-baseline/) |

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-05-28
Stopped at: Phase 4 context gathered — SM-2 study session UX + dashboard layout decisions captured
Resume file: .planning/phases/04-study-loops/04-CONTEXT.md
