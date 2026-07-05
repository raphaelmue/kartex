# Milestones: Kartex

## v1.4.0 Auth Overhaul & Study UX — Shipped 2026-07-05

**Phases:** 23–30 (8 phases) | **Plans:** 32 | **Tasks:** 49 | **Timeline:** 14 days (2026-06-21 → 2026-07-05)
**Files:** 187 changed, +26,102/-1,134 lines | **TypeScript LOC:** 19,221
**Requirements:** 31/31 checked off | **Known verification overrides:** 3 (see STATE.md Deferred Items)

### Delivered

Replaced invite-code-only registration with a full email-based auth stack (SMTP invitations, self-service password reset, admin user management), added inline ABC notation rendering, `.kartex.zip` deck updates, quick-edit-in-study, and study session timers/stats.

### Key Accomplishments

1. Email-based auth overhaul — SMTP-backed invitations replace invite codes, self-service + admin email management (Phases 23, 24, 29)
2. Self-service password reset with no-enumeration protection and admin-triggered reset for any user (Phase 25)
3. Admin user management — two-step confirm hard-delete with cascade-safe transaction and last-admin/self-delete guards (Phase 23)
4. Inline ABC notation rendering — `#abc` blocks render as responsive SVG sheet music via abcjs (Phase 26)
5. `.kartex.zip` deck update support with media validation and SM-2 progress preservation (Phase 27)
6. Quick-edit in study mode + session timers & stats — thinking-time capture, session lifecycle tracking, Recent Sessions dashboard (Phases 28, 30)

### Archive

- [v1.4.0 Roadmap](milestones/v1.4.0-ROADMAP.md)
- [v1.4.0 Requirements](milestones/v1.4.0-REQUIREMENTS.md)

---

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

---

## v1.2 Study Control & PWA — Shipped 2026-06-04

**Phases:** 10–13 | **Plans:** 16 | **Timeline:** 5 days (2026-06-02 → 2026-06-06)
**UAT:** 6/6 passed (Phase 12 human verification 2026-06-06)

### Delivered

Active deck rotation with per-session overrides, SM-2 preset study modes enforced server-side (Normal/Intensive/Exam Prep), PWA shell with service worker, cross-origin isolation headers, and complete project documentation (README, design.md, kartex-format.md).

### Key Accomplishments

