# Roadmap: Kartex

## Overview

Kartex is built in six vertical phases, each leaving the app in a usable state. Starting from a deployable monorepo skeleton with auth, the project adds deck and card CRUD, rich multimedia rendering, spaced-repetition study loops, `.kartex` file import, and finally sharing/explore and full production Docker Compose. Every phase can be used by a real user before the next begins.

## Quality Policy (cross-cutting)

**Tests per phase (Option A — active from Phase 3):**
Each phase ships tests for its own new logic. Minimum coverage targets:
- Pure functions (SM-2, `.kartex` parser, Zod edge cases) → unit tests with Vitest
- Hono route handlers → in-process integration tests via `hono/testing`
- React components — critical paths only (not snapshot tests)

**Baseline tooling (installed before Phase 3):**
- ESLint (flat config + typescript-eslint + eslint-plugin-react-hooks)
- Prettier (via eslint-config-prettier)
- `yarn lint` and `yarn format` run across all workspaces
- CI gate: `typecheck` + `lint` + `test` + `build` on every push (GitHub Actions, added in Phase 6)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Auth** - Monorepo scaffold, Docker Compose baseline, JWT auth with invite-code registration, admin user management
- [x] **Phase 2: Deck & Card Management** - Full CRUD for decks and cards (text/Markdown only), tags, deck visibility
- [x] **Phase 3: Rich Content Rendering** - KaTeX math, Typst WASM, image/audio/video/code rendering on cards
- [x] **Phase 4: Study Loops** - SM-2 spaced repetition, deck mode, exam mode, dashboard with stats
- [ ] **Phase 5: Import Pipeline** - `.kartex` file parser, preview UI, zip bundle with bundled media, MDIA validation
- [ ] **Phase 6: Sharing, Explore & Production Deploy** - Deck sharing, fork, /explore page, full Nginx TLS Docker Compose

## Phase Details

### Phase 1: Foundation & Auth
**Goal**: A new user can register via invite code, log in, and an admin can manage users — the app is deployable via Docker Compose.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: INFR-01, INFR-02, INFR-03, INFR-04, INFR-05, INFR-06, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, ADMN-01, ADMN-02, ADMN-03
**Success Criteria** (what must be TRUE):
  1. Running `docker compose up -d` after filling in `.env` starts the full stack (proxy, backend, db) and the app is reachable in a browser
  2. A new user can register only when a valid invite code is provided — invalid or missing codes are rejected
  3. A logged-in user's session survives a browser refresh (refresh token) and they can log out to end the session
  4. The access token is transparently refreshed in the background; the user is never asked to log in again within the 30-day window
  5. An admin can generate invite codes, view all users, and change a user's role or deactivate their account via the /admin page
**Plans**: 3 plans

Plans:

**Wave 1** (no dependencies):
- [x] 01-01-PLAN.md — Yarn workspace root + all package.json + tsconfig files + full Prisma schema + initial migration + Docker Compose + multi-stage Dockerfile

**Wave 2** *(blocked on Wave 1 completion — needs prisma generate output + yarn install)*:
- [x] 01-02-PLAN.md — Shared Zod schemas (@kartex/shared) + backend auth routes (register/login/logout/refresh/me) + admin routes + JWT middleware + rate limiter + seed + Hono entrypoint

**Wave 3** *(blocked on Wave 2 completion — needs @kartex/shared Zod schemas)*:
- [x] 01-03-PLAN.md — Tailwind + shadcn/ui init (7 components) + api.ts (silent refresh) + AuthContext + route guards + AppShell sidebar + LoginPage + RegisterPage + AdminPage + React Router v6

Cross-cutting constraints:
- Yarn Berry 4.x with nodeLinker: node-modules (D-04) — enforced in all plans
- All secrets via .env only — never hardcoded (INFR-06)
- JWT stored in httpOnly cookie — never in localStorage or JSON response body
**UI hint**: yes

### Phase 2: Deck & Card Management
**Goal**: A logged-in user can create decks, add cards with front/back text, tag them, and manage everything through the UI.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: DECK-01, DECK-02, DECK-03, DECK-04, DECK-05, CARD-01, CARD-02, CARD-03, CARD-04, CARD-05
**Success Criteria** (what must be TRUE):
  1. User can create a deck with title and optional description, then see it listed on the /decks page
  2. User can open a deck, add cards with front and back Markdown text, and see them listed in the deck
  3. User can edit or delete a deck (and all its cards), and edit or delete individual cards
  4. User can tag a card with freeform labels and cards with a given tag are distinguishable
  5. User can set deck visibility to private, shared, or public (UI accepts the setting; sharing enforcement comes in Phase 6)
