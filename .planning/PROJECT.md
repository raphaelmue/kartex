# Kartex

## Current State: v1.2 Complete

**Current milestone:** v1.2 Study Control & PWA — SHIPPED 2026-06-04
**Phases shipped:** 1–13 (v1.0: 1–6, v1.1: 7–9, v1.2: 10–13)
**Total plans shipped:** 42 (18 in v1.0 + 8 in v1.1 + 16 in v1.2)
**TypeScript LOC:** ~9,531

## Current Milestone: v1.3.0 Stats & Import Update

**Goal:** Surface meaningful learning progress to users on the dashboard, and allow existing decks to be updated in place via re-import without losing SM-2 history.

**Target features:**
- Learning Statistics (dashboard) — stat chips on the existing dashboard: total reviewed, retention rate (% Good/Easy last 30 days), card difficulty breakdown (Easy/Good/Hard/Again counts), per-deck progress (due, mastered, in-learning). New `GET /api/stats/summary` endpoint.
- Deck Update via Import — re-import a `.kartex` file to update an existing deck. Cards matched by ID: update content in place (SM-2 progress preserved), add new cards, remove deleted cards. Triggered from Deck Detail page with confirmation preview.

## What This Is

Kartex is a self-hosted web application for creating, importing, and studying with multimedia flashcards. It supports rich content (LaTeX math, Typst expressions, images, audio, code), a custom `.kartex` import format, deck sharing and public exploration, and SM-2 spaced repetition. Deployable via Docker Compose for a small group of 2-5 users with invite-based registration.

## Core Value

A user can open their dashboard, see their due cards, and complete a spaced-repetition study session — that loop must always work.

## Requirements

### Validated

**Validated in v1.0:**

- ✓ User can register via invite code (no open sign-up) — v1.0
- ✓ Admin can create and manage invite codes — v1.0
- ✓ User can log in with username + password and stay logged in (JWT, httpOnly cookie) — v1.0
- ✓ User can log out — v1.0
- ✓ Admin can manage users (roles: admin / user) — v1.0
- ✓ User can create a deck with title and description — v1.0
- ✓ User can view, edit, and delete their own decks — v1.0
- ✓ User can set deck visibility: private, shared, or public — v1.0
- ✓ User can create, edit, and delete cards with front/back content — v1.0
- ✓ User can tag cards with freeform labels — v1.0
- ✓ Cards render: Markdown, inline math, block math (KaTeX), `#typst` blocks (Typst WASM), images, audio, external video, code blocks — v1.0
- ✓ Images and audio uploaded to local Docker volume, validated by MIME + magic bytes, configurable max size — v1.0
- ✓ User can start a spaced repetition session (SM-2, due cards across all decks) — v1.0
- ✓ User can start a deck session (all cards in one deck, sequentially) — v1.0
- ✓ User can start an exam session (time limit, progress not saved) — v1.0
- ✓ After each card, user rates recall (1=Again, 2=Hard, 3=Good, 4=Easy) — v1.0
- ✓ Dashboard shows all cards due today and overall statistics (streak, reviewed today) — v1.0
- ✓ SM-2 algorithm: Again resets interval/repetitions, EF clamped at 1.3 floor, server-side only — v1.0
- ✓ User can upload a `.kartex` file and preview the parsed deck before importing — v1.0
- ✓ User can upload a `.kartex.zip` bundle (deck.kartex + media/ folder) — v1.0
- ✓ Deck owner can share a deck with specific users (READ or EDIT permission) — v1.0
- ✓ Deck owner can revoke access and make a deck public — v1.0
- ✓ Any logged-in user can browse public decks on the /explore page — v1.0
- ✓ User can fork a public or shared deck into their own collection — v1.0
- ✓ Learning progress is always stored per-user (never shared) — v1.0
- ✓ Full Docker Compose deployment: backend (Hono + serveStatic SPA), db (PostgreSQL 16), media volume — v1.0
- ✓ GitHub Actions CI: typecheck + lint + test + build on every push — v1.0

**Validated in v1.1:**

- ✓ Tag-based topic filter in study session (multi-select OR logic, chip bar) — v1.1
- ✓ Card limit + always-shuffle for study sessions (All/10/20/custom size picker) — v1.1
- ✓ Mobile sidebar collapse with hamburger toggle and overlay drawer (200ms CSS-transform slide) — v1.1
- ✓ App footer (build-time version, copyright, GitHub/Docs links) — v1.1
- ✓ react-i18next internationalization: 254-key en/de locale parity, all 9 pages translated, LanguageToggle with runtime switching — v1.1

