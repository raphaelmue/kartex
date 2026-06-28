---
gsd_state_version: 1.0
milestone: v1.4.0
milestone_name: Auth Overhaul & Study UX
current_phase: 24
status: executing
stopped_at: Completed 24-01-PLAN.md
last_updated: "2026-06-28T14:21:30.998Z"
last_activity: 2026-06-27
last_activity_desc: Phase 24 marked complete
progress:
  total_phases: 6
  completed_phases: 2
  total_plans: 9
  completed_plans: 9
  percent: 33
current_phase_name: email-invitations
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-19)

**Core value:** A user can open their dashboard, see their due cards, and complete a spaced-repetition study session — that loop must always work.
**Current focus:** Phase 24 — email-invitations

## Current Position

Phase: 24 — COMPLETE
Plan: 5 of 5
Status: Ready to execute
Last activity: 2026-06-27 — Phase 24 marked complete

## Performance Metrics

**Velocity:**

- Total plans completed: 9
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
| 14 | 3 | - | - |

**Recent Trend:**

- Last 5 plans: 02-03, 03-01, 03-02, 03-03, 04-01
- Trend: on track

*Updated after each plan completion*
| Phase 15-stats-feature P01 | 2 | 2 tasks | 3 files |
| Phase 15-stats-feature P02 | 6 | 2 tasks | 4 files |
| Phase 15-stats-feature P03 | 8 | 2 tasks | 4 files |
| Phase 16-import-update P01 | 4 | 2 tasks | 2 files |
| Phase 16-import-update P02 | 10 | 2 tasks | 4 files |
| Phase 16-import-update-feature P04 | 7 | 2 tasks | 2 files |
| Phase 17-mobile-ui-polish P01 | 2 | 2 tasks | 2 files |
| Phase 17-mobile-ui-polish P02 | 6 | 3 tasks | 5 files |
| Phase 18-library-deck-toggle P01 | 5 | 3 tasks | 5 files |
| Phase 18-library-deck-toggle P02 | 4 | 2 tasks | 3 files |
| Phase 19-library-remove-action P01 | 7 | 3 tasks | 6 files |
| Phase 20 P01 | 8 | 3 tasks | 11 files |
| Phase 22-study-session-ux P01 | 2 | 2 tasks | 4 files |
| Phase 22-study-session-ux P02 | 4 | 2 tasks | 3 files |
| Phase 23-auth-foundation P01 | 2 | 3 tasks | 5 files |
| Phase 23 P02 | 8 | 3 tasks | 4 files |
| Phase 23 P03 | 2 | 3 tasks | 2 files |
| Phase 24 P01 | 3 | 3 tasks | 3 files |
| Phase 24 P02 | 98 | 2 tasks | 2 files |
| Phase 24 P04 | 2 sessions | 2 tasks | 4 files |
| Phase 24 P05 | 10m | 2 tasks | 2 files |

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
- 22-01: STUDY-04 deck badge unconditional in SessionRunner progress row — not gated on studyMode; deckTitle rendered as JSX text child (D-07); study.deckBadgeAriaLabel key uses interpolation for aria-label only
- 22-02: STUDY-05 confirmed closed — Fisher-Yates does not produce deck-grouped output; 1000-run statistical test (>95% cross-deck mixing) proves correctness without a bug fix needed
- 22-02: shuffle extracted to apps/frontend/src/lib/shuffle.ts as named export; StudySessionPage imports via @/lib/shuffle (pure refactor — no behavior change)
- 12-01: @vite-pwa/assets-generator minimal-2023 preset outputs apple-touch-icon-180x180.png (not apple-touch-icon.png) — must copy to apple-touch-icon.png for index.html link to resolve
- 12-03: VitePWA placed last in plugins array (after react, wasm, topLevelAwait) — WASM compatibility (Pitfall 6)
- 12-03: globPatterns: ['**/*.{js,css,html}'] — wasm explicitly excluded to prevent Typst WASM 28 MB precache failure
- 12-04: maximumFileSizeToCacheInBytes set to 3 MiB — main bundle (2.16 MB) exceeds Workbox default 2 MiB limit
- 12-04: seedAdminIfNeeded wrapped in try-catch in Hono index.ts — server starts gracefully without DB connection
- v1.3-research: ReviewLog add in v1.3 migration — required for future STATS-02/03; append-only, cheap writes per rating call
- v1.3-research: STATS-02/03 ship with empty-state handling ("No data yet") on day 1 — no data until ReviewLog accumulates reviews
- v1.3-research: Mastered threshold locked at interval >= 21 days AND repetitions >= 3 (aligns with Anki/CleverDeck)
- v1.3-research: Stats endpoint separate from /api/dashboard/stats — keeps study CTA fast; stats degrade gracefully without blocking core loop
- v1.3-research: Import preview + apply are stateless — file re-uploaded on apply; no server-side session; diff re-computed server-side (prevents TOCTOU)
- v1.3-research: Import-update authorized owner only (not EDIT-level shares) in v1.3
- v1.3-research: All merge operations (createMany/update/deleteMany) inside single Prisma interactive transaction
- v1.3-research: card.updateMany unusable for content updates — use individual card.update calls inside transaction (each card has different data)
- v1.3-research: Every CardProgress query in stats.ts must include where: { userId } to hit compound index (prevent full-table scan)
- v1.3-research: i18n parity — ~15-25 new keys in v1.3; add each to both en.json and de.json in same commit
- 15-02: Prisma generate required after Phase 14 ReviewLog migration — generated client was stale; run prisma generate before backend build
- 15-02: retentionRate = null (not 0) when totalLast30 === 0; difficultyBreakdown = null (not zero-filled) when breakdown.length === 0 — honors T-15-02 empty-state contract
- 15-02: perDeck uses ownerId: userId scope — shared decks out of scope for Phase 15 stats (consistent with dashboard.ts, RESEARCH Pitfall 6)
- 15-03: CR-02 fix — separate void fetchDashboardStats() + void fetchStatsSummary() from same useEffect replaces Promise.allSettled; decouples loading states so skeleton IS reachable when dashboard resolves first
- 15-03: CR-01 fix — dashboard.stats.noDecksYet key added to en.json + de.json; StatsSummaryPanel uses t('dashboard.stats.noDecksYet') instead of hardcoded English string
- 15-03: StatsSummaryPanel pure display — summary:StatsSummary|null + loading:boolean; skeleton when loading=true, null-safe chips otherwise
- 15-03: mockApiGet.mockImplementation(url =>) for parallel-fetch test mocking (not mockResolvedValueOnce)
- 16-02: computeDiff uses sortedTagsJson (JSON.stringify([...tags].sort())) for tag equality — order-independent comparison
- 16-02: keepRemoved defaults to true (string !== 'false') — absent keepRemoved body field keeps cards (safe default)
- 16-02: apply route re-fetches deck and re-parses file independently of preview — stateless, prevents TOCTOU
- 16-02: tx.card.update data payload contains only frontContent/backContent/tags — kartexId and CardProgress fields intentionally excluded
- [Phase ?]: 16-04: DeckDetailPage.test.tsx uses real i18next (no react-i18next mock) — button text assertions must use actual en.json translation values, not i18n key strings
- 17-01: overflow-x-auto wrapper placed only around <Table> in StatsSummaryPanel, not the <p> heading — heading stays visible without scrolling, only table scrolls
- 17-01: overflow-x-hidden added unconditionally to AppShell main — fixed-position -translate-x-full drawer can contribute to scrollable content area in some browser engines
- 17-02: deleteTargetId replaces confirmDeleteId — AlertDialog open state controls delete flow; no separate boolean needed
- 17-02: DropdownMenuItem destructive style via className (text-destructive focus:text-destructive) — shadcn DropdownMenuItem has no variant prop
- 17-02: Single AlertDialog outside map loop — one shared instance avoids N dialog instances in DOM when N deck cards rendered
- 18-01: prisma migrate deploy unavailable without DATABASE_URL — hand-written migration SQL applied via Docker Compose entrypoint (consistent with 10-02 pattern)
- 18-01: isActive: r.isActive override before sharedByUsername in sharedRows.map — shadows r.deck.isActive (owner's setting) with DeckShare.isActive (recipient's setting)
- 18-01: OR[1] deckFilter for shared decks drops Deck.isActive — DeckShare.isActive already gates; owner's toggle must not exclude shared deck from recipient's study queue (D-03, D-10)
- 18-02: Library Switch uses id=active-lib-{id} prefix to prevent DOM id collision with owned-deck Switch id=active-{id} (T-18-07)
- 18-02: AuthContext mock user includes studyMode field — required to match User interface shape; DeckDetailPage tests confirmed this pattern
- [Phase ?]: Radix DropdownMenu JSDOM testing: fireEvent.pointerDown before fireEvent.click required to open Radix UI DropdownMenu 2.x in JSDOM test environment
- [Phase ?]: Logo SVG uses rect+polygon
- [Phase ?]: AppShell img accessibility attributes
- [Phase ?]: sharp version workaround for icon generation on Windows
- [Phase ?]: apple-touch-icon.png copy step
- v1.4-research: User.email nullable for existing users; required for new invite-based registration
- v1.4-research: 4 hand-written SQL migrations needed: add_user_email, add_invite_token, add_password_reset_token, add_user_cascade_deletes
- v1.4-research: nodemailer@^9.0.1 + @types/nodemailer@^8.0.1 (backend); abcjs@^6.6.3 (frontend)
- v1.4-research: Reset token stored as SHA-256 hash only; raw token only in email link (OWASP pattern)
- v1.4-research: Atomic updateMany WHERE usedAt IS NULL + count check for TOCTOU-safe single-use token consumption
- v1.4-research: abcjs DOM-mutation pattern: useRef + useEffect([source]) — same as TypstBlock; lazy import('abcjs') inside useEffect
- v1.4-research: importMedia.ts shared helper to be extracted from import.ts for reuse in zip deck update
- v1.4-research: canEdit field added to DueCardSchema (computed in study.ts from deck permissions)
- v1.4-research: e.stopPropagation() on StudyCardMenu DropdownMenuTrigger to prevent card flip on 3-dot click
- [Phase ?]: 23-01: email field nullable — existing users valid with NULL; UNIQUE permits multiple NULLs in Postgres
- [Phase ?]: 23-01: ReviewLog.userId has onDelete:Cascade — no explicit delete needed in cascade transaction (D-05)
- [Phase ?]: nodemailer singleton soft-fails on missing SMTP env vars — server starts normally (D-10)
- [Phase ?]: 23-02: verifyConnection() reserved for test endpoint only — never called at module init (prevents startup delay)
- [Phase ?]: 23-02: POST /mailer/test hard-targets admin's own email via userId lookup — no arbitrary send (T-23-03)
- [Phase ?]: 23-02: NO_EMAIL error code returned (not message string) so frontend maps to localised toast (D-12)
- [Phase ?]: 23-03: Media unlink uses m.storagePath (full path stored in DB)
- [Phase ?]: 23-03: deckIds pre-computed before prisma.$transaction array (Pitfall 2)
- [Phase ?]: 23-03: InviteCode.deleteMany required — usedById FK has no onDelete
- [Phase ?]: 24-01: Migration staged for Docker Compose entrypoint — prisma migrate deploy fails without DATABASE_URL in dev shell
- [Phase ?]: 24-01: InviteToken has no FK to User — email-only link keeps cascade deletes simple (D-01/D-02)
- [Phase ?]: 24-01: confirmPassword excluded from RegisterSchema — frontend-only concern, RegisterInput shape is { username, password, token }

