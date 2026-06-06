---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Study Control & PWA
status: complete
stopped_at: v1.2.0 milestone archived and tagged (2026-06-06)
last_updated: "2026-06-06T00:00:00.000Z"
last_activity: "2026-06-06 - v1.2.0 archived: milestones/, ROADMAP.md collapsed, REQUIREMENTS.md removed, tag v1.2.0 created"
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 16
  completed_plans: 16
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-02)

**Core value:** A user can open their dashboard, see their due cards, and complete a spaced-repetition study session — that loop must always work.
**Current focus:** v1.2 roadmap defined — ready to plan Phase 10

## Current Position

Phase: 13 — Documentation (3/3 plans complete)
Plan: 03 — all plans executed
Status: Complete
Last activity: 2026-06-04 - Completed quick task 260604-001: language switcher moved to settings, CI lint fixed

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
| 9 | 3/3 | ~24 min | ~8 min |
| 10 | 4/5 | ~20 min | ~5 min |

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
- 09-01: i18next v26 removed initImmediate from InitOptions — omit it; v26 init is synchronous when no async backend plugin is used
- 09-01: changeLanguage mock requires 'as any' cast — TFunction brand type ($TFunctionBrand) in i18next v26 is not satisfiable by a plain function mock
- 09-01: Project uses yarn@4.15.0 (not pnpm) — use yarn workspace @kartex/frontend add for frontend package installs
- 09-02: labelKey pattern for navItems/RATINGS arrays — store key strings at module scope; call t(key) inside component render to satisfy React hook rules
- 09-02: a11y.revealHint added to both locale files — was missing from Plan 01 key inventory (CardFlip reveal hint text)
- 09-03: EXAM_DURATIONS/SIZE_OPTIONS moved inside StudySessionPage component — needed t() access; module-scope arrays can't call hooks
- 09-03: study.studyDeckLabel key added ('Study: {{deckTitle}}') — deckTitle interpolated as user content value, never a key (D-07)
- 09-03: LazyCard subcomponent in ImportPage gets useTranslation for Front/Back preview labels
- v1.2-research: Single combined Prisma migration for Deck.isActive + User.studyMode — avoids two deploy cycles; both have @default so migration is zero-downtime
- v1.2-research: studyMode stored on User model (not separate UserSettings table) — single preference; premature abstraction avoided; /api/auth/me already returns UserSchema
- v1.2-research: SM-2 multiplier applied post-calculateSM2 as a nextReviewAt post-processor — never modify stored CardProgress.interval (would corrupt future scheduling)
- v1.2-research: Typst WASM (28 MB) excluded from vite-plugin-pwa globPatterns via globIgnores; CacheFirst runtimeCaching rule for *.wasm instead
- v1.2-research: COEP/COOP headers added as Hono global middleware (resolves pre-existing production gap; currently dev-only via Vite server.headers)
- v1.2-research: sw.js served with Cache-Control: no-store via explicit Hono route before serveStatic catch-all
- 10-02: prisma migrate dev unavailable in driver adapter mode without DATABASE_URL in bash env — migration SQL hand-written; apply via prisma migrate deploy or docker compose entrypoint before backend reads isActive
- 10-02: isActive added to CreateDeckSchema (propagates to UpdateDeckSchema via .partial()); isActive added to DeckSchema (propagates to DeckListItemSchema via .extend())
- 10-02: @radix-ui/react-switch@^1.2.6 and @radix-ui/react-checkbox@^1.3.3 installed via npx shadcn@latest add
- 10-05: Both locale files (en.json + de.json) updated atomically in one commit — missing de.json keys fall back to raw key string, not English value (Pitfall 5 prevention)
- 10-03: deckFilter OR[0] changed to { ownerId: userId, isActive: true }; shared-deck branch unchanged (owner-only scope v1.2)
- 10-04: GlobalSRStartScreen extracted as a named local function component (above StudySessionPage) to manage file size
- 10-04: committedConfig initializer changed to always null — start screen must show before any auto-commit (Pitfall 2)
- 10-04: deckIds filter is additive to server isActive filter — never a replacement; client cannot be trusted as sole enforcement
- 10-04: mockParams.current vi.hoisted mutable holder in tests — default { id: 'deck-abc' }; global block sets {} in beforeEach
- 12-01: @vite-pwa/assets-generator minimal-2023 preset outputs apple-touch-icon-180x180.png (not apple-touch-icon.png) — must copy to apple-touch-icon.png for index.html link to resolve
- 12-03: VitePWA placed last in plugins array (after react, wasm, topLevelAwait) — WASM compatibility (Pitfall 6)
- 12-03: globPatterns: ['**/*.{js,css,html}'] — wasm explicitly excluded to prevent Typst WASM 28 MB precache failure
- 12-04: maximumFileSizeToCacheInBytes set to 3 MiB — main bundle (2.16 MB) exceeds Workbox default 2 MiB limit
- 12-04: seedAdminIfNeeded wrapped in try-catch in Hono index.ts — server starts gracefully without DB connection

### Pending Todos

**v1.2 active:**

- Phase 10: Active Deck Rotation — Prisma migration + DECK-01/02/03/04
- Phase 11: SM-2 Preset Modes — Settings page + rate endpoint multiplier — SM2-01/02/03/04
- Phase 12: PWA Shell — vite-plugin-pwa + manifest + COEP/COOP headers — PWA-01/02/03/04/05
- Phase 13: Documentation — README.md + docs refresh — DOCS-01/02/03

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
| 260604-001 | Move language switcher to settings; fix CI lint (unused ComingSoon) | 2026-06-04 | 0a96ef8 | [260604-001-lang-switcher-to-settings](.planning/quick/260604-001-lang-switcher-to-settings/) |

## Deferred Items

Items acknowledged and deferred at milestone close on 2026-05-30:

| Category | Item | Status |
|----------|------|--------|
| todo | 2026-05-28-evaluate-topic-layer-between-deck-and-cards | resolved — maps to Phase 8 (STUDY-01/04) |
| todo | 2026-05-30-add-i18n | resolved — maps to Phase 9 (I18N-01/02/03) |
| todo | 2026-05-30-add-to-library-for-public-decks | removed — implemented (SHAR-06) |

## Session Continuity

Last session: 2026-06-06T00:00:00.000Z
Stopped at: v1.2.0 milestone archived — all phases complete, tag created
Resume with: /gsd-new-milestone to start v1.3
