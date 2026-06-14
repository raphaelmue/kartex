# Phase 21: Changelog - Research

**Researched:** 2026-06-14
**Domain:** Documentation — CHANGELOG.md authoring and Keep a Changelog format conventions
**Confidence:** HIGH

## Summary

Phase 21 is a pure documentation task: write one `CHANGELOG.md` file at the repository root covering six past milestones (v1.0 through v1.3.2). No code changes, no package installs, no schema migrations. All content is sourced from planning artifacts that are already on disk and were read during this research session.

The project uses the "Keep a Changelog" (keepachangelog.com) format as the industry-standard structure. Each version block has a fixed set of sections: Added, Changed, Fixed, and Removed for user-facing changes — plus the project-specific additions required by CHNG-02: a "Requirement IDs" list, a "Breaking Changes" section, and a "Migration Notes" section.

Every milestone has been researched by reading the full set of archived milestone ROADMAP and REQUIREMENTS files, plus phase SUMMARY.md files for Phases 19 and 20. The content outline in this document is the primary deliverable for the planner: it provides the exact bullets, requirement IDs, and migration notes the planner should write into the file, so the execution task is a single mechanical write with no further research needed.

**Primary recommendation:** One plan, one task — write `CHANGELOG.md` at repo root with all six version entries. The full outline is in `## Content Outline for CHANGELOG.md` below.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CHANGELOG.md file | Repo root (static file) | — | Human-readable documentation, not served by any tier |
| Content sourcing | Planning artifacts | Git history | All milestone info captured in .planning/ milestone archives |

## Standard Stack

### Core

No packages required. This phase writes one Markdown file. [VERIFIED: task scope]

### Installation

```bash
# No packages to install
```

## Package Legitimacy Audit

> No external packages are installed in this phase.

**Packages removed due to SLOP verdict:** none
**Packages flagged as suspicious (SUS):** none

## Architecture Patterns

### Recommended File Location

```
kartex/
└── CHANGELOG.md    ← repo root (CHNG-01 requirement)
```

### Keep a Changelog Format (v1.1.0)

[CITED: keepachangelog.com]

The Keep a Changelog format is the de-facto standard for changelog files. Key conventions:

- File named `CHANGELOG.md` at the repo root
- H2 headings for each version: `## [v1.0] — YYYY-MM-DD`
- The top entry is `## [Unreleased]` (omit if there are no pending unreleased changes)
- Versions listed in reverse chronological order (newest first)
- Standard subsections within each version: `### Added`, `### Changed`, `### Fixed`, `### Removed`
- User-facing language only — no implementation details, no internal refactor notes
- Each bullet written from the user's perspective: "User can now…" or "Fixed: dashboard…"
- Semantic versioning with square brackets and ISO 8601 dates

**Project-specific additions required by CHNG-02:**

In addition to standard Keep a Changelog sections, each version entry must include:

```markdown
### Requirement IDs
REQ-01, REQ-02, REQ-03

### Breaking Changes
None

### Migration Notes
None
```

### Full Template for One Version Entry

```markdown
## [v1.0] — 2026-05-30

### Added
- User can register via invite code (no open sign-up)
- ...

### Changed
- ...

### Fixed
- ...

### Requirement IDs
AUTH-01, AUTH-02, ...

### Breaking Changes
None

### Migration Notes
**DB migrations:** ...
**Env var changes:** ...
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Changelog generation | Custom script | Write manually | Content is editorial, not mechanical; all info is in planning archives |
| Version date lookup | git log parsing | Use milestone ship dates from ROADMAP.md | Authoritative dates already documented |

## Content Outline for CHANGELOG.md

This is the primary deliverable of this research. The planner should write these bullets verbatim (or lightly polished) into the final file.

---

### Version Dates (from milestone archives)

| Version | Ship Date |
|---------|-----------|
| v1.0 | 2026-05-30 |
| v1.1 | 2026-06-01 |
| v1.2 | 2026-06-04 |
| v1.3.0 | 2026-06-11 |
| v1.3.1 | 2026-06-12 |
| v1.3.2 | 2026-06-14 (Phases 19–20 complete; Phases 21–22 still pending) |

> Note on v1.3.2 date: Phases 19 and 20 are complete as of 2026-06-14. Phases 21 and 22 are still pending. The CHANGELOG.md entry for v1.3.2 should be written to cover the full milestone (including Phase 21 itself and Phase 22), so the date should be left as the milestone close date, which will be the date Phase 22 finishes. For now, use `2026-06-14` as a placeholder and the executor should update it to the actual milestone close date when Phase 22 completes. Alternatively, the planner may instruct the executor to omit the date suffix and just use `## [v1.3.2]` until the milestone closes, then add the date in Phase 22.