### Pending Todos

**Captured todos:**

- [2026-06-15] Support deck update via zip file upload (`2026-06-15-support-deck-update-via-zip-file.md`) — maps to Phase 27
- [2026-06-15] Add quick-edit / jump-to-card button in study mode (`2026-06-15-quick-edit-card-button-in-study-mode.md`) — maps to Phase 28
- [2026-06-19] Improve user management and email-based auth flows (`2026-06-19-improve-user-management-and-email-based-auth-flows.md`) — maps to Phases 23–25

**Completed:**

- [2026-05-28] Add .kartex format documentation — done as quick task 260530-001 (`docs/kartex-format.md`)
- [2026-05-28] Migrate to Prisma 7 — done as quick task 260530-002
- [2026-05-28] Add dark mode — done as quick task 260530-003
- [2026-05-28] Add GitHub Actions CI pipeline — done via Phase 6 (06-03) + quick task 260530-005
- [2026-06-13] Remove public deck from personal library (LIB-02) — done in Phase 19
- [2026-06-13] Redesign Kartex logo with K motif on learning card — done in Phase 20 (`KartexLogo.tsx`)
- [2026-06-13] Show deck badge on study session cards (STUDY-04) — done in Phase 22 (StudySessionPage line 147)
- [2026-06-13] Verify and fix study session cross-deck shuffle (STUDY-05) — done in Phase 22; Fisher-Yates confirmed correct
- [2026-06-13] Add tag-based topic filter, card limit, footer, i18n, collapsible sidebar, deck rotation, README, PWA, SM-2 scaling, .kartex import update, learning statistics, library activate/deactivate, deck card button overflow — all resolved

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
| 260607-001 | Study card: cap card height, make back content scrollable, bump v1.2.1 | 2026-06-07 | 048f4fe | [260607-001-study-card-scrollable-text](.planning/quick/20260607-001-study-card-scrollable-text/) |
| 20260611-001 | Mobile: wrap stats tables in overflow-x-auto to prevent layout overflow | 2026-06-11 | faf3973 | [20260611-001-mobile-stats-table-fix](.planning/quick/20260611-001-mobile-stats-table-fix/) |

## Deferred Items

Items acknowledged and deferred at milestone close on 2026-05-30:

| Category | Item | Status |
|----------|------|--------|
| todo | 2026-05-28-evaluate-topic-layer-between-deck-and-cards | resolved — maps to Phase 8 (STUDY-01/04) |
| todo | 2026-05-30-add-i18n | resolved — maps to Phase 9 (I18N-01/02/03) |
| todo | 2026-05-30-add-to-library-for-public-decks | removed — implemented (SHAR-06) |

## Session Continuity

**Resume file:** None

Last session: 2026-06-27T16:45:57.429Z
Stopped at: Completed 24-01-PLAN.md
Resume with: `/gsd-plan-phase 23` — Auth Foundation
