# Roadmap: Kartex

## Milestones

- ✅ **v1.0 MVP** — Phases 1–6 (shipped 2026-05-30)
- ✅ **v1.1 Study Experience & Polish** — Phases 7–9 (shipped 2026-06-01)

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

### v1.1 Study Experience & Polish (Phases 7–9)

- [x] **Phase 7: App Shell** - Mobile sidebar collapse, overlay drawer, and app footer — completed 2026-05-31
- [x] **Phase 8: Study UX** - Tag filter, session size picker, and shuffle for study sessions — completed 2026-05-31
- [x] **Phase 9: Internationalization** - react-i18next setup, string externalization, and language switcher — completed 2026-06-01

---

## Phase Details

### Phase 7: App Shell

**Goal**: The app shell works correctly on all screen sizes and carries attribution
**Depends on**: Phase 6 (v1.0 complete)
**Requirements**: SHELL-01, SHELL-02, SHELL-03
**Success Criteria** (what must be TRUE):

  1. On a screen narrower than 768px, the sidebar is hidden by default and a hamburger button is visible
  2. Tapping the hamburger opens the sidebar as an overlay drawer without pushing page content
  3. The app footer is visible on every page, showing the version number, copyright, and any configured links

**Plans**: 1 plan

Plans:

- [x] 07-01-PLAN.md — Test stub (Wave 0) + Vite version injection + AppShell responsive implementation (mobile topbar, overlay drawer, footer) — completed 2026-05-31

**UI hint**: yes

### Phase 8: Study UX

**Goal**: Users can target exactly what they want to study before starting a session
**Depends on**: Phase 7
**Requirements**: STUDY-01, STUDY-02, STUDY-03, STUDY-04
**Success Criteria** (what must be TRUE):

  1. Before starting a study session, the user can select one or more tags to limit which cards appear
  2. Before starting a session, the user can choose a card count: All due, 10, 20, or a custom number
  3. Cards within a session are always presented in a shuffled (random) order
  4. On the deck detail page, cards are grouped under their tag headers, with untagged cards listed under "Untagged"

**Plans**: 3 plans

Plans:

- [x] 08-01-PLAN.md — Wave 0: Failing test stubs for STUDY-01/02/03 (StudySessionPage) and STUDY-04 (DeckDetailPage) — completed 2026-05-31
- [x] 08-02-PLAN.md — Wave 1: Implement tag filter + session size picker + shuffle in StudySessionPage.tsx (STUDY-01, STUDY-02, STUDY-03) — completed 2026-05-31
- [x] 08-03-PLAN.md — Wave 2: Implement tag-sectioned layout in DeckDetailPage.tsx (STUDY-04) + full verification gate — completed 2026-05-31

**UI hint**: yes

### Phase 9: Internationalization

**Goal**: The app UI is fully translatable and users can switch language at runtime
**Depends on**: Phase 8
**Requirements**: I18N-01, I18N-02, I18N-03
**Success Criteria** (what must be TRUE):

  1. The frontend uses react-i18next and locale JSON files exist under `apps/frontend/src/locales/`
  2. Every visible UI string in the app renders via a `t()` call — no hardcoded English strings remain in JSX
  3. A language selector control is accessible in the UI, and switching language updates all strings immediately without a page reload

**Plans**: 3 plans
Plans:
**Wave 1**

- [x] 09-01-PLAN.md — Wave 1: i18n infrastructure (packages, en/de locales, i18n.ts, type augmentation, test setup, failing LanguageToggle stub) — completed 2026-06-01

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 09-02-PLAN.md — Wave 2: AppShell + language toggle + shared components + modals string wrapping — completed 2026-06-01

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 09-03-PLAN.md — Wave 3: all 9 page files string wrapping + phase verification gate — completed 2026-06-01

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
| 8. Study UX | v1.1 | 3/3 | Complete | 2026-05-31 |
| 9. Internationalization | v1.1 | 3/3 | Complete | 2026-06-01 |