**Plans**: 3 plans

Plans:

**Wave 1** (no dependencies):
- [x] 02-01-PLAN.md — Zod schemas (deck.ts, card.ts) in @kartex/shared + Prisma cascade deletes migration + Hono deck router + Hono card sub-router + backend index.ts registration

**Wave 2** *(blocked on Wave 1 completion — needs @kartex/shared types)*:
- [x] 02-02-PLAN.md — Install react-markdown, remark-gfm, @radix-ui/react-dialog/tabs/select + shadcn dialog/tabs/select components + KartexRenderer component

**Wave 3** *(blocked on Wave 2 completion — needs ui components and KartexRenderer)*:
- [x] 02-03-PLAN.md — DecksPage (/decks) + DeckFormModal + DeckDetailPage (/decks/:id) + CardEditorModal + App.tsx route wiring

**UI hint**: yes

### Phase 3: Rich Content Rendering
**Goal**: Card content renders the full Kartex format — Markdown, inline and block math (KaTeX), Typst WASM blocks, images, audio, and syntax-highlighted code.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: CARD-06, CARD-07, CARD-08, CARD-09, CARD-10, CARD-11, CARD-12
**Success Criteria** (what must be TRUE):
  1. Inline math (`$...$`) and block math (`$$...$$`) on a card render as formatted equations via KaTeX
  2. A `#typst` block on a card renders as a Typst WASM expression (typst.ts) without a page reload
  3. An image uploaded to the media volume and referenced on a card is visible inline on the card face
  4. An audio file uploaded to the media volume plays via a native HTML audio player embedded in the card
  5. An external video link (YouTube/Vimeo) renders as an embedded player, and a fenced code block renders with syntax highlighting
**Plans**: 3 plans

Plans:

**Wave 1** (no dependencies):
- [x] 03-01-PLAN.md — Vitest test infrastructure (Wave 0) + KaTeX plugin chain (remark-math + rehype-katex) + rehype-highlight + global CSS imports in main.tsx (CARD-06, CARD-07, CARD-12)

**Wave 2** *(blocked on Wave 1 completion — needs test infrastructure + KartexRenderer base)*:
- [x] 03-02-PLAN.md — Typst WASM packages + vite-plugin-wasm + vite.config.ts extension + typst.ts lazy singleton + KartexRenderer #typst block handler (CARD-08)

**Wave 3** *(blocked on Wave 2 completion — both plans touch KartexRenderer.tsx)*:
- [x] 03-03-PLAN.md — MediaUploadResponseSchema + backend media router (POST upload + GET serve, split auth) + STORAGE_PATH env var + KartexRenderer media:// image/audio + YouTube iframe + MediaUploadToolbar + CardEditorModal integration (CARD-09, CARD-10, CARD-11)

**UI hint**: yes

### Phase 4: Study Loops
**Goal**: A user can open the dashboard, see their due cards, run a spaced-repetition session, and track daily progress.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: STDY-01, STDY-02, STDY-03, STDY-04, STDY-05, STDY-06, STDY-07
**Success Criteria** (what must be TRUE):
  1. The dashboard shows all cards due today across all decks, grouped by deck with per-deck counts
  2. Starting a spaced repetition session shows due cards one at a time; after flipping, the user rates recall 1–4 and the next review date updates per SM-2
  3. Rating "Again" resets a card's interval to 1 day; repeated "Easy" ratings increase the interval exponentially
  4. User can start a deck mode session (sequential, all cards, SM-2 progress saved) and an exam mode session (time-limited, progress not saved)
  5. Dashboard shows total cards reviewed today and current study streak
**Plans**: 3 plans

Plans:

**Wave 1** (no dependencies):
- [x] 04-01-PLAN.md — SM-2 pure function in packages/shared + shared Zod schemas (RateCardSchema, DueCardSchema, DashboardStatsSchema) + backend study router (GET /api/study/due, GET /api/study/deck/:id, POST /api/study/rate) + dashboard router (GET /api/dashboard/stats) + unit tests (SM-2 algorithm, streak calculation)

