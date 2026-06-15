# Retrospective: Kartex

## Milestone: v1.0 — MVP

**Shipped:** 2026-05-30
**Phases:** 6 | **Plans:** 18 | **Timeline:** 5 days

### What Was Built

- Deployable Docker Compose stack with JWT auth, invite codes, and admin panel
- Full deck/card CRUD with Markdown rendering and tag support
- Rich multimedia rendering — KaTeX math, Typst WASM, images, audio, external video, syntax highlighting
- SM-2 spaced repetition engine with deck mode, exam mode, and dashboard stats/streak
- `.kartex` import pipeline — YAML parser, zip bundle support, 4-state preview UI, media extraction
- Deck sharing (READ/EDIT grants), /explore page, fork, GitHub Actions CI, production Docker Compose

### What Worked

- **Wave-based planning** — each phase was split into waves (Wave 1 no-deps, Wave 2 blocked, etc.), making parallel work clear and preventing integration conflicts
- **Shared Zod schemas as single source of truth** — zero type drift between frontend and backend throughout 18 plans; changes to `packages/shared` propagated correctly every time
- **TDD for pure functions** — SM-2 algorithm and `.kartex` parser were test-driven; unit tests caught edge cases (single-line `$$`, streak boundary, malformed YAML) that would have been subtle runtime bugs
- **shadcn/ui copy-paste pattern** — never fought the component library; could customize without forks or workarounds
- **Incremental deployability** — each phase left the app in a usable state; Phase 1 was runnable before Phase 2 started

### What Was Inefficient

- **Verification sign-off deferred to milestone close** — all 6 VERIFICATION.md files were in `human_needed` state until the day of close. Would be smoother to tick off human tests within each phase while the context is fresh
- **Quick task naming inconsistency** — first 4 quick tasks used prefixed SUMMARY filenames (`260526-001-SUMMARY.md`) while 260530-005 used plain `SUMMARY.md`; required a rename pass at milestone close for audit tool compatibility
- **REQUIREMENTS.md traceability table not updated inline** — rows stayed "Pending" even after requirements shipped; required a bulk update at archive time

### Patterns Established

- `vi.hoisted()` required for mock variables used inside `vi.mock()` factory in Vitest
- react-markdown v10 requires custom `kartexUrlTransform` to pass `media://` through to component handlers
- Split Hono router auth pattern: public GET routes before `authMiddleware`, authenticated POST routes after
- Block math requires `$$` on its own lines for remark-math display mode
- rehypeKatex before rehypeHighlight in plugin array (order matters)
- Quick task SUMMARY files must be named `SUMMARY.md` (not `TASKID-SUMMARY.md`) for audit tool

### Key Lessons

- **Prisma 7 requires `prisma.config.ts`** — `url` removed from datasource block; Dockerfile must copy this file or `prisma migrate deploy` silently fails at startup
- **Typst WASM in Vitest** — 2 persistent test failures due to WASM execution environment; acceptable in CI, works fine in browser
- **rehype-highlight adds `hljs-` class prefix** — any code that detects language class names (`language-typst`) must account for the `hljs-language-typst` variant after highlight pass
- **Hono `serveStatic` replaces Nginx** for single-server deployments — eliminates a Docker service while keeping SPA routing working

---

## Milestone: v1.1 — Study Experience & Polish

**Shipped:** 2026-06-01
**Phases:** 3 (7–9) | **Plans:** 8 | **Timeline:** 2 days

### What Was Built

- Responsive AppShell: mobile hamburger topbar, CSS-transform overlay drawer (200ms slide), sticky footer with build-time version injection
- StudySessionPage: multi-select tag filter (OR logic, chip bar), session size picker (All/10/20/custom), always-shuffle
- DeckDetailPage: flat card table with tag filter chip bar (replaced h3 section groups after UAT)
- react-i18next v26: 254-key en/de locale parity, LanguageToggle in AppShell, all 9 pages + shared components translated, runtime language switching without reload

### What Worked

- **UAT gap closure pattern** — Plan 08-04 was added as a gap closure after UAT STUDY-04c failure. The failing UAT item was clearly documented, the fix scope was tight (flat table replaces grouped layout), and it shipped cleanly in one additional plan. The GSD gap-closure flow worked well here.
- **Wave-based i18n** — Breaking Phase 9 into 3 waves (infrastructure → shared components → all pages) prevented integration conflicts and made each wave's scope clear. Plan 03 could verify full parity confidently because Plans 01/02 had clean handoffs.
- **labelKey pattern** — Storing translation key strings at module scope and calling `t(key)` inside render (for `navItems`, `RATINGS` arrays) was the right call for hook-rule compliance. A pattern worth reusing.
- **Code review → fix cycle** — Both Phase 8 and Phase 9 had dedicated REVIEW.md + REVIEW-FIX.md cycles that caught shadow variable bugs and i18n coverage gaps. The fix cycle added only 4 commits per phase.

### What Was Inefficient

