# Requirements: Kartex v1.3.2

**Defined:** 2026-06-13
**Core Value:** A user can open their dashboard, see their due cards, and complete a spaced-repetition study session — that loop must always work.

## v1.3.2 Requirements

### Library Management

- [ ] **LIB-02**: User can permanently remove a public/shared deck from their personal library (Explore page "Remove from library" action; deck disappears from library view and no longer affects study queue)

### Branding

- [ ] **BRAND-01**: App logo SVG is replaced with a new design featuring a stylised "K" on a learning-card motif, visible in the AppShell header and browser tab favicon
- [ ] **BRAND-02**: PWA icons (192×192, 512×512, apple-touch-icon 180×180) are regenerated from the new logo using the existing `@vite-pwa/assets-generator` pipeline

### Changelog

- [ ] **CHNG-01**: `CHANGELOG.md` exists at repo root and is backfilled with structured entries for all past milestone releases (v1.0, v1.1, v1.2, v1.3.0, v1.3.1, v1.3.2)
- [ ] **CHNG-02**: Each CHANGELOG.md version entry contains: user-facing change summary bullets, requirement IDs (e.g. MOB-01), a "Breaking Changes" section (or "None"), and a "Migration Notes" section covering DB migrations and env var changes (or "None")

## Future Requirements

*(Deferred — not in current roadmap)*

### Library Management

- **LIB-03**: User can hide/block a public deck from appearing in Explore search results

### Branding

- **BRAND-03**: Logo has dark-mode and light-mode variants

### Changelog

- **CHNG-03**: In-app "What's New" page displays CHANGELOG.md content
- **CHNG-04**: Changelog entries are auto-generated from git log / conventional commits

## Out of Scope

| Feature | Reason |
|---------|--------|
| AI integration | v2 feature — script → Claude API → Kartex deck generation |
| Offline / full PWA | Service worker for offline study deferred to v2 |
| OIDC / LDAP | Not needed for 2–5 user self-hosted setup |
| Open sign-up | Invite-only by design |
| Self-hosted video storage | External embeds sufficient |
| In-app "What's New" page | CHNG-03 deferred to future milestone |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LIB-02 | Phase 19 | Pending |
| BRAND-01 | Phase 20 | Pending |
| BRAND-02 | Phase 20 | Pending |
| CHNG-01 | Phase 21 | Pending |
| CHNG-02 | Phase 21 | Pending |

**Coverage:**
- v1.3.2 requirements: 5 total
- Mapped to phases: 5 ✓
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-13*
*Last updated: 2026-06-13 — traceability updated after v1.3.2 roadmap creation*
