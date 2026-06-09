# Requirements: Kartex v1.3.0

**Defined:** 2026-06-09
**Core Value:** A user can open their dashboard, see their due cards, and complete a spaced-repetition study session — that loop must always work.

## v1.3.0 Requirements

### Learning Statistics (STATS)

- [ ] **STATS-01**: Dashboard displays total cards reviewed (all time) and this week
- [ ] **STATS-02**: Dashboard displays retention rate (% ratings ≥ Good in last 30 days), showing "No data yet" when review history is empty
- [ ] **STATS-03**: Dashboard displays card difficulty breakdown (Easy / Good / Hard / Again counts), showing "No data yet" when review history is empty
- [ ] **STATS-04**: Dashboard displays per-deck progress summary (due, mastered, in-learning)
- [x] **STATS-05**: Each card rating is recorded in a new `ReviewLog` table (userId, cardId, deckId, rating, reviewedAt) inside the existing `POST /api/study/rate` transaction

### Deck Update via Import (IMP)

- [ ] **IMP-01**: User can upload a `.kartex` file from the Deck Detail page to update an existing deck
- [ ] **IMP-02**: A preview modal shows the diff (added / updated / unchanged / removed card counts) before the user commits
- [ ] **IMP-03**: Cards matched by `kartexId` field are updated in place (content refreshed, SM-2 progress preserved)
- [ ] **IMP-04**: Cards present in the file but absent in the deck are added as new cards
- [ ] **IMP-05**: Cards present in the deck but absent in the file are listed as "removed" in the preview
- [ ] **IMP-06**: User can toggle "keep removed cards" on the confirmation dialog; when on (default), removed cards are kept; when off, they are deleted
- [x] **IMP-07**: The `.kartex` format accepts an optional `id:` field per card block; existing files without `id:` import normally (backward compatible)

## Future Requirements

### Stats (defer to v1.4)

- **STATS-F01**: Ease factor distribution — histogram or low/medium/high buckets to surface chronically-hard cards
- **STATS-F02**: Study session history — past sessions list with date, deck, and card count

### Import

- **IMP-F01**: Deck export — `GET /api/decks/:id/export` returns the deck as a `.kartex` file with stable `id:` fields per card (prerequisite for round-trip update workflow)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Charts and time-series visualisation | Stat chips are sufficient for this milestone; charting adds 130 KB bundle cost for no stated requirement |
| Deck export in v1.3 | Useful but not required to ship import-update; users can craft `.kartex` files with `id:` fields manually or via future export |
| Offline study | Service worker caches app shell; API still requires network — full offline deferred to v2 |
| AI integration | v2 feature — script → Claude API → Kartex deck generation |
| Open sign-up | Invite-only by design |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| STATS-01 | Phase 15 | Pending |
| STATS-02 | Phase 15 | Pending |
| STATS-03 | Phase 15 | Pending |
| STATS-04 | Phase 15 | Pending |
| STATS-05 | Phase 14 | Complete |
| IMP-01 | Phase 16 | Pending |
| IMP-02 | Phase 16 | Pending |
| IMP-03 | Phase 16 | Pending |
| IMP-04 | Phase 16 | Pending |
| IMP-05 | Phase 16 | Pending |
| IMP-06 | Phase 16 | Pending |
| IMP-07 | Phase 14 | Complete |

**Coverage:**

- v1.3.0 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-09*
*Last updated: 2026-06-09 — traceability filled in after v1.3.0 roadmap creation (Phases 14–16)*