### Validated in v1.2

- ✓ User can mark a deck as active or inactive (persists in DB, filters /study queue) — v1.2 Phase 10
- ✓ User can select which decks to include in a /study session (deck picker) — v1.2 Phase 10
- ✓ User can choose session size from /study start screen (All / 10 / 20 / custom) — v1.2 Phase 10
- ✓ User can set SM-2 study mode: Normal, Intensive (halved intervals), or Exam Prep (quartered) — v1.2 Phase 11
- ✓ App is installable as a PWA (manifest.json + service worker for static asset caching) — v1.2 Phase 12
- ✓ README.md exists at repo root with overview, stack, quick-start, and doc links — v1.2 Phase 13
- ✓ design.md and kartex-format.md are accurate against v1.2 codebase — v1.2 Phase 13

### Active

**v1.3.0 target requirements:**

- [ ] **STATS-01**: Dashboard displays total cards reviewed (all time) and this week
- [ ] **STATS-02**: Dashboard displays retention rate (% ratings ≥ Good in last 30 days)
- [ ] **STATS-03**: Dashboard displays card difficulty breakdown (Easy / Good / Hard / Again counts)
- [ ] **STATS-04**: Dashboard displays per-deck progress summary (due, mastered, in-learning)
- [ ] **IMP-01**: User can trigger a deck update from the Deck Detail page by uploading a new `.kartex` file
- [ ] **IMP-02**: Cards matched by ID are updated in place (content refreshed, SM-2 progress preserved)
- [ ] **IMP-03**: Cards present in the file but absent in the deck are added as new cards
- [ ] **IMP-04**: Cards present in the deck but absent in the file are removed from the deck
- [ ] **IMP-05**: A confirmation preview shows the diff (added / updated / removed counts) before the user commits the update

### Out of Scope

- **AI integration** — v2 feature; script → Claude API → Kartex deck generation not in v1
- **Offline / PWA** — service worker for offline study deferred to v2
- **OIDC / LDAP** — institutional auth not needed for 2-5 user self-hosted setup
- **Advanced statistics** — learning curves, retention rate charts; dashboard basics shipped in v1
- **AI-generated quiz mode** — multiple choice AI generation is v2; manual exam mode (time limit, no SM-2) shipped in v1
- **Open sign-up** — invite-only by design; prevents abuse on self-hosted instance
- **Self-hosted video storage** — external YouTube/Vimeo embeds are sufficient

## Context

- Design document at `docs/design.md` (v0.4) is the authoritative spec for data model, tech stack, `.kartex` format, and auth approach
- `.kartex` format documentation at `docs/kartex-format.md`
- Monorepo structure: `apps/frontend`, `apps/backend`, `packages/shared` (Zod schemas as single source of truth for types)
- Typst WASM (typst.ts) is loaded lazily via singleton; 2 pre-existing test failures remain in Vitest (WASM environment limitation — not a runtime bug)
- Hono serves the React SPA via `serveStatic` from `./public` — Nginx was removed (D-05/D-06)
- Target deployment: personal server or home lab, 2-5 concurrent users, no high-scale requirements
- Shipped v1.0 with 8,135 TypeScript LOC across 226 files in 5 days
- Shipped v1.1 with ~9,531 TypeScript LOC (46 files changed, +2,854 / -486 lines) in 2 days
- i18n: react-i18next v26, 254 keys, `apps/frontend/src/locales/{en,de}.json` — de.json is placeholder-quality; needs native speaker review before shipping to German users
- Uses yarn@4.15.0 workspaces (not pnpm despite original design doc — discovered in Phase 7)

## Constraints

