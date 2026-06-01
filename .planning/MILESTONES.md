# Milestones: Kartex

## v1.0 MVP — Shipped 2026-05-30

**Phases:** 1–6 | **Plans:** 18 | **Timeline:** 5 days (2026-05-25 → 2026-05-30)
**Files:** 226 changed, 47,598 insertions | **TypeScript LOC:** 8,135
**Known deferred items at close:** 4 (see STATE.md Deferred Items)

### Delivered

A fully self-hosted flashcard application with SM-2 spaced repetition, deployable via Docker Compose. Users can register via invite code, create decks, author rich multimedia cards (KaTeX math, Typst WASM, images, audio, video, code), study with spaced repetition across session modes, import `.kartex` files, and share decks publicly or with specific users.

### Key Accomplishments

1. Fully deployable Docker Compose stack with JWT auth, invite codes, and admin panel
2. Complete deck/card CRUD with Markdown rendering and tag support
3. Rich multimedia rendering — KaTeX math, Typst WASM, images, audio, external video, syntax highlighting
4. SM-2 spaced repetition engine with deck mode, exam mode, and dashboard stats/streak
5. `.kartex` import pipeline — YAML parser, zip bundle support, 4-state preview UI, media extraction
6. Deck sharing (READ/EDIT grants), /explore page, fork, GitHub Actions CI, production Docker Compose

### Archive

- Roadmap: [.planning/milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- Requirements: [.planning/milestones/v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md)

---

## v1.1 Study Experience & Polish — Shipped 2026-06-01

**Phases:** 7–9 | **Plans:** 8 | **Timeline:** 2 days (2026-05-31 → 2026-06-01)
**Files:** 46 changed, 2,854 insertions, 486 deletions | **TypeScript LOC:** ~9,531

### Delivered

Mobile-responsive app shell with hamburger overlay drawer and footer, tag-based study session filtering with OR logic, session size picker, always-shuffle, DeckDetailPage flat table with tag filter chip bar, and full react-i18next internationalization (254 en/de keys, all 9 pages and shared components translated with runtime language switching).

### Key Accomplishments

1. Responsive AppShell with CSS-transform overlay drawer (200ms slide), hamburger topbar, and sticky footer with build-time version injection (SHELL-01/02/03)
2. Tag-based multi-select study filter (OR logic) + session size picker (All/10/20/custom) + always-shuffle (STUDY-01/02/03)
3. DeckDetailPage flat table with tag filter chip bar — UAT gap closure (08-04) replaced h3-grouped layout (STUDY-04)
4. react-i18next setup with 254-key en/de locale parity, LanguageToggle button, all pages and shared components translated (I18N-01/02/03)

### Archive

- Roadmap: [.planning/milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)
- Requirements: [.planning/milestones/v1.1-REQUIREMENTS.md](milestones/v1.1-REQUIREMENTS.md)
