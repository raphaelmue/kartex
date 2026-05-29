# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-25)

**Core value:** A user can open their dashboard, see their due cards, and complete a spaced-repetition study session — that loop must always work.
**Current focus:** Phase 6 — Sharing, Explore & Production Deploy

## Current Position

Phase: 6 of 6 (Sharing, Explore & Production Deploy) — Human UAT pending
Plan: 3 of 3 in phase 6
Status: Phase 6 complete (automated) — 4 human UAT items pending in 06-HUMAN-UAT.md
Last activity: 2026-05-29 — Phase 6 verified (10/11 automated), critical bugs fixed (CR-01, CR-02), human UAT pending

Progress: [█████████████████████████████████████] 98% (6/6 phases, UAT pending)

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
| 4 | 3/3 | ~38 min | ~13 min |

**Recent Trend:**
- Last 5 plans: 02-03, 03-01, 03-02, 03-03, 04-01
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
- 04-01: SM-2 quality mapping: Again(1)=0, Hard(2)=3, Good(3)=4, Easy(4)=5 — RATING_TO_QUALITY constant in shared package
- 04-01: calculateSM2 uses original easeFactor (not updated EF) for third+ interval: interval = ceil(prev_interval * old_EF) — matches classic SM-2 spec
- 04-01: Streak starts from today if reviewed today, else from yesterday — active streak persists for users who haven't studied yet today
- 04-01: Prisma map/filter callbacks require (item: (typeof arr)[number]) annotation in strict TypeScript backend — noImplicitAny compliance
- 04-03: shadcn Badge installed via npx shadcn@latest add badge — class-variance-authority was already present as ^0.7.1
- 04-03: Stat chips use inline border/rounded-lg divs (not shadcn Card) for minimal layout per UI-SPEC §1c and D-08
- 05-UAT: Topic grouping within decks → Option B (tag-as-topic + filtered study UI, no schema change). Option A (Topic model) deferred until tag-based approach proves insufficient.

### Pending Todos

- [2026-05-28] Migrate to Prisma 7 — `.planning/todos/pending/2026-05-28-migrate-to-prisma-7.md`
- [2026-05-28] Add dark mode — `.planning/todos/pending/2026-05-28-add-dark-mode.md`
- [2026-05-28] Add .kartex format documentation — `.planning/todos/pending/2026-05-28-add-kartex-format-documentation.md`
- [2026-05-28] Add tag-based topic filter to study session and deck view — `.planning/todos/pending/2026-05-28-evaluate-topic-layer-between-deck-and-cards.md`
- [2026-05-28] Add GitHub Actions CI pipeline with Docker build and GHCR push — `.planning/todos/pending/2026-05-28-github-actions-ci-docker-ghcr.md`

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

Last session: 2026-05-29
Stopped at: Phase 6 UI-SPEC approved — design contract ready for planning
Resume file: .planning/phases/06-sharing-explore-deploy/06-UI-SPEC.md
Resume file: .planning/phases/06-sharing-explore-deploy/06-CONTEXT.md