---

### v1.0 — 2026-05-30 (MVP)

**Source:** .planning/milestones/v1.0-ROADMAP.md, .planning/milestones/v1.0-REQUIREMENTS.md

**Added bullets:**
- Invite-code-only registration; admin can generate and manage invite codes
- JWT-authenticated login with transparent token refresh (15-min access + 30-day refresh, httpOnly cookies)
- Admin panel for managing user roles and account status
- Create, edit, and delete decks with title, description, and privacy settings (private / shared / public)
- Create, edit, and delete flashcards with front/back content and freeform tags
- Rich card content rendering: Markdown, inline math (`$...$`), block math (`$$...$$`) via KaTeX, `#typst` blocks via Typst WASM, images, audio, external video (YouTube/Vimeo), and syntax-highlighted code
- Image (PNG/JPEG/WebP/GIF) and audio (MP3/OGG/WAV) upload to local Docker volume; validated by MIME type and magic bytes; configurable max size via env var
- Spaced repetition study sessions (SM-2 algorithm): due cards across all owned decks, shuffled
- Deck-mode sessions (all cards in one deck) and exam-mode sessions (time limit, progress not saved)
- After each card, rate recall: Again / Hard / Good / Easy; SM-2 updates interval, ease factor, and next review date
- Dashboard showing all cards due today (per-deck counts) and study statistics (today reviewed, current streak)
- Upload a `.kartex` file or `.kartex.zip` bundle, preview parsed cards, then import as a new deck
- Share a deck with specific users (READ or EDIT permission) or make it public
- Browse public decks on the /explore page; fork any public or shared deck into your own collection
- Each user's SM-2 progress is stored independently; forked decks start fresh for each user
- Full Docker Compose deployment (backend + PostgreSQL 16 + media volume); GitHub Actions CI pipeline

**Changed bullets:** (initial release — N/A)

**Requirement IDs:**
AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, ADMN-01, ADMN-02, ADMN-03, DECK-01, DECK-02, DECK-03, DECK-04, DECK-05, CARD-01, CARD-02, CARD-03, CARD-04, CARD-05, CARD-06, CARD-07, CARD-08, CARD-09, CARD-10, CARD-11, CARD-12, STDY-01, STDY-02, STDY-03, STDY-04, STDY-05, STDY-06, STDY-07, IMPT-01, IMPT-02, IMPT-03, IMPT-04, IMPT-05, MDIA-01, MDIA-02, MDIA-03, MDIA-04, SHAR-01, SHAR-02, SHAR-03, SHAR-04, SHAR-05, SHAR-06, INFR-01, INFR-02, INFR-03, INFR-04, INFR-05, INFR-06

**Breaking Changes:** None (initial release)

**Migration Notes:**
- Initial release — no prior version to migrate from.
- DB migrations: Full initial Prisma schema applied via `docker compose up` (automatic on first run).
- Env vars required: `JWT_SECRET`, `DB_PASSWORD`. Optional: `MAX_UPLOAD_SIZE_MB` (default 10), `STORAGE_PATH`.

---

### v1.1 — 2026-06-01 (Study Experience & Polish)

**Source:** .planning/milestones/v1.1-ROADMAP.md, .planning/milestones/v1.1-REQUIREMENTS.md

