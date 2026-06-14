# Changelog

All notable changes to Kartex are documented in this file.
This project adheres to [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

---

## [v1.3.2] — 2026-06-14

*Milestone: UX Polish & Changelog (Phases 19–22)*

### Added

<!-- TODO Phase 22: add STUDY-04 and STUDY-05 bullets here -->
- New app logo: a stylised "K" on a learning-card motif SVG, visible in the sidebar header and browser tab favicon
- PWA icons regenerated from the new logo: home screen icon (192×192), splash screen icon (512×512 maskable), and Apple touch icon (180×180)
- User can permanently remove a public or shared deck from their personal library via the "⋮" menu on the Decks page; the deck disappears from the library view and no longer affects the study queue; removal does not affect other users

### Requirement IDs

LIB-02, BRAND-01, BRAND-02, CHNG-01, CHNG-02 (STUDY-04, STUDY-05 to be added after Phase 22 completes)

### Breaking Changes

None

### Migration Notes

**DB migrations:** None.
**Env var changes:** None.

---

## [v1.3.1] — 2026-06-12

*Milestone: Bug Fixes & Mobile Polish (Phases 17–18)*

### Added

- Library deck toggle: decks added from the Explore page now show an active/inactive toggle on the Decks page, identical to the owned-deck toggle; the study queue respects each user's individual toggle state independently of the deck owner's setting

### Fixed

- Mobile viewport (375px): stats table no longer overflows — table scrolls horizontally within its container; the app layout no longer expands the page width due to the always-in-DOM overlay drawer
- Deck card action buttons (Edit/Delete) are now in a "⋮" dropdown menu — fully contained within the card boundary at all viewport sizes (375px through 1280px)

### Requirement IDs

MOB-01, DECK-05, LIB-01

### Breaking Changes

None

### Migration Notes

**DB migrations:** One new column added — `DeckShare.isActive` (boolean, default true). This is an append-only addition with a default value; all existing library entries remain active after upgrade. Applied automatically on `docker compose up`.
**Env var changes:** None.

---

## [v1.3.0] — 2026-06-11

*Milestone: Stats & Import Update (Phases 14–16)*

### Added

- Dashboard now displays four learning statistics panels: total cards reviewed (all-time and this week), retention rate for the last 30 days (percentage of Good or better ratings), difficulty breakdown (Easy/Good/Hard/Again counts), and per-deck progress summary (due / mastered / in-learning counts)
- Statistics panels show an appropriate "No data yet" empty state until enough review history accumulates; mastered threshold is interval ≥ 21 days and repetitions ≥ 3
- Every card rating is now logged to a persistent review history — provides the data foundation for all current and future statistics
- Deck detail page now shows an "Update from file" button (deck owners only): upload a `.kartex` file to update an existing deck in place
- Deck update preview modal shows an exact diff (added / updated / unchanged / removed card counts) before committing any changes
- Cards are matched by a stable identity field — content is refreshed while all spaced-repetition progress is preserved
- New cards in the uploaded file are added automatically; cards present in the deck but absent in the file are shown as "removed" in the preview
- "Keep removed cards" toggle on the apply dialog: on by default — removed cards are kept unless explicitly opted out
- `.kartex` format now accepts an optional `id:` field per card block for stable card identity; existing `.kartex` files without `id:` continue to import normally (backward compatible)
- Study card back content is now scrollable when it overflows the card height, preventing text from being cut off during long study sessions

### Requirement IDs

STATS-01, STATS-02, STATS-03, STATS-04, STATS-05, IMP-01, IMP-02, IMP-03, IMP-04, IMP-05, IMP-06, IMP-07

### Breaking Changes

None

### Migration Notes

**DB migrations:** One new table and one new column added — a `ReviewLog` table (recording each rating with user, card, deck, rating, and timestamp) and a `kartexId` column on the Card table (stable identifier per deck, nullable, unique per deck). Both are append-only additions; existing data is unaffected. Applied automatically on `docker compose up`.
**Env var changes:** None.

---

## [v1.2] — 2026-06-04

*Milestone: Study Control & PWA (Phases 10–13)*

### Added

- Toggle any deck active or inactive: inactive decks are excluded from the global study queue entirely
- Study start screen with per-session deck picker (pre-checked active decks; uncheck any for this session only without changing the persisted active state) and session size picker
- Study mode selector on the Settings page: Normal (default SM-2 intervals), Intensive (intervals halved), or Exam Prep (intervals quartered) — stored per user, enforced server-side on every rating
- Current study mode shown as a badge inside every study session
- App is installable as a Progressive Web App (PWA): "Add to Home Screen" prompt on Android/iOS/desktop; app shell cached for fast repeat loads
- Service worker caches static assets for instant shell on repeat visits; API calls always go to the network (no stale card data)
- `README.md` at the repo root with project overview, tech stack, Docker Compose quick-start, and doc links
- Project documentation updated to reflect the current tech stack and architecture

### Changed

- Settings page now contains the study mode selector (previously showed a Coming Soon placeholder)
- Production server now sends the correct Cross-Origin isolation headers required for Typst WASM to function correctly

### Requirement IDs

DECK-01, DECK-02, DECK-03, DECK-04, SM2-01, SM2-02, SM2-03, SM2-04, PWA-01, PWA-02, PWA-03, PWA-04, PWA-05, DOCS-01, DOCS-02, DOCS-03

### Breaking Changes

None — active/inactive toggles default to active, so all existing decks remain in the study queue after upgrade.

### Migration Notes

**DB migrations:** Two new columns added — `isActive` on the Deck table (boolean, default true) and `studyMode` on the User table (text, default 'NORMAL'). Both are append-only with safe defaults; existing rows are automatically set to active / Normal mode with no data loss. Applied automatically on `docker compose up`.
**Env var changes:** None.

---

## [v1.1] — 2026-06-01

*Milestone: Study Experience & Polish (Phases 7–9)*

### Added

- Tag-based study session filter: select one or more tags before starting a session to study only matching cards (OR logic)
- Session size picker: choose All due / 10 / 20 / custom number of cards before starting any session
- Cards in every study session are always shuffled — no longer sequentially ordered
- Mobile-responsive app shell: sidebar collapses on small screens with a hamburger toggle and smooth overlay drawer
- App footer on every page showing build version, copyright, and GitHub/Docs links
- Internationalization (i18n): all UI strings available in English and German; language switchable at runtime via a language selector in the Settings area
- Deck detail page shows a flat card table with tag filter chip bar — filter cards by tag without leaving the page
- Dark mode toggle in application settings (light/dark theme switcher)

### Changed

- Language switcher moved to the Settings page

### Requirement IDs

STUDY-01, STUDY-02, STUDY-03, SHELL-01, SHELL-02, SHELL-03, I18N-01, I18N-02, I18N-03

### Breaking Changes

None

### Migration Notes

**DB migrations:** None — v1.1 is a pure frontend/UX release with no schema changes.
**Env var changes:** None.

---

## [v1.0] — 2026-05-30

*Milestone: MVP (Phases 1–6)*

### Added

- Invite-code-only registration; admin can generate and manage invite codes
- JWT-authenticated login with transparent token refresh (15-min access token + 30-day refresh, stored in secure httpOnly cookies)
- Admin panel for managing user roles and account status
- Create, edit, and delete decks with title, description, and privacy settings (private / shared / public)
- Create, edit, and delete flashcards with front/back content and freeform tags
- Rich card content rendering: Markdown, inline math, block math, Typst expression blocks, images, audio, external video (YouTube/Vimeo), and syntax-highlighted code
- Image (PNG/JPEG/WebP/GIF) and audio (MP3/OGG/WAV) upload to local storage; validated by type and configurable maximum size
- Spaced repetition study sessions (SM-2 algorithm): due cards across all owned decks, shuffled
- Deck-mode sessions (all cards in one deck) and exam-mode sessions (time limit, progress not saved)
- After each card, rate recall: Again / Hard / Good / Easy; SM-2 updates interval, ease factor, and next review date
- Dashboard showing all cards due today (per-deck counts) and study statistics (today reviewed, current streak)
- Upload a `.kartex` file or `.kartex.zip` bundle, preview parsed cards, then import as a new deck
- Share a deck with specific users (READ or EDIT permission) or make it public
- Browse public decks on the Explore page; fork any public or shared deck into your own collection
- Each user's spaced-repetition progress is stored independently; forked decks start fresh for each user
- Full Docker Compose deployment (backend + PostgreSQL 16 + media volume); GitHub Actions CI pipeline

### Requirement IDs

AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, ADMN-01, ADMN-02, ADMN-03, DECK-01, DECK-02, DECK-03, DECK-04, DECK-05, CARD-01, CARD-02, CARD-03, CARD-04, CARD-05, CARD-06, CARD-07, CARD-08, CARD-09, CARD-10, CARD-11, CARD-12, STDY-01, STDY-02, STDY-03, STDY-04, STDY-05, STDY-06, STDY-07, IMPT-01, IMPT-02, IMPT-03, IMPT-04, IMPT-05, MDIA-01, MDIA-02, MDIA-03, MDIA-04, SHAR-01, SHAR-02, SHAR-03, SHAR-04, SHAR-05, SHAR-06, INFR-01, INFR-02, INFR-03, INFR-04, INFR-05, INFR-06

### Breaking Changes

None (initial release)

### Migration Notes

**DB migrations:** Full initial schema applied automatically on first run via `docker compose up`.
**Env var changes:** Required env vars: `JWT_SECRET`, `DB_PASSWORD`. Optional: `MAX_UPLOAD_SIZE_MB` (default 10), `STORAGE_PATH`.
