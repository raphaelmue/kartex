# Requirements: Kartex v1.3.1 Bug Fixes & Mobile Polish

**Milestone:** v1.3.1 Bug Fixes & Mobile Polish
**Status:** Active
**Created:** 2026-06-11

## Mobile Layout (MOB)

- [x] **MOB-01**: Mobile viewport (375px) renders without visible overflow or unwanted spacing — main content padding and stats table display correctly with no element exceeding its container

## Library Deck Toggle (LIB)

- [x] **LIB-01**: User can toggle a library deck (public/shared deck added via Explore) active or inactive; the toggle state persists and filters the /study queue identically to owned deck toggles

## Deck Card UI (DECK)

- [x] **DECK-05**: Deck card action buttons are fully contained within their card boundary on both 375px mobile and 1280px desktop viewports (no overflow, no wrapping outside container)

## Future Requirements (Deferred)

*(none identified for this patch)*

## Out of Scope

- New features — this is a patch release; no new user-facing capabilities
- Schema changes — no Prisma migrations expected
- i18n additions — no new translation keys unless a label change is needed to fix a bug

## Traceability

| REQ-ID | Phase | Plans | Status |
|--------|-------|-------|--------|
| MOB-01 | 17 — Mobile UI Polish | 17-01 | Complete |
| DECK-05 | 17 — Mobile UI Polish | 17-02 | Complete |
| LIB-01 | 18 — Library Deck Toggle | 18-01, 18-02 | Complete |