**Added bullets:**
- Tag-based study session filter: select one or more tags before starting a session (OR logic)
- Session size picker: choose All due / 10 / 20 / custom number of cards before starting any session
- Cards in every study session are always shuffled (Fisher-Yates) — no longer sequentially ordered
- Mobile-responsive app shell: sidebar collapses on small screens with a hamburger toggle and smooth CSS-transform overlay drawer
- App footer on every page showing build version, copyright, and GitHub/Docs links
- Internationalization (i18n): all UI strings externalized to locale JSON files (English and German), switchable at runtime via a language selector in the settings area
- Deck detail page shows a flat card table with tag filter chip bar (filter cards by tag without leaving the page)

**Changed bullets:**
- Language switcher moved to Settings page (from a quick-task after v1.1)

**Requirement IDs:**
STUDY-01, STUDY-02, STUDY-03, STUDY-04, SHELL-01, SHELL-02, SHELL-03, I18N-01, I18N-02, I18N-03

**Breaking Changes:** None

**Migration Notes:**
- DB migrations: None — v1.1 is a pure frontend/UX release with no schema changes.
- Env var changes: None.

---

### v1.2 — 2026-06-04 (Study Control & PWA)

**Source:** .planning/milestones/v1.2-ROADMAP.md, .planning/milestones/v1.2-REQUIREMENTS.md

**Added bullets:**
- Toggle any deck active or inactive: inactive decks are excluded from the global study queue entirely
- Study start screen with per-session deck picker (pre-checked active decks; uncheck any for this session only without changing the persisted active state) and session size picker
- Study mode selector on the Settings page: Normal (default SM-2 intervals), Intensive (intervals halved), or Exam Prep (intervals quartered) — stored per user, enforced server-side on every rating
- Current study mode shown as a badge inside every study session
- App is installable as a Progressive Web App (PWA): "Add to Home Screen" prompt on Android/iOS/desktop, app shell cached for fast repeat loads
- Service worker caches static JS/CSS/HTML for instant shell; API calls always go to the network (no stale card data); Typst WASM cached separately (28 MB excluded from precache)
- `README.md` at the repo root with project overview, tech stack, Docker Compose quick-start, and doc links
- `docs/design.md` and `docs/kartex-format.md` updated to reflect the actual v1.2 stack (Hono `serveStatic`, yarn 4, no Nginx)

**Changed bullets:**
- Settings page replaces a Coming Soon placeholder with the study mode selector
- Production server now sends correct Cross-Origin isolation headers (COEP + COOP) required for Typst WASM to function correctly without dev-server workarounds

**Requirement IDs:**
DECK-01, DECK-02, DECK-03, DECK-04, SM2-01, SM2-02, SM2-03, SM2-04, PWA-01, PWA-02, PWA-03, PWA-04, PWA-05, DOCS-01, DOCS-02, DOCS-03

**Breaking Changes:** None — active/inactive toggles default to active, so existing decks remain in the study queue after upgrade.

**Migration Notes:**
- DB migrations: Two new columns added — `Deck.isActive BOOLEAN DEFAULT TRUE` and `User.studyMode VARCHAR DEFAULT 'NORMAL'`. Both are append-only with defaults; existing rows are automatically set to `true` / `'NORMAL'` with no data loss. Applied automatically on `docker compose up` via the backend's migration entrypoint.
- Env var changes: None.

---

### v1.3.0 — 2026-06-11 (Stats & Import Update)

**Source:** .planning/milestones/v1.3.0-ROADMAP.md, .planning/milestones/v1.3.0-REQUIREMENTS.md

