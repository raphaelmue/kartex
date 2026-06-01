# Requirements: Kartex v1.2 Study Control & PWA

**Milestone:** v1.2 Study Control & PWA
**Status:** Active
**Created:** 2026-06-02
**Phases:** 10–13 (continuing from v1.1 which ended at Phase 9)

## User Stories & Acceptance Criteria

### Active Deck Management

- [ ] **DECK-01**: User can mark a deck as active or inactive via a toggle on the deck list or deck detail page
- [ ] **DECK-02**: The /study global session only queues due cards from decks the user has marked active
- [ ] **DECK-03**: User can select which active decks to include in a /study session via a deck picker on the study start screen (active decks pre-checked; user can uncheck for this session only)
- [ ] **DECK-04**: /study start screen has a session size picker (All / 10 / 20 / custom), matching the existing picker on /decks/:id/learn

### SM-2 Preset Modes

- [ ] **SM2-01**: User can choose a study mode: Normal (default SM-2 intervals), Intensive (intervals × 0.5), or Exam Prep (intervals × 0.25)
- [ ] **SM2-02**: Study mode is stored server-side per user and applied at the `POST /api/study/rate` endpoint — not client-side
- [ ] **SM2-03**: `/settings` page shows a study mode selector (replaces the `<ComingSoon>` placeholder)
- [ ] **SM2-04**: The SM-2 interval multiplier affects only `nextReviewAt` scheduling; the raw SM-2 interval stored in `CardProgress.interval` is never modified by the multiplier

### PWA Installable Shell

- [ ] **PWA-01**: App has a web app manifest (name, icons 192×192 + 512×512, theme color, `display: standalone`) so browsers offer "Add to Home Screen"
- [ ] **PWA-02**: Service worker pre-caches static JS/CSS/HTML for fast app shell load on repeat visits; Typst WASM files are excluded from precache (handled via network-first runtime caching)
- [ ] **PWA-03**: All `/api/*` requests bypass the service worker (NetworkOnly strategy) — no card data or session state is cached by the SW
- [ ] **PWA-04**: Production Hono server sets `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers (fixes pre-existing gap; required for Typst WASM in production and for correct PWA cross-origin isolation)
- [ ] **PWA-05**: `sw.js` and `workbox-*.js` are served with `Cache-Control: no-store` so redeployments propagate immediately

### Documentation

- [ ] **DOCS-01**: `README.md` exists at the repository root with project overview, tech stack summary, Docker Compose quick-start (`.env` setup + `docker compose up -d`), and links to `docs/design.md` and `docs/kartex-format.md`
- [ ] **DOCS-02**: `docs/design.md` is updated to remove references to Nginx (replaced by Hono `serveStatic` in D-05/D-06) and pnpm (project uses yarn@4.15.0)
- [ ] **DOCS-03**: `docs/kartex-format.md` is reviewed and accurate against the v1.1 parser implementation

## Future Requirements (Deferred)

- Per-user active state for shared decks (`UserDeckSettings` join table) — owner-only `isActive` is correct for 2-5 user scale
- Custom SM-2 multiplier slider — named presets cover the practical range without exposing raw numbers
- `CONTRIBUTING.md` — not selected for this milestone
- Install prompt / "Add to Home Screen" affordance UI — browser native prompt is sufficient for v1.2

## Out of Scope

- **Full offline study** — caching API responses, card content, and media for offline use is v2 per PROJECT.md
- **Custom SM-2 multiplier (raw number)** — named presets chosen as simpler and less error-prone
- **OIDC / LDAP / open sign-up** — not needed for self-hosted 2-5 user setup
- **Advanced statistics** — retention rate charts, learning curves — v2

## Traceability

| REQ-ID | Phase | Plan |
|--------|-------|------|
| DECK-01 | Phase 10 | — |
| DECK-02 | Phase 10 | — |
| DECK-03 | Phase 10 | — |
| DECK-04 | Phase 10 | — |
| SM2-01 | Phase 11 | — |
| SM2-02 | Phase 11 | — |
| SM2-03 | Phase 11 | — |
| SM2-04 | Phase 11 | — |
| PWA-01 | Phase 12 | — |
| PWA-02 | Phase 12 | — |
| PWA-03 | Phase 12 | — |
| PWA-04 | Phase 12 | — |
| PWA-05 | Phase 12 | — |
| DOCS-01 | Phase 13 | — |
| DOCS-02 | Phase 13 | — |
| DOCS-03 | Phase 13 | — |

---
*Last updated: 2026-06-02 — v1.2 roadmap complete (16/16 requirements mapped to phases 10–13)*