- **Tech stack**: yarn workspaces monorepo, React + Vite + TypeScript + shadcn/ui, Hono backend, Prisma 7 + PostgreSQL 16, Docker Compose — fixed per design doc
- **Auth**: JWT in httpOnly cookies, invite-code registration only — no open sign-up
- **Spaced repetition**: SM-2 algorithm specifically — interval and ease factor per `docs/design.md § 9`
- **Deployment**: Docker Compose — must run with `docker compose up -d` after `.env` setup
- **Data types**: Shared Zod schemas in `packages/shared` must be the single source of truth — no type drift between frontend and backend

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Hono for backend | Lightweight, TypeScript-native, shares type ecosystem with frontend, easy Anthropic SDK path for future AI | ✓ Good — fast to develop against, Hono testing utilities made route tests straightforward |
| shadcn/ui components | Copy-paste into project (not npm dep) — full styling control without fighting a library | ✓ Good — no version conflicts, easy customization |
| Typst WASM in v1 | Users have existing cards with `#typst` math blocks; KaTeX alone is insufficient | ✓ Good — works at runtime; 2 test failures in Vitest WASM environment are acceptable |
| Invite-only registration | Small deployment, no open sign-up — prevents unauthorized access on self-hosted instance | ✓ Good — invite code flow is smooth |
| httpOnly JWT cookies | Protects tokens from XSS; access token 15 min + refresh token 30 days | ✓ Good — silent refresh via api.ts interceptor works transparently |
| Videos as external links only | No self-hosted video storage needed; simplifies Docker volumes; YouTube/Vimeo embeds sufficient | ✓ Good — simplifies media handling considerably |
| PostgreSQL 16 | Robust relational storage; Prisma provides type-safe access; arrays for card tags | ✓ Good — Prisma 7 migration straightforward once prisma.config.ts pattern understood |
| Tests per phase (Option A) | Each phase ships tests for its own code — unit tests for pure logic (SM-2, parser), component/integration tests for critical paths. Vitest is the runner (Vite-native). | ✓ Active — SM-2 and parser tests caught edge cases early |
| ESLint + Prettier as baseline | Linting (ESLint flat config + typescript-eslint) and formatting (Prettier) installed as cross-cutting baseline. | ✓ Active — caught type issues across workspaces |
| Nginx removed (D-05/D-06) | Hono's `serveStatic` serves the built SPA — eliminates a Docker service, simplifies deployment | ✓ Good — one fewer service, simpler Dockerfile |
| Prisma 7 migration (D-new) | Upgraded from Prisma 5.22.0 → 7.8.0 with pg driver adapter; `prisma.config.ts` replaces datasource `url` field | ✓ Good — Prisma 7 is more explicit about DB connection; required Dockerfile fix |
| react-markdown v10 custom URL transform | defaultUrlTransform strips unknown protocols; custom `kartexUrlTransform` passes `media://` through | ✓ Good — clean separation of protocol handling |
| Split Hono media router auth | `mediaPublicRouter` (GET) before authMiddleware, `mediaRouter` (POST) after — minimum viable auth split for browser img/audio src resolution | ✓ Good — allows `<img src="/api/media/...">` to work without CORS/cookie complexity |
| CSS-transform always-in-DOM drawer (v1.1) | Conditional render can't animate exit; always-in-DOM with translate toggle enables 200ms slide-out | ✓ Good — smooth mobile UX, no layout shift |
| createRequire for Vite version injection (v1.1) | `resolveJsonModule` incompatible with `moduleResolution: bundler + allowImportingTsExtensions` in project tsconfig | ✓ Good — works reliably with the existing tsconfig setup |
| availableTags from prefetch, not filtered state (v1.1) | Deriving available tags from filtered cards causes chip list to collapse when a filter is active | ✓ Good — chip bar stays stable while filter is applied |
| Flat table + tag filter bar over h3 section groups (v1.1) | UAT STUDY-04c failure: multi-tag cards appeared under only first tag in h3 layout; flat table + chip filter is simpler and correct | ✓ Good — adopted after UAT gap closure (08-04) |
| i18next v26 synchronous init (v1.1) | initImmediate removed from InitOptions in v26; init is synchronous by default without async backend plugin | ✓ Good — no need for Suspense wrapper in tests |
| labelKey pattern for hook-rule compliance (v1.1) | navItems/RATINGS arrays at module scope store key strings; t(key) called inside component render — avoids hooks-outside-component violation | ✓ Good — clean pattern for translated constant arrays |
| User content as interpolation values only (v1.1) | Deck titles, tags, usernames passed as `{{value}}` interpolations, never as translation keys — prevents i18n injection (T-09-05) | ✓ Good — explicit D-07 rule followed throughout all 254 keys |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-09 — v1.3.0 started. v1.0: 25 requirements shipped. v1.1: 10 requirements shipped. v1.2: 16 requirements shipped (16/16 complete).*