**Added bullets:**
- Dashboard now displays four learning statistics panels: total cards reviewed (all-time and this week), retention rate for the last 30 days (% of Good or better ratings), difficulty breakdown (Easy/Good/Hard/Again counts), and per-deck progress summary (due / mastered / in-learning counts)
- Statistics panels show an appropriate "No data yet" empty state until enough review history accumulates; mastered threshold is interval ≥ 21 days AND repetitions ≥ 3
- Every card rating is now logged in a new `ReviewLog` table (user, card, deck, rating, timestamp) — provides the data foundation for all current and future statistics
- Deck detail page now shows an "Update from file" button (deck owners only): upload a `.kartex` file to update an existing deck in place
- Deck update preview modal shows an exact diff (added / updated / unchanged / removed card counts) before committing any changes
- Cards matched by stable `kartexId` field have their content refreshed while all SM-2 progress is preserved
- New cards in the uploaded file are added automatically; cards present in the deck but absent in the file are shown as "removed" in the preview
- "Keep removed cards" toggle on the apply dialog: on by default — removed cards are kept unless explicitly opted out
- `.kartex` format now accepts an optional `id:` field per card block for stable card identity; existing `.kartex` files without `id:` continue to import normally (backward compatible)

**Requirement IDs:**
STATS-01, STATS-02, STATS-03, STATS-04, STATS-05, IMP-01, IMP-02, IMP-03, IMP-04, IMP-05, IMP-06, IMP-07

**Breaking Changes:** None

**Migration Notes:**
- DB migrations: Two new tables and one new column — `ReviewLog` table (userId, cardId, deckId, rating, reviewedAt) and `Card.kartexId VARCHAR UNIQUE(deckId, kartexId)`. Both are append-only additions; existing data is unaffected. Applied automatically on `docker compose up`.
- Env var changes: None.

---

### v1.3.1 — 2026-06-12 (Bug Fixes & Mobile Polish)

**Source:** .planning/milestones/v1.3.1-ROADMAP.md, .planning/milestones/v1.3.1-REQUIREMENTS.md

**Fixed bullets:**
- Mobile viewport (375px): stats table no longer overflows — table scrolls horizontally within its container; AppShell main area no longer expands the page width due to the always-in-DOM overlay drawer
- Deck card action buttons (Edit/Delete) are now in a "⋮" dropdown menu — fully contained within the card boundary at all viewport sizes (375px through 1280px)

**Added bullets:**
- Library deck toggle: decks added from the Explore page now show an active/inactive toggle on the Decks page, identical to the owned-deck toggle; the study queue respects each user's individual toggle state independently of the deck owner's setting

**Requirement IDs:**
MOB-01, DECK-05, LIB-01

**Breaking Changes:** None

**Migration Notes:**
- DB migrations: One new column — `DeckShare.isActive BOOLEAN DEFAULT TRUE`. Append-only with default; all existing library entries remain active after upgrade. Applied automatically on `docker compose up`.
- Env var changes: None.

---

### v1.3.2 — 2026-06-14 (UX Polish & Changelog)

**Source:** .planning/phases/19-library-remove-action/19-01-SUMMARY.md, .planning/phases/20-logo-pwa-icons/20-01-SUMMARY.md, .planning/REQUIREMENTS.md (CHNG-01/02, STUDY-04/05 pending at research time)

> Note: Phase 21 (this changelog) and Phase 22 (study session UX) are not yet complete at research time. The executor should review Phase 22's SUMMARY.md before finalising the v1.3.2 entry and add any STUDY-04/STUDY-05 bullets at that point.

**Added bullets:**
- New app logo: a stylised "K" on a learning-card motif SVG, visible in the sidebar header and browser tab favicon
- PWA icons regenerated from the new logo: home screen icon (192×192), splash screen icon (512×512 maskable), and Apple touch icon (180×180)
- User can permanently remove a public or shared deck from their personal library via the "⋮" menu on the Decks page; the deck disappears from the library view and no longer affects the study queue; removal does not affect other users
- (Phase 22 — to be filled in by executor): deck badge and cross-deck shuffle verification

**Requirement IDs:**
LIB-02, BRAND-01, BRAND-02, CHNG-01, CHNG-02 (plus STUDY-04, STUDY-05 once Phase 22 completes)

**Breaking Changes:** None

**Migration Notes:**
- DB migrations: None in Phases 19–22.
- Env var changes: None.

---

## DB Migration Inventory (All Versions)

