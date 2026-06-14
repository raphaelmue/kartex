# Roadmap: Kartex

## Milestones

- ✅ **v1.0 MVP** — Phases 1–6 (shipped 2026-05-30)
- ✅ **v1.1 Study Experience & Polish** — Phases 7–9 (shipped 2026-06-01)
- ✅ **v1.2 Study Control & PWA** — Phases 10–13 (shipped 2026-06-04) — [archive](milestones/v1.2-ROADMAP.md)
- ✅ **v1.3.0 Stats & Import Update** — Phases 14–16 (shipped 2026-06-11) — [archive](milestones/v1.3.0-ROADMAP.md)
- ✅ **v1.3.1 Bug Fixes & Mobile Polish** — Phases 17–18 (shipped 2026-06-12) — [archive](milestones/v1.3.1-ROADMAP.md)
- 🔄 **v1.3.2 UX Polish & Changelog** — Phases 19–22 (in progress)

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

<details>
<summary>✅ v1.3.0 Stats & Import Update (Phases 14–16) — SHIPPED 2026-06-11</summary>

- [x] Phase 14: Schema Foundation (3/3 plans) — completed 2026-06-09
- [x] Phase 15: Stats Feature (3/3 plans) — completed 2026-06-10
- [x] Phase 16: Import Update Feature (4/4 plans) — completed 2026-06-11

Full details: [.planning/milestones/v1.3.0-ROADMAP.md](milestones/v1.3.0-ROADMAP.md)

</details>

<details>
<summary>✅ v1.3.1 Bug Fixes & Mobile Polish (Phases 17–18) — SHIPPED 2026-06-12</summary>

- [x] Phase 17: Mobile UI Polish (2/2 plans) — completed 2026-06-11
- [x] Phase 18: Library Deck Toggle (2/2 plans) — completed 2026-06-12

Full details: [.planning/milestones/v1.3.1-ROADMAP.md](milestones/v1.3.1-ROADMAP.md)

</details>

### v1.3.2 UX Polish & Changelog

- [x] **Phase 19: Library Remove Action** - User can permanently remove a public/shared deck from their personal library (completed 2026-06-13)
- [x] **Phase 20: Logo & PWA Icons** - New "K" on learning-card motif SVG replaces the existing logo; PWA icons regenerated (completed 2026-06-14)
- [x] **Phase 21: Changelog** - CHANGELOG.md backfilled for all past milestones with structured, user-facing entries (completed 2026-06-14)
- [ ] **Phase 22: Study Session UX** - Deck badge on study cards + verify/fix cross-deck shuffle

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

### Phase 19: Library Remove Action

**Goal**: Users can permanently remove a public/shared deck from their personal library, ending its effect on their study queue
**Depends on**: Phase 18 (DeckShare.isActive field and library toggle infrastructure)
**Requirements**: LIB-02
**Success Criteria** (what must be TRUE):

  1. On the Explore page, a library deck (one the user has already added) shows a "Remove from library" action alongside the existing active/inactive toggle
  2. Confirming the remove action deletes the DeckShare row for that user; the deck no longer appears in the user's library view after the page updates
  3. The removed deck disappears from the /study queue immediately — due cards from that deck are no longer surfaced in any study session
  4. Removing a deck from the library does not affect other users' library entries or the deck owner's deck

**Plans**: 1 plan
Plans:

- [x] 19-01-PLAN.md — Backend DELETE /api/decks/:id/library route + i18n keys + DecksPage library-card remove UI (dropdown, AlertDialog, optimistic removal)

> Note: per CONTEXT D-01/D-02 the remove action lives on the Decks page library-deck cards (⋮ menu), not the Explore page. Success criterion 1 (Explore-page placement) is superseded by D-01; criteria 2–4 are unchanged.
**UI hint**: yes

### Phase 20: Logo & PWA Icons

**Goal**: The app displays a new "K" on learning-card motif SVG in the header and browser tab, with PWA icons regenerated to match
**Depends on**: Phase 19 (no technical dependency — ordered for logical milestone flow)
**Requirements**: BRAND-01, BRAND-02
**Success Criteria** (what must be TRUE):

  1. The AppShell header displays the new SVG logo featuring a stylised "K" on a learning-card motif; the old placeholder logo is no longer visible
  2. The browser tab favicon reflects the new logo design
  3. Installing the app as a PWA shows the new logo in the home screen icon (192×192) and splash screen icon (512×512 maskable); the apple-touch-icon (180×180) also uses the new design
  4. Running `@vite-pwa/assets-generator` with the new SVG source produces all required icon sizes without manual intervention

**Plans**: 1

- [x] 20-01-PLAN.md — Replace logo.svg (K-on-card motif) + update AppShell brand areas + regenerate PWA icons

**UI hint**: yes

### Phase 21: Changelog

**Goal**: Every shipped release has a durable, human-readable record at the repo root that any user or contributor can read without accessing git history
**Depends on**: Phase 20 (CHANGELOG.md covers v1.3.2 which is complete only after Phase 20)
**Requirements**: CHNG-01, CHNG-02
**Success Criteria** (what must be TRUE):

  1. CHANGELOG.md exists at the repo root and contains a versioned entry for each past milestone: v1.0, v1.1, v1.2, v1.3.0, v1.3.1, and v1.3.2
  2. Each version entry lists user-facing change summary bullets that describe what changed from the user's perspective (not implementation details)
  3. Each version entry lists the requirement IDs that were satisfied (e.g. LIB-01, MOB-01)
  4. Each version entry includes a "Breaking Changes" section (populated or explicitly "None") and a "Migration Notes" section covering DB migrations and env var changes (populated or explicitly "None")

**Plans**: 1 plan

Plans:
- [ ] 21-01-PLAN.md — Write CHANGELOG.md at repo root with six milestone entries (v1.0–v1.3.2), each with user-facing bullets, requirement IDs, Breaking Changes, and Migration Notes

### Phase 22: Study Session UX

**Goal**: Study cards show which deck they belong to; cross-deck shuffle confirmed correct
**Depends on**: Phase 21 (no technical dependency — ordered for logical milestone completion)
**Requirements**: STUDY-04, STUDY-05
**Success Criteria** (what must be TRUE):

  1. During any study session (global SR or deck-specific), each card displays a badge showing the source deck name — visible on both front and back of the card
  2. The badge visual style is consistent with the existing study mode badge (e.g. "Intensive") — same placement area, same design language
  3. The global /study session verifiably shuffles cards across all active decks; a session with cards from 3 decks will show a mixed sequence, not deck-grouped blocks
  4. If a shuffle bug is found (cards ordered per-deck), it is fixed; if the current implementation is correct, it is confirmed by runtime test and the requirement is closed

**Plans**: TBD
**UI hint**: yes

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
| 14. Schema Foundation | v1.3.0 | 3/3 | Complete | 2026-06-09 |
| 15. Stats Feature | v1.3.0 | 3/3 | Complete | 2026-06-10 |
| 16. Import Update Feature | v1.3.0 | 4/4 | Complete | 2026-06-10 |
| 17. Mobile UI Polish | v1.3.1 | 2/2 | Complete | 2026-06-11 |
| 18. Library Deck Toggle | v1.3.1 | 2/2 | Complete | 2026-06-12 |
| 19. Library Remove Action | v1.3.2 | 1/1 | Complete   | 2026-06-13 |
| 20. Logo & PWA Icons | v1.3.2 | 1/1 | Complete   | 2026-06-14 |
| 21. Changelog | v1.3.2 | 1/1 | Complete | 2026-06-14 |
| 22. Study Session UX | v1.3.2 | 0/? | Not started | - |