- **REQUIREMENTS.md checkboxes not updated inline** — SHELL-01/02/03 and I18N-01/02/03 stayed unchecked until milestone close even though all requirements shipped. This is a recurring pattern from v1.0; it's a discipline issue more than a workflow issue.
- **Phase 8 plan count discrepancy** — ROADMAP documented 3 plans for Phase 8, but 4 were ultimately needed (08-04 gap closure). The plan count in ROADMAP wasn't updated when 08-04 was added. Minor, but reflects that plan count accuracy in ROADMAP degrades when mid-phase plans are inserted.
- **groupCardsByFirstTag retained but unused** — The utility was extracted in 08-03 and its tests pass, but DeckDetailPage no longer uses it (08-04 replaced the grouped layout with flat table). The dead code and its tests remain; should be cleaned up in v1.2.

### Patterns Established

- **CSS-transform always-in-DOM drawer** — Use translate toggle (not conditional render) for drawers that need exit animation
- **createRequire for Vite JSON injection** — `resolveJsonModule` incompatible with `moduleResolution: bundler + allowImportingTsExtensions`; use `createRequire` from `node:module`
- **availableTags from prefetch** — Always derive available filter tags from the pre-filtered full card set, not the active filtered set
- **EXAM_DURATIONS/SIZE_OPTIONS inside component** — Module-scope constant arrays with `t()` calls must be moved inside component render (hook rules)
- **labelKey pattern** — For arrays of labels (nav items, ratings), store translation key strings at module scope; call `t(key)` at render time
- **i18next v26 no `initImmediate`** — Field removed from InitOptions; synchronous init is the default without async backend plugins
- **D-07 user content interpolation** — User-authored values (deck titles, tags, usernames) are always `{{value}}` interpolations, never translation keys

### Key Lessons

- **UAT is the real verification gate** — Both Phase 8 (STUDY-04c) and Phase 9 (WR-01/02/03) had issues caught only at UAT/review time. Automated tests passed while behavioral issues remained. The UAT steps are worth preserving even for "polish" phases.
- **i18next v26 is a breaking upgrade from v23** — `initImmediate`, `use(LanguageDetector)`, and some type signatures changed. Always check the CHANGELOG when pinning major versions.
- **German (de.json) is placeholder quality** — All 254 keys have German translations but they are machine-generated. Needs native speaker review before shipping to German users. Document this explicitly as tech debt.

---

## Milestone: v1.3.1 — Bug Fixes & Mobile Polish

**Shipped:** 2026-06-12
**Phases:** 2 (17–18) | **Plans:** 4 | **Tasks:** 10 | **Timeline:** 1 day

### What Was Built

- `overflow-x-auto` on per-deck stats table + `overflow-x-hidden` on AppShell `<main>` — mobile 375px viewport no longer overflows (MOB-01)
- ⋮ DropdownMenu + shared AlertDialog outside map loop — deck card Edit/Delete buttons fully contained at all viewport sizes (DECK-05)
- `DeckShare.isActive` schema field + hand-written migration + PATCH `/api/decks/:id/library` endpoint + study queue filter fix — library deck per-user activation (LIB-01 backend)
- `handleToggleLibraryActive` optimistic-update handler + library Switch in CardFooter + 4 LIB-01 test cases (LIB-01 frontend)

### What Worked