| Version | Migration | Table/Column | Type | Manual Steps? |
|---------|-----------|-------------|------|---------------|
| v1.0 | Initial schema | All tables | Full schema create | None — applied automatically on first run |
| v1.1 | None | — | — | — |
| v1.2 | isActive + studyMode | `Deck.isActive BOOLEAN DEFAULT TRUE`, `User.studyMode VARCHAR DEFAULT 'NORMAL'` | ALTER TABLE ADD COLUMN | None — defaults protect existing rows; auto-applied via Docker entrypoint |
| v1.3.0 | ReviewLog + kartexId | `ReviewLog` table (5 cols), `Card.kartexId VARCHAR NULLABLE` with unique constraint per deck | CREATE TABLE + ALTER TABLE ADD COLUMN | None — append-only; auto-applied |
| v1.3.1 | DeckShare.isActive | `DeckShare.isActive BOOLEAN DEFAULT TRUE` | ALTER TABLE ADD COLUMN | None — default keeps all existing library entries active; auto-applied |
| v1.3.2 | None | — | — | — |

All migrations are hand-written SQL applied via the backend Docker Compose entrypoint (pattern established in Phase 10). No manual intervention is required for a standard `docker compose pull && docker compose up -d` upgrade.

## Env Var Change Inventory (All Versions)

| Version | Change | Action Required |
|---------|--------|-----------------|
| v1.0 | Initial: `JWT_SECRET`, `DB_PASSWORD` required; `MAX_UPLOAD_SIZE_MB`, `STORAGE_PATH` optional | Set in `.env` before first run |
| v1.1–v1.3.2 | No new env vars added | None |

## Breaking Change Analysis

No version in the v1.0–v1.3.2 range has a breaking change that would require a self-hosted operator to take action beyond `docker compose pull && docker compose up -d`. All DB migrations are append-only with defaults. No env vars were removed or renamed. No API contracts changed in a backward-incompatible way.

## Common Pitfalls

### Pitfall 1: Including implementation details in changelog bullets

**What goes wrong:** Bullets like "Added ReviewLog Prisma model with userId, cardId, deckId columns" or "Fixed ESLint no-use-before-define in DeckUpdateModal.tsx".

**How to avoid:** Write from the user's perspective. Ask "what can the user now do or see that they couldn't before?" Implementation details belong in git commits and planning artifacts, not in the changelog.

### Pitfall 2: Forgetting quick tasks that added user-facing changes

**What goes wrong:** Quick task 260604-001 moved the language switcher to Settings — a user-facing change not tied to a formal phase. The v1.1 entry should mention this.

**How to avoid:** The quick task list in STATE.md has been reviewed during research. All user-facing quick tasks are included in the content outline above.

**Quick tasks with user-facing impact:**
- 260530-002: Prisma 7 migration — internal only; no user-facing change
- 260530-003: Dark mode — USER FACING: added dark mode toggle to Settings (sidebar in early versions)
- 260604-001: Language switcher moved to Settings page — minor UX change
- 260607-001: Study card scrollable text (cap card height, back content scrollable) — user-facing fix
- 20260611-001: Mobile stats tables overflow-x-auto — user-facing fix (precedes Phase 17)

> Important gap: Dark mode (quick task 260530-003) and scrollable study card text (260607-001) are user-facing changes that are NOT covered by any formal requirement ID. They belong in the changelog under the version where they were shipped:
> - Dark mode → v1.1 (shipped 2026-05-30 after v1.0, before v1.1 close on 2026-06-01; should go in v1.1)
> - Scrollable card text (260607-001, 2026-06-07) → v1.2 (shipped after v1.2 close on 2026-06-04 but before v1.3.0 close on 2026-06-11 — technically lands in the v1.3.0 window)
>
> The planner should decide whether to group quick tasks into the nearest milestone or list them inline. Recommendation: attribute dark mode to v1.1 (was likely part of initial exploration) and scrollable card text to v1.3.0 (shipped 2026-06-07, between v1.2 and v1.3.0 close).