**Wave 2** *(blocked on Wave 1 — needs API endpoints and DueCard type)*:
- [x] 04-02-PLAN.md — CardFlip (CSS 3D Y-axis flip, backface-visibility vendor prefix) + RatingButtons (color-coded, keyboard hints) + ExamTimer (per-session countdown) + SessionProgress + useStudySession hook (state machine, exam mode guard) + StudySessionPage (/study + /decks/:id/learn with mode selector) + App.tsx route wiring
- [x] 04-03-PLAN.md — DashboardPage (/dashboard hero + per-deck table + stat chips + empty state) + App.tsx /dashboard route replacement (ComingSoon → DashboardPage)

**UI hint**: yes

### Phase 5: Import Pipeline
**Goal**: A user can upload a `.kartex` file or `.kartex.zip` bundle, preview the parsed cards (with full rendering), and import them as a new deck.
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: IMPT-01, IMPT-02, IMPT-03, IMPT-04, IMPT-05, MDIA-01, MDIA-02, MDIA-03, MDIA-04
**Success Criteria** (what must be TRUE):
  1. User can upload a `.kartex` file on the /import page and see a list of parsed cards with rendered content before confirming import
  2. User can upload a `.kartex.zip` bundle; bundled media files are extracted and preview shows images/audio inline
  3. Confirming import creates a new deck and all cards in the database; bundled media files are stored on the Docker volume
  4. Uploading a file that is too large (over the configured max) or has an invalid MIME type or magic bytes is rejected with a clear error
  5. The configurable max upload size is controlled via an environment variable (default 10 MB)
**Plans**: 3 plans

Plans:

**Wave 1** (no dependencies):
- [ ] 05-01-PLAN.md — `parseKartex()` pure function in packages/shared/src/lib/kartex-parser.ts + five Zod schemas in packages/shared/src/schemas/import.ts + barrel exports + 10 unit tests (TDD: RED then GREEN)

**Wave 2** *(blocked on Wave 1 — needs parseKartex from @kartex/shared)*:
- [ ] 05-02-PLAN.md — Install unzipper + file-type + @types/unzipper + yaml + Hono importRouter (GET /api/import/config + POST /api/import with bodyLimit, MIME/magic validation, zip extraction, Prisma transaction) + register in index.ts

**Wave 3** *(blocked on Wave 2 — needs /api/import endpoint)*:
- [ ] 05-03-PLAN.md — shadcn alert + progress install + api.postForm() helper + useImport hook (4-state machine) + ImportPage (UPLOAD/PARSING/PREVIEW/SUCCESS, LazyCard IntersectionObserver, amber warnings banner, deck name input) + App.tsx /import route wiring

**UI hint**: yes

### Phase 6: Sharing, Explore & Production Deploy
**Goal**: A user can share decks with specific users or make them public, browse the explore page, fork decks, and the whole app runs in production via Docker Compose with Nginx TLS.
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: SHAR-01, SHAR-02, SHAR-03, SHAR-04, SHAR-05, SHAR-06
**Success Criteria** (what must be TRUE):
  1. A deck owner can share a deck with a specific user (READ or EDIT) and revoke that access; the shared user can see the deck on their /decks page
  2. A deck owner can make a deck public; it then appears on the /explore page browsable by any logged-in user
  3. A user can fork a public or shared deck into their own collection and edit it independently without affecting the original
  4. Each user's SM-2 progress is stored independently — forking or sharing a deck never copies or merges progress between users
**Plans**: TBD

Plans:
- [ ] 06-01: DeckShare API (grant/revoke READ/EDIT, public visibility) + per-user progress isolation enforcement
- [ ] 06-02: /explore page + fork endpoint + shared deck access on /decks
- [ ] 06-03: Nginx TLS config, docker-compose.yml finalization, .env.example, deployment docs
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Auth | 3/3 | Complete | 2026-05-26 |
| 2. Deck & Card Management | 3/3 | Complete | 2026-05-26 |
| 3. Rich Content Rendering | 3/3 | Complete | 2026-05-27 |
| 4. Study Loops | 3/3 | Complete | 2026-05-28 |
| 5. Import Pipeline | 0/3 | Not started | - |
| 6. Sharing, Explore & Production Deploy | 0/3 | Not started | - |
