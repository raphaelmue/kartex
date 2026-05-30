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