1. isActive toggle on DecksPage + DeckDetailPage with optimistic update; server-side deckFilter enforces exclusion (DECK-01/02)
2. /study start screen with pre-checked deck picker (session-only uncheck) + session size picker All/10/20/custom (DECK-03/04)
3. SettingsPage SM-2 mode selector (Normal/Intensive/Exam Prep); server-side STUDY_MODE_MULTIPLIERS applied post-calculateSM2 to nextReview only; raw CardProgress.interval never modified (SM2-01–04)
4. vite-plugin-pwa + manifest.webmanifest (192×192+512×512 icons); SW precaches JS/CSS/HTML (WASM excluded); NetworkOnly for /api/* (PWA-01/02/03)
5. COEP/COOP headers via Hono secureHeaders step 0; sw.js + workbox served with Cache-Control: no-store (PWA-04/05)
6. README.md at repo root + docs/design.md and docs/kartex-format.md refreshed and verified accurate (DOCS-01/02/03)

### Archive

- Roadmap: [.planning/milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md)
- Requirements: [.planning/milestones/v1.2-REQUIREMENTS.md](milestones/v1.2-REQUIREMENTS.md)

---

## v1.3.0 Stats & Import Update — Shipped 2026-06-11

**Phases:** 14–16 | **Plans:** 10 | **Timeline:** 2 days (2026-06-09 → 2026-06-11)
**Audit:** 12/12 requirements satisfied (tech_debt only — no blockers)

### Delivered

Learning statistics surfaced on the dashboard — total cards reviewed, retention rate (last 30 days), difficulty breakdown (Easy/Good/Hard/Again), and per-deck progress (due/mastered/in-learning). Deck update-via-import: upload a `.kartex` file from the Deck Detail page to update cards in place. SM-2 progress is preserved for matched cards; new cards are added; removed cards are controlled via a keepRemoved toggle. All mutations run as a single `prisma.$transaction`.

### Key Accomplishments

1. `ReviewLog` table + `Card.kartexId` field via hand-written migration; every rating writes a `ReviewLog` row inside the existing rate transaction (STATS-05, IMP-07)
2. Parser `id:` field support — `.kartex` format accepts optional stable card IDs; backward compatible (IMP-07)
3. `GET /api/stats/summary` — retention rate, difficulty breakdown, per-deck progress; all queries scoped by `userId` compound index (STATS-02/03/04)
4. StatsSummaryPanel on DashboardPage — 4 stat chips with "No data yet" empty state; decoupled loading from dashboard hero (STATS-01/02/03/04)
5. `/api/decks/:id/import/preview` — stateless diff (added/updated/unchanged/removed) re-computed server-side; prevents TOCTOU (IMP-01/02/03)
6. `/api/decks/:id/import/apply` — atomic `prisma.$transaction` with keepRemoved toggle; SM-2 progress untouched for matched cards (IMP-04/05/06)

### Archive

- Roadmap: [.planning/milestones/v1.3.0-ROADMAP.md](milestones/v1.3.0-ROADMAP.md)
- Requirements: [.planning/milestones/v1.3.0-REQUIREMENTS.md](milestones/v1.3.0-REQUIREMENTS.md)

---

## v1.3.1 Bug Fixes & Mobile Polish — Shipped 2026-06-12

**Phases:** 17–18 | **Plans:** 4 | **Tasks:** 10 | **Timeline:** 1 day (2026-06-11 → 2026-06-12)
**Files:** 16 changed, 1,317 insertions, 23 deletions
**Requirements:** 3/3 satisfied — MOB-01, DECK-05, LIB-01

### Delivered

Mobile viewport rendering fixed (375px no-overflow), deck card action buttons restructured to ⋮ DropdownMenu + shared AlertDialog (buttons contained at all viewports), and library deck active/inactive toggle added so users can control whether public/shared decks from the Explore page appear in their study queue.

### Key Accomplishments

1. `overflow-x-auto` on per-deck stats Table + `overflow-x-hidden` on AppShell `<main>` — fixes 375px mobile horizontal overflow from stats table and always-in-DOM drawer (MOB-01)
2. ⋮ DropdownMenu (shadcn) + shared AlertDialog outside map loop replaces inline Edit/Delete buttons in DecksPage — deck card buttons fully contained at all viewport sizes (DECK-05)
3. `DeckShare.isActive` schema field + hand-written migration + PATCH `/api/decks/:id/library` endpoint + study queue filter fix — library deck per-user activation state (LIB-01 backend)
4. `handleToggleLibraryActive` optimistic-update handler + library Switch in CardFooter + LIB-01 test coverage (4 passing tests) — library deck toggle fully wired (LIB-01 frontend)

### Archive

- Roadmap: [.planning/milestones/v1.3.1-ROADMAP.md](milestones/v1.3.1-ROADMAP.md)
- Requirements: [.planning/milestones/v1.3.1-REQUIREMENTS.md](milestones/v1.3.1-REQUIREMENTS.md)

---

## v1.3.2 UX Polish & Changelog — Shipped 2026-06-15

**Phases:** 19–22 | **Plans:** 5 | **Timeline:** 3 days (2026-06-13 → 2026-06-15)
**Requirements:** 7/7 satisfied — LIB-02, BRAND-01, BRAND-02, CHNG-01, CHNG-02, STUDY-04, STUDY-05

### Delivered

Library deck removal (users can permanently remove public/shared decks from their library), new K-on-card SVG logo with regenerated PWA icons, CHANGELOG.md backfilled for all past milestones (v1.0–v1.3.2) in Keep a Changelog format, deck badge in study sessions showing source deck on every card, and statistical verification of cross-deck shuffle correctness.

### Key Accomplishments

1. DELETE /api/decks/:id/library with IDOR guard + AlertDialog confirmation UI in DecksPage ⋮ menu — library deck permanently removable without affecting other users' library entries (LIB-02)
2. K-on-card SVG logo (rect+polygon, no text element) replacing placeholder; both AppShell brand areas updated; 8 PWA icon files regenerated via sharp@0.35.1 (BRAND-01/02)
3. CHANGELOG.md at repo root — 6 version entries (v1.0–v1.3.2) with user-facing bullets, Requirement IDs, Breaking Changes, and Migration Notes in Keep a Changelog v1.1.0 format (CHNG-01/02)
4. Unconditional deck badge in SessionRunner progress row — renders currentCard.deckTitle on both card faces throughout any session type (STUDY-04)
5. Fisher-Yates shuffle extracted to lib/shuffle.ts; 1000-run statistical test confirms >95% cross-deck mixing — STUDY-05 closed without a bug fix (STUDY-05)

### Archive

- Roadmap: [.planning/milestones/v1.3.2-ROADMAP.md](milestones/v1.3.2-ROADMAP.md)
- Requirements: [.planning/milestones/v1.3.2-REQUIREMENTS.md](milestones/v1.3.2-REQUIREMENTS.md)