- **Milestone audit before Phase 18** — the audit correctly flagged LIB-01 as unimplemented (Phase 18 hadn't started). This confirmed the audit tool catches real gaps, not just stale docs.
- **Parallel phase planning** — Phase 17 and 18 had no shared files; both could have run in parallel. The sequential execution was fine for 1 day but parallel would have been faster.
- **Optimistic-update mirror pattern** — `handleToggleLibraryActive` was a clean copy of `handleToggleActive` with only the URL changed. The existing pattern paid off immediately.
- **AuthContext mock fix as collateral** — Phase 18-02 fixed a pre-existing `useAuth must be used within an AuthProvider` error in DecksPage.test.tsx as a collateral improvement; all existing DECK-01a-d tests pass now.

### What Was Inefficient

- **REQUIREMENTS.md stale checkboxes** — DECK-05 and LIB-01 remained unchecked in REQUIREMENTS.md until milestone close. This is the same recurring pattern from v1.0 and v1.1 retrospectives — checkbox discipline at plan completion.
- **Milestone audit was stale at close** — The audit file had `status: gaps_found` because it was generated before Phase 18 ran. The audit was technically correct at the time but misleading at close. Running the audit after all phases complete would be more useful.
- **Phase Details section in ROADMAP.md** — The `## Phase Details` section still had v1.2 (Phases 10-13) entries alongside v1.3.1 entries; never cleaned up after v1.2 archive. Removed at v1.3.1 close.

### Patterns Established

- **`DeckShare.isActive` per-user library state** — owner's `Deck.isActive` and recipient's `DeckShare.isActive` are independent columns; OR branch in study filter drops `Deck.isActive` for shared decks (D-03, D-10)
- **Single AlertDialog outside map loop** — one shared dialog instance for N cards avoids N dialog DOM nodes; controlled by nullable targetId state
- **Library Switch id prefix** — `active-lib-{id}` vs `active-{id}` for owned deck Switch; required when same deck id could theoretically appear in both branches

### Key Lessons

- **Audit timing matters** — Running the milestone audit before all phases are executed creates a stale status at close. For v1.4, run the audit only after all phases complete.
- **Checkbox updates at plan completion** — REQUIREMENTS.md checkboxes should be updated in the plan's commit, not at milestone close. Recurring issue across v1.0, v1.1, v1.3.1.
- **`DeckShare.isActive @default(true)`** — The default ensures existing DeckShare rows (pre-migration) behave as active, which is the expected behavior. Always set sensible defaults for append-only migration columns.

---

## Milestone: v1.3.2 — UX Polish & Changelog

**Shipped:** 2026-06-15
**Phases:** 4 (19–22) | **Plans:** 5 | **Timeline:** 3 days

### What Was Built

- DELETE /api/decks/:id/library with IDOR guard + DecksPage ⋮ menu AlertDialog — permanent library removal (LIB-02)
- K-on-card SVG logo (rect+polygon, no text element); both AppShell brand areas updated; 8 PWA icon files regenerated (BRAND-01/02)
- CHANGELOG.md backfilled for 6 milestones (v1.0–v1.3.2) in Keep a Changelog format with user-facing bullets, Requirement IDs, Breaking Changes, Migration Notes (CHNG-01/02)
- Unconditional deck badge in SessionRunner progress row — persists on both card faces (STUDY-04)
- Fisher-Yates extracted to lib/shuffle.ts; 1000-run statistical test confirms cross-deck mixing — no bug fix needed (STUDY-05)

### What Worked

- **Short plans with clear scope** — 4 of 5 plans were single-concern (one backend route, one SVG, one changelog, one badge). Fast to plan, fast to execute, easy to verify.
- **Statistical test for STUDY-05** — Instead of visual inspection or a brittle deterministic test, a 1000-run mixing-rate assertion proved correctness conclusively. The right level of rigor for a shuffle verification.
- **Phase 21 TODO placeholder** — Leaving a clearly-marked `<!-- TODO Phase 22 -->` comment in CHANGELOG.md was a clean handoff between phases; filled at milestone close without ambiguity.
- **Radix DropdownMenu JSDOM pattern established** — `fireEvent.pointerDown + click` pattern documented as a new project decision; future test authors won't hit the same wall.

### What Was Inefficient

- **REQUIREMENTS.md checkboxes still not updated inline** — STUDY-04 and STUDY-05 remained unchecked in REQUIREMENTS.md after Phase 22 completed. This is the fourth consecutive milestone with this pattern. The fix is mechanical but keeps appearing in milestone close. Should be a checklist item in the plan completion flow.
- **sharp@0.33.5 DLL failure on Windows** — The @vite-pwa/assets-generator CLI failed with ERR_DLOPEN_FAILED due to a nested sharp version incompatibility on Windows x64. Required a workaround script using the root sharp@0.35.1. This was a Windows-specific environment issue, not a design problem, but it added ~3 minutes of debugging.

### Patterns Established

- **Radix DropdownMenu 2.x JSDOM pattern** — `fireEvent.pointerDown(trigger)` + `fireEvent.click(trigger)` required to open the menu in JSDOM; `fireEvent.click` alone silently does nothing
- **Statistical shuffle test** — 1000-run cross-deck mixing rate (>95% threshold) is the right pattern for verifying a Fisher-Yates shuffle produces genuine randomness
- **SVG logo shapes only** — Use `<rect>/<polygon>` (not `<text>`) for logos rendered in Docker/CI environments; font dependency causes rendering failures

### Key Lessons

- **Checkbox discipline at plan completion** — Update REQUIREMENTS.md checkboxes in the same commit that closes the plan. Do not leave this for milestone close. This has been a recurring pain point across every milestone.
- **Windows-specific package dependency issues** — When a tool uses a nested native module (`sharp`, `canvas`, etc.), verify it loads successfully on the target dev OS before committing to the tool. Have a fallback script ready.
- **CHANGELOG.md is worth backfilling** — Even for a project with a clean git history, a human-readable CHANGELOG.md makes it easier to communicate what changed to non-developers. Worth the 5-minute investment per milestone.

### Cost Observations

- Sessions: 4 phases across 3 days
- Model mix: Sonnet 4.6 throughout
- Notable: Phase 22 was the fastest plan pair (2 min + 4 min) — tight scope, clear requirements, existing pattern to follow

---

## Cross-Milestone Trends

| Milestone | Phases | Plans | LOC | Days | Avg Plans/Day |
|-----------|--------|-------|-----|------|---------------|
| v1.0 MVP | 6 | 18 | 8,135 TS | 5 | 3.6 |
| v1.1 Study & Polish | 3 | 8 | 9,531 TS | 2 | 4.0 |
| v1.3.1 Bug Fixes | 2 | 4 | ~11,000 TS | 1 | 4.0 |
| v1.3.2 UX Polish & Changelog | 4 | 5 | ~11,500 TS | 3 | 1.7 |
