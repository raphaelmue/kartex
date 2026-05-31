# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-30)

**Core value:** A user can open their dashboard, see their due cards, and complete a spaced-repetition study session — that loop must always work.
**Current focus:** v1.1 — Study Experience & Polish

## Current Position

Milestone: v1.1 Study Experience & Polish
Phase: Phase 8 — Study UX
Plan: 08-03 (complete)
Status: Phase 8 complete — STUDY-01/02/03/04 all GREEN (tag filter, session size, shuffle, deck tag grouping)
Last activity: 2026-05-31 — 08-03 executed: groupCardsByFirstTag utility + DeckDetailPage tag-sectioned layout; all 65 Phase 8 tests GREEN

Progress: [████████████████░░░░░░░░░░░░░░░░░░░░░░] 40% (Phase 8 complete — 3/3 plans done)

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
| 7 | 1/1 | ~4 min | ~4 min |

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
- 07-01: createRequire (not resolveJsonModule) for Vite define version injection — resolveJsonModule incompatible with moduleResolution: bundler + allowImportingTsExtensions
- 07-01: CSS transform always-in-DOM drawer for AppShell mobile — enables 200ms exit animation vs conditional render which can't animate exit
- 07-01: Explicit vitest imports (describe/it/expect/vi) required in test files — tsconfig has no vitest/globals types, matches CardFlip.test.tsx pattern
- 08-01: Wave 0 stub pattern: Vite's import-analysis resolves all import() expressions at compile time; create throwing stub file instead of dynamic import for RED test phase
- 08-01: StudySessionPage does NOT import useAuth — no AuthContext mock needed in StudySessionPage tests (confirmed by source read)
- 08-01: DeckDetailPage fetchShares triggers only when ownerId === user.id — use ownerId='other-user' in test deck to avoid 3rd api.get mock requirement
- 08-01: mockApiGet.mockImplementation(url =>) preferred over mockResolvedValueOnce for components with parallel (non-sequential) api.get calls
- 08-02: SessionProgress renders 'Card X of Y' (not 'X / Y') — test assertions must use actual component format
- 08-02: act(async () => { await waitFor(...) }) incompatible with Vitest 2.1.9 — use direct waitFor pattern instead
- 08-02: availableTags derived from allCardsRes prefetch (not cards state) — prevents chip list shrinking when filter active
- 08-03: groupCardsByFirstTag extracted to util file — DeckDetailPage was already ~517 lines; keeping inline would exceed 500-line limit; util path matches Wave 0 test import
- 08-03: CardActionCell local component extracted within DeckDetailPage to compact repeated edit/delete confirm JSX; keeps file at 497 lines

### Pending Todos

**v1.1 in progress:**
- ~~STUDY-01/02/03: Tag filter + session size + shuffle~~ → DONE 08-02
- ~~STUDY-04: Deck detail tag grouping~~ → DONE 08-03
- ~~SHELL-01/02: Mobile sidebar collapse + overlay drawer~~ → DONE Phase 7
- ~~SHELL-03: App footer~~ → DONE Phase 7
- I18N-01/02/03: react-i18next setup + string externalization + language switcher → Phase 9

**Completed:**
- [2026-05-28] Add .kartex format documentation — done as quick task 260530-001 (`docs/kartex-format.md`)
- [2026-05-28] Migrate to Prisma 7 — done as quick task 260530-002
- [2026-05-28] Add dark mode — done as quick task 260530-003
- [2026-05-28] Add GitHub Actions CI pipeline — done via Phase 6 (06-03) + quick task 260530-005

### Blockers/Concerns

None.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260526-001 | Quality baseline: ESLint/Prettier, code smell fixes, decisions recorded | 2026-05-26 | 372837e | [260526-001-quality-baseline](.planning/quick/260526-001-quality-baseline/) |
| 260530-001 | Add .kartex format documentation (docs/kartex-format.md) | 2026-05-30 | 52238a0 | [260530-001-kartex-format-docs](.planning/quick/260530-001-kartex-format-docs/) |
| 260530-002 | Migrate to Prisma 7 (5.22.0 → 7.8.0, pg driver adapter) | 2026-05-30 | — | [260530-002-migrate-to-prisma-7](.planning/quick/260530-002-migrate-to-prisma-7/) |
| 260530-003 | Add dark mode toggle (ThemeProvider, Moon/Sun icon in sidebar) | 2026-05-30 | — | [260530-003-add-dark-mode](.planning/quick/260530-003-add-dark-mode/) |
| 260530-005 | Fix backend Dockerfile for Prisma 7 migration entrypoint | 2026-05-30 | 0398325 | [260530-005-backend-dockerfile](.planning/quick/260530-005-backend-dockerfile/) |

## Deferred Items

Items acknowledged and deferred at milestone close on 2026-05-30:

| Category | Item | Status |
|----------|------|--------|
| todo | 2026-05-28-evaluate-topic-layer-between-deck-and-cards | resolved — maps to Phase 8 (STUDY-01/04) |
| todo | 2026-05-30-add-i18n | resolved — maps to Phase 9 (I18N-01/02/03) |
| todo | 2026-05-30-add-to-library-for-public-decks | removed — implemented (SHAR-06) |

## Session Continuity

Last session: 2026-05-31
Stopped at: 08-03 complete — Phase 8 fully done; STUDY-01/02/03/04 all GREEN
Resume with: `/gsd-plan-phase 9` (Phase 9: I18N — react-i18next setup, string externalization, language switcher)
