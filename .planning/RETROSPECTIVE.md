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

## Cross-Milestone Trends

| Milestone | Phases | Plans | LOC | Days | Avg Plans/Day |
|-----------|--------|-------|-----|------|---------------|
| v1.0 MVP | 6 | 18 | 8,135 TS | 5 | 3.6 |
