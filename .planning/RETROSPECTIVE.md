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

## Cross-Milestone Trends

| Milestone | Phases | Plans | LOC | Days | Avg Plans/Day |
|-----------|--------|-------|-----|------|---------------|
| v1.0 MVP | 6 | 18 | 8,135 TS | 5 | 3.6 |
| v1.1 Study & Polish | 3 | 8 | 9,531 TS | 2 | 4.0 |