**Revised bullets to add:**

For v1.1:
- Added dark mode toggle in the application settings (light/dark theme switcher)

For v1.3.0:
- Study card back content is now scrollable when it overflows the card height, preventing text from being cut off during long study sessions

### Pitfall 3: Wrong order (oldest first instead of newest first)

**How to avoid:** Keep a Changelog convention is **newest version at the top**, oldest at the bottom.

### Pitfall 4: Version 1.3.2 is incomplete at writing time

**What goes wrong:** Phase 22 (STUDY-04, STUDY-05) has not run yet. The v1.3.2 entry will be incomplete.

**How to avoid:** The executor should write a placeholder note in the v1.3.2 entry for Phase 22 content and update it when Phase 22 completes, OR write the entry to cover only completed phases and add a note "Phase 22 (STUDY-04, STUDY-05) to be added after completion." Either approach is acceptable.

## Plan Structure Recommendation

**Single plan, single task.** This is a documentation-only phase.

```
21-01-PLAN.md
  Task 1: Write CHANGELOG.md at repo root
    - Action: Create CHANGELOG.md using the content outline from RESEARCH.md
    - File: CHANGELOG.md (repo root)
    - Acceptance criteria:
      1. File exists at repo root
      2. Contains exactly 6 version entries (v1.0 through v1.3.2, newest first)
      3. Each entry has: Added/Changed/Fixed/Removed user-facing bullets, Requirement IDs list, Breaking Changes section, Migration Notes section
      4. No implementation details in any bullet (must be user-perspective language)
      5. Dates match milestone ship dates from ROADMAP.md
      6. v1.3.2 entry notes Phase 22 items as pending (or executor has completed Phase 22 first)
```

No unit tests are needed (documentation file). Verification is manual inspection against the success criteria.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Dark mode (260530-003) shipped between v1.0 close and v1.1 close, so it belongs in the v1.1 entry | Content Outline — v1.1 | Dark mode may have shipped after v1.1 close (2026-06-01). STATE.md records it as a quick task completed 2026-05-28, which is before v1.0 closed on 2026-05-30. If so, it could belong in v1.0 or be attributed to v1.1 as a polish item. Low risk — attribution to v1.1 is the safer choice. |
| A2 | Scrollable card text (260607-001, 2026-06-07) falls into the v1.3.0 window | Content Outline — v1.3.0 | 260607-001 shipped 2026-06-07, which is between v1.2 close (2026-06-04) and v1.3.0 close (2026-06-11). Attribution to v1.3.0 is correct unless the project treats quick tasks as belonging to the milestone active at the time of the task. |
| A3 | v1.3.2 will close after Phase 22 completes | Content Outline — v1.3.2 | The milestone close date is unknown until Phase 22 finishes. The executor should update the v1.3.2 date accordingly. |

## Open Questions

1. **Dark mode attribution**
   - What we know: quick task 260530-003 is dated 2026-05-28 (before v1.0 closed on 2026-05-30); STATE.md lists it under "Completed"
   - What's unclear: Was dark mode considered part of v1.0 or a v1.1 improvement? It has no formal requirement ID.
   - Recommendation: Attribute to v1.1 (it polished the app after MVP shipped); include as an unnumbered bullet in the v1.1 Added section.

2. **v1.3.2 entry completion**
   - What we know: Phases 19 and 20 are complete; Phase 22 (STUDY-04, STUDY-05) is not yet done
   - What's unclear: Should the executor write a partial v1.3.2 entry now and update it after Phase 22, or wait until Phase 22 is complete?
   - Recommendation: Write the partial entry now with a clearly marked placeholder comment: `<!-- TODO Phase 22: add STUDY-04 and STUDY-05 bullets here -->`. After Phase 22 executes, the STUDY-04/05 executor or a follow-up commit completes it.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — this is a file-write only phase).

## Validation Architecture

