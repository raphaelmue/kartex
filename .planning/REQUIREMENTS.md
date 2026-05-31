# Requirements: Kartex

**Defined:** 2026-05-30
**Core Value:** A user can open their dashboard, see their due cards, and complete a spaced-repetition study session — that loop must always work.

## v1.1 Requirements

Requirements for the Study Experience & Polish milestone.

### Study UX

- [x] **STUDY-01**: User can filter a study session by one or more tags before it begins
- [x] **STUDY-02**: User can choose session size (All due / 10 / 20 / custom) before starting a session
- [x] **STUDY-03**: Cards in a study session are always presented in random order
- [x] **STUDY-04**: Deck detail page groups cards under tag headers; untagged cards appear under "Untagged"

### App Shell

- [ ] **SHELL-01**: Sidebar collapses by default below 768px and can be toggled via a hamburger button
- [ ] **SHELL-02**: On mobile, opening the sidebar renders as an overlay drawer (no layout push)
- [ ] **SHELL-03**: App footer shows version (from package.json), "© Raphael Müßeler", and optional links

### Internationalization

- [ ] **I18N-01**: Frontend uses react-i18next with a locale directory (`apps/frontend/src/locales/`)
- [ ] **I18N-02**: All frontend UI strings are externalized to locale JSON and use `t()` calls
- [ ] **I18N-03**: User can switch the application language via a language selector

## v2 Requirements

Deferred to a future release.

### Study UX (deferred)

- **STUDY-FUTURE-01**: Study session shows per-tag statistics and retention rate
- **STUDY-FUTURE-02**: User can save a named "study filter" preset for reuse

### Internationalization (deferred)

- **I18N-FUTURE-01**: Backend error messages are internationalized
- **I18N-FUTURE-02**: Second locale (e.g. German) ships with complete translation

## Out of Scope

| Feature | Reason |
|---------|--------|
| Backend i18n | English-only backend error messages sufficient for v1.1 self-hosted audience |
| Persistent locale preference (DB) | Cookie or localStorage is sufficient for v1.1; DB storage is over-engineering |
| Tag hierarchy / nested topics | Option A (Topic model) deferred until tag-as-topic proves insufficient |
| RTL language support | Not needed for current audience |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| STUDY-01 | Phase 8 | Complete — 2026-05-31 |
| STUDY-02 | Phase 8 | Complete — 2026-05-31 |
| STUDY-03 | Phase 8 | Complete — 2026-05-31 |
| STUDY-04 | Phase 8 | Complete — 2026-05-31 |
| SHELL-01 | Phase 7 | Pending |
| SHELL-02 | Phase 7 | Pending |
| SHELL-03 | Phase 7 | Pending |
| I18N-01 | Phase 9 | Pending |
| I18N-02 | Phase 9 | Pending |
| I18N-03 | Phase 9 | Pending |

**Coverage:**
- v1.1 requirements: 10 total
- Mapped to phases: 10 ✓
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-30*
*Last updated: 2026-05-30 after v1.1 roadmap creation*
