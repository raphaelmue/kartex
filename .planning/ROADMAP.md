# Roadmap: Kartex

## Milestones

- ✅ **v1.0 MVP** — Phases 1–6 (shipped 2026-05-30)
- ✅ **v1.1 Study Experience & Polish** — Phases 7–9 (shipped 2026-06-01)
- ✅ **v1.2 Study Control & PWA** — Phases 10–13 (shipped 2026-06-04) — [archive](milestones/v1.2-ROADMAP.md)
- 🚧 **v1.3.0 Stats & Import Update** — Phases 14–16 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–6) — SHIPPED 2026-05-30</summary>

- [x] Phase 1: Foundation & Auth (3/3 plans) — completed 2026-05-26
- [x] Phase 2: Deck & Card Management (3/3 plans) — completed 2026-05-26
- [x] Phase 3: Rich Content Rendering (3/3 plans) — completed 2026-05-27
- [x] Phase 4: Study Loops (3/3 plans) — completed 2026-05-28
- [x] Phase 5: Import Pipeline (3/3 plans) — completed 2026-05-28
- [x] Phase 6: Sharing, Explore & Production Deploy (3/3 plans) — completed 2026-05-29

Full details: [.planning/milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

<details>
<summary>✅ v1.1 Study Experience & Polish (Phases 7–9) — SHIPPED 2026-06-01</summary>

- [x] Phase 7: App Shell (1/1 plans) — completed 2026-05-31
- [x] Phase 8: Study UX (4/4 plans — 3 original + 1 UAT gap closure) — completed 2026-06-01
- [x] Phase 9: Internationalization (3/3 plans) — completed 2026-06-01

Full details: [.planning/milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)

</details>

<details>
<summary>✅ v1.2 Study Control & PWA (Phases 10–13) — SHIPPED 2026-06-04</summary>

- [x] Phase 10: Active Deck Rotation (5/5 plans) — completed 2026-06-02
- [x] Phase 11: SM-2 Preset Modes (4/4 plans) — completed 2026-06-03
- [x] Phase 12: PWA Shell (4/4 plans) — completed 2026-06-03
- [x] Phase 13: Documentation (3/3 plans) — completed 2026-06-04

Full details: [.planning/milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md)

</details>

### v1.3.0 Stats & Import Update

- [ ] **Phase 14: Schema Foundation** — Prisma migration (ReviewLog + Card.kartexId), parser id: field, shared schema extensions
- [ ] **Phase 15: Stats Feature** — GET /api/stats/summary, StatsSummaryPanel, DashboardPage integration
- [ ] **Phase 16: Import Update Feature** — preview + apply endpoints, DeckUpdateModal, DeckDetailPage update flow

---

## Phase Details

### Phase 10: Active Deck Rotation

**Goal**: Users control which decks feed their global study queue, and the /study start screen gives them per-session overrides
**Depends on**: Nothing (first phase of v1.2)
**Requirements**: DECK-01, DECK-02, DECK-03, DECK-04
**Success Criteria** (what must be TRUE):

  1. User can toggle a deck active or inactive from the deck list and deck detail page; the toggle state persists after a browser refresh
  2. Starting a /study session only surfaces due cards from decks the user has marked active (inactive decks are completely excluded from the queue)
  3. The /study start screen shows a deck picker listing all active decks, all pre-checked; the user can uncheck individual decks for that session without affecting the persisted isActive flag
  4. The /study start screen has a session size picker (All / 10 / 20 / custom) consistent with the existing /decks/:id/learn picker

**Plans**: 5 plans
**Wave 1**

- [x] 10-01-PLAN.md — Wave 0 RED test stub (DecksPage.test.tsx) for DECK-01 toggle
- [x] 10-02-PLAN.md — Schema foundation: Prisma isActive + studyMode migration, shared Zod schemas, shadcn Switch + Checkbox
- [x] 10-05-PLAN.md — i18n keys for toggle + start screen (en.json + de.json)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 10-03-PLAN.md — Backend isActive filter (study.ts) + DecksPage & DeckDetailPage toggles (DECK-01, DECK-02)
- [x] 10-04-PLAN.md — /study start screen: deck picker + session size picker (DECK-03, DECK-04)

**UI hint**: yes

### Phase 11: SM-2 Preset Modes

**Goal**: Users can choose how aggressively intervals are compressed and that choice is enforced server-side on every rating
**Depends on**: Phase 10 (User.studyMode column added in Phase 10 migration)
**Requirements**: SM2-01, SM2-02, SM2-03, SM2-04
**Success Criteria** (what must be TRUE):

  1. The /settings page shows a study mode selector with three options — Normal, Intensive, Exam Prep — replacing the former placeholder; the selected mode persists after logout and re-login
  2. Rating a card in Intensive mode schedules it sooner than Normal mode (nextReviewAt is earlier); rating in Exam Prep mode schedules it sooner still — verified by inspecting the API response
  3. The raw SM-2 interval stored in CardProgress is the same regardless of active study mode — only nextReviewAt shifts; the stored interval is never multiplied
  4. When a non-Normal mode is active, the study session header displays a visible indicator of the current mode

**Plans**: 4 plans
**Wave 1** *(parallel)*

- [x] 11-01-PLAN.md — Shared schemas (StudyModeSchema, UserSchema.studyMode, UpdateStudyModeSchema) + AuthContext User.studyMode + i18n keys (en.json + de.json)
- [x] 11-02-PLAN.md — Backend: GET /me returns studyMode; PATCH /api/auth/me updates studyMode; POST /api/study/rate applies multiplier post-calculateSM2

**Wave 2** *(blocked on Wave 1)*

- [x] 11-03-PLAN.md — RadioGroup install + SettingsPage.tsx + App.tsx /settings route
- [x] 11-04-PLAN.md — StudySessionPage mode indicator + SettingsPage.test.tsx (SM2-01) + StudySessionPage.test.tsx SM2-04 cases

**UI hint**: yes

### Phase 12: PWA Shell

**Goal**: The app is installable from the browser and loads its shell instantly on repeat visits without breaking Typst WASM or cached API data
**Depends on**: Phase 11 (full app complete before PWA integration test is meaningful)
**Requirements**: PWA-01, PWA-02, PWA-03, PWA-04, PWA-05
**Success Criteria** (what must be TRUE):

  1. Chrome (desktop and mobile) offers an "Add to Home Screen" / "Install" prompt when visiting the app — the manifest.webmanifest with 192x192 and 512x512 icons is present and valid per Lighthouse
  2. On a repeat visit with the network throttled, the app shell (HTML/JS/CSS) loads from the service worker cache before the network responds; the study session, dashboard, and card content all continue to function normally once the network responds
  3. All /api/* requests go directly to the network; the service worker never returns a cached API response regardless of network state
  4. The production Hono server sends Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp headers on all responses (Typst WASM functions correctly in production without dev-server workarounds)
  5. After a redeployment, the browser downloads the new sw.js immediately (no stale cached version); sw.js and workbox-*.js are served with Cache-Control: no-store

**Plans**: 4 plans

**Wave 1** *(parallel)*

- [x] 12-01-PLAN.md — Package legitimacy checkpoint + logo SVG + icon generation (@vite-pwa/assets-generator) + index.html meta tags (PWA-01)
- [x] 12-02-PLAN.md — Hono backend: secureHeaders middleware (COEP/COOP) + /sw.js no-store route + serveStatic onFound for workbox-*.js (PWA-04, PWA-05)

**Wave 2** *(blocked on Wave 1)*

- [x] 12-03-PLAN.md — Install vite-plugin-pwa + workbox-window + configure VitePWA in vite.config.ts with manifest, precache rules (no WASM), NetworkOnly /api/*, CacheFirst *.wasm (PWA-01, PWA-02, PWA-03)

**Wave 3** *(blocked on Wave 2)*

- [x] 12-04-PLAN.md — Production build verification + curl header smoke tests + Lighthouse PWA audit checkpoint (all five requirements)

**UI hint**: yes

### Phase 13: Documentation

**Goal**: The repository is self-documenting for a new developer or returning user — accurate README, correct architecture doc, accurate format spec
**Depends on**: Phase 12 (docs describe the completed v1.2 state including PWA and Settings page)
**Requirements**: DOCS-01, DOCS-02, DOCS-03
**Success Criteria** (what must be TRUE):

  1. A developer who clones the repo cold can follow README.md to set up .env and run docker compose up -d without consulting any other file
  2. docs/design.md contains no references to Nginx, no references to pnpm — the architecture section accurately reflects Hono serveStatic and yarn@4.15.0
  3. docs/kartex-format.md accurately documents the #typst block type, audio media, and the .kartex.zip bundle format as implemented in v1.1

**Plans**: 3 plans

**Wave 1** *(all parallel — no shared files)*

- [x] 13-01-PLAN.md — Create README.md at repo root with project overview, tech stack, quick-start, and doc links (DOCS-01)
- [x] 13-02-PLAN.md — Fix stale sections in docs/design.md: remove Nginx/pnpm references, update architecture diagram, services table, data model, Docker Compose example (DOCS-02)
- [x] 13-03-PLAN.md — Verify docs/kartex-format.md accuracy against parser source; fix any discrepancies found (DOCS-03)

---

### Phase 14: Schema Foundation

**Goal**: The database schema and shared parser support stable card identity and review history logging, unblocking both the stats and import-update features
**Depends on**: Phase 13 (v1.2 complete)
**Requirements**: STATS-05, IMP-07
**Success Criteria** (what must be TRUE):

  1. Running `prisma migrate deploy` applies a single migration that adds the `ReviewLog` table and the nullable `Card.kartexId` column; the migration is safe on a populated database (no data loss, all new columns have defaults or are nullable)
  2. `POST /api/study/rate` writes one `ReviewLog` row (userId, cardId, deckId, rating, reviewedAt) inside the existing `cardProgress.upsert` transaction — verifiable by querying the `ReviewLog` table after a rating call
  3. A `.kartex` file containing an `id:` field per card block is parsed without error and the `id` value is available on the resulting `ParsedCard` object; a `.kartex` file without any `id:` fields continues to import correctly (backward compatible)
  4. `ParsedCardSchema` in `packages/shared` exposes an optional `id` field; `StatsSummarySchema` and `DeckUpdatePreviewSchema`/`DeckUpdateResultSchema` exist as shared Zod types
  5. `docs/kartex-format.md` documents the optional `id:` card field

**Plans**: 3 plans

**Wave 1**

- [ ] 14-01-PLAN.md — Prisma schema (ReviewLog + Card.kartexId) + hand-written SQL migration + shared Zod schemas (stats.ts, update.ts, ParsedCardSchema.id)

**Wave 2** *(blocked on Wave 1)*

- [ ] 14-02-PLAN.md — Parser `id:` field implementation (TDD) + docs/kartex-format.md update (IMP-07, D-04)
- [ ] 14-03-PLAN.md — [BLOCKING] prisma migrate deploy + rate endpoint transaction with ReviewLog write (STATS-05)

### Phase 15: Stats Feature

**Goal**: Users can see their learning progress at a glance on the dashboard — total cards studied, retention rate, difficulty breakdown, and per-deck status
**Depends on**: Phase 14 (ReviewLog table required for STATS-02/03; STATS-01/04 could run earlier but a single phase minimises deployment cycles)
**Requirements**: STATS-01, STATS-02, STATS-03, STATS-04
**Success Criteria** (what must be TRUE):

  1. The dashboard displays a "Total reviewed" chip showing all-time count and this-week count, computed from `CardProgress` records for the authenticated user
  2. The dashboard displays a "Retention rate" chip showing the percentage of ratings >= Good in the last 30 days from `ReviewLog`; when no review history exists, the chip shows an explicit empty state (e.g., "No data yet") rather than 0% or an error
  3. The dashboard displays a "Difficulty breakdown" chip showing Easy / Good / Hard / Again counts from `ReviewLog`; when no review history exists, the chip shows an explicit empty state
  4. The dashboard displays a per-deck progress section listing each deck with its due count, mastered count (interval >= 21 AND repetitions >= 3), and in-learning count; decks with no cards show zero counts rather than disappearing
  5. The stats section loads in parallel with the existing dashboard study CTA — a stats fetch failure produces a silent empty state, never a blank dashboard

**Plans**: TBD
**UI hint**: yes

### Phase 16: Import Update Feature

**Goal**: Users can update an existing deck in place by uploading a new `.kartex` file, with a preview of the diff before committing and control over removed cards
**Depends on**: Phase 14 (Card.kartexId column and parser id: field required for card matching)
**Requirements**: IMP-01, IMP-02, IMP-03, IMP-04, IMP-05, IMP-06
**Success Criteria** (what must be TRUE):

  1. The Deck Detail page (owner view only) shows an "Update from file" button; clicking it opens a file picker that accepts `.kartex` files
  2. After selecting a file, a preview modal appears showing the diff counts (X added / Y updated / Z unchanged / W removed) before any changes are committed to the database
  3. Cards matched by `kartexId` between the file and the existing deck have their front/back content and tags updated; their `CardProgress` records (SM-2 state) are untouched
  4. Cards present in the uploaded file but absent from the deck are created as new cards in the deck
  5. Cards present in the deck but absent from the file are listed as "removed" in the preview; with the "Keep removed cards" toggle on (default), those cards remain in the deck after apply; with the toggle off, they are deleted
  6. The apply operation executes as a single Prisma interactive transaction — a failure at any step leaves the deck unchanged (no partial updates)

**Plans**: TBD
**UI hint**: yes

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & Auth | v1.0 | 3/3 | Complete | 2026-05-26 |
| 2. Deck & Card Management | v1.0 | 3/3 | Complete | 2026-05-26 |
| 3. Rich Content Rendering | v1.0 | 3/3 | Complete | 2026-05-27 |
| 4. Study Loops | v1.0 | 3/3 | Complete | 2026-05-28 |
| 5. Import Pipeline | v1.0 | 3/3 | Complete | 2026-05-28 |
| 6. Sharing, Explore & Production Deploy | v1.0 | 3/3 | Complete | 2026-05-29 |
| 7. App Shell | v1.1 | 1/1 | Complete | 2026-05-31 |
| 8. Study UX | v1.1 | 4/4 | Complete | 2026-06-01 |
| 9. Internationalization | v1.1 | 3/3 | Complete | 2026-06-01 |
| 10. Active Deck Rotation | v1.2 | 5/5 | Complete | 2026-06-02 |
| 11. SM-2 Preset Modes | v1.2 | 4/4 | Complete | 2026-06-03 |
| 12. PWA Shell | v1.2 | 4/4 | Complete | 2026-06-03 |
| 13. Documentation | v1.2 | 3/3 | Complete | 2026-06-04 |
| 14. Schema Foundation | v1.3.0 | 0/3 | Not started | - |
| 15. Stats Feature | v1.3.0 | 0/TBD | Not started | - |
| 16. Import Update Feature | v1.3.0 | 0/TBD | Not started | - |