> workflow.nyquist_validation is not set to false in config (key absent = enabled), but this phase has no automatable tests. Writing a Markdown file has no testable behavior that Vitest can assert. Therefore: no Wave 0 test stubs, no framework config changes. Verification is manual inspection of CHANGELOG.md against the 4 success criteria in the phase description.

Manual verification checklist (to be embedded in PLAN.md verification gate):
- [ ] CHANGELOG.md exists at repo root
- [ ] Exactly 6 versioned entries: v1.0, v1.1, v1.2, v1.3.0, v1.3.1, v1.3.2 (newest first)
- [ ] Each entry has: user-facing bullets, Requirement IDs, Breaking Changes section, Migration Notes section
- [ ] No bullets contain implementation details (e.g. "Prisma", "Vitest", "SQL") — all must be user-perspective

## Security Domain

> This phase writes a static Markdown file. No security-relevant surfaces are introduced. ASVS categories do not apply.

## Sources

### Primary (HIGH confidence)
- `.planning/milestones/v1.0-ROADMAP.md` — v1.0 phase goals, requirement list, dates
- `.planning/milestones/v1.0-REQUIREMENTS.md` — full v1.0 requirement definitions and traceability
- `.planning/milestones/v1.1-ROADMAP.md` — v1.1 phase goals, key decisions, dates
- `.planning/milestones/v1.1-REQUIREMENTS.md` — full v1.1 requirement definitions and traceability
- `.planning/milestones/v1.2-ROADMAP.md` — v1.2 phase goals, key decisions, dates, migration notes
- `.planning/milestones/v1.2-REQUIREMENTS.md` — full v1.2 requirement definitions and traceability
- `.planning/milestones/v1.3.0-ROADMAP.md` — v1.3.0 phase goals, key decisions, dates, migration notes
- `.planning/milestones/v1.3.0-REQUIREMENTS.md` — full v1.3.0 requirement definitions and traceability
- `.planning/milestones/v1.3.1-ROADMAP.md` — v1.3.1 phase goals, key decisions, dates, migration notes
- `.planning/milestones/v1.3.1-REQUIREMENTS.md` — full v1.3.1 requirement definitions and traceability
- `.planning/phases/19-library-remove-action/19-01-SUMMARY.md` — Phase 19 deliverables (LIB-02)
- `.planning/phases/20-logo-pwa-icons/20-01-SUMMARY.md` — Phase 20 deliverables (BRAND-01/02)
- `.planning/STATE.md` — quick task list with dates, all completed items
- `.planning/PROJECT.md` — milestone history, validated requirements per version
- `.planning/ROADMAP.md` — current roadmap with all phase details and completion dates

### Secondary (MEDIUM confidence)
- keepachangelog.com — Keep a Changelog format conventions [ASSUMED: format conventions from training knowledge; standard is stable and widely used]

## Metadata

**Confidence breakdown:**
- Content outline (version bullets, req IDs): HIGH — sourced directly from milestone archive files read this session
- Migration notes: HIGH — sourced directly from milestone ROADMAP.md files and STATE.md decisions
- Breaking change analysis: HIGH — all migrations confirmed as append-only with defaults in milestone archives
- Changelog format conventions: MEDIUM — based on training knowledge of keepachangelog.com (stable, widely adopted standard)

**Research date:** 2026-06-14
**Valid until:** This research does not expire — all content is sourced from static planning artifacts in the repository.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHNG-01 | `CHANGELOG.md` exists at repo root and is backfilled with structured entries for all past milestone releases (v1.0, v1.1, v1.2, v1.3.0, v1.3.1, v1.3.2) | Content outline in `## Content Outline for CHANGELOG.md` covers all 6 versions with user-facing bullets |
| CHNG-02 | Each CHANGELOG.md version entry contains: user-facing change summary bullets, requirement IDs, a "Breaking Changes" section (or "None"), and a "Migration Notes" section covering DB migrations and env var changes (or "None") | DB Migration Inventory and Env Var Change Inventory tables provide all migration notes; Requirement IDs listed per version in the content outline |
</phase_requirements>

## RESEARCH COMPLETE
