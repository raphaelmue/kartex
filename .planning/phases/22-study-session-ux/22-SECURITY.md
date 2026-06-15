---
phase: 22
slug: 22-study-session-ux
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-15
---

# Phase 22 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| API response → React state | `deckTitle` from `DueCard` is user-supplied deck name rendered in the UI | String (low sensitivity — deck names are user-visible metadata, not PII) |
| shuffle input | Array of user cards from API — pure in-memory transform | Card objects (no PII, no secret data) |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-22-01 | Tampering | `deckTitle` display in Badge | accept | React automatically escapes all string values rendered as JSX text children — XSS via `currentCard.deckTitle` is not possible; no `dangerouslySetInnerHTML` used | closed |
| T-22-02 | Information Disclosure | `Math.random` seeding in `shuffle()` | accept | Fisher-Yates with `Math.random` is not cryptographically secure, but card shuffle order carries no security requirement — no PII or secret ordering involved | closed |
| T-22-SC | Tampering | npm dependency supply chain | accept | No new npm packages were introduced in this phase — `Badge` component and `vitest` already present in the dependency tree | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-22-01 | T-22-01 | React JSX text escaping is framework-guaranteed; no raw HTML rendering path exists | plan threat model | 2026-06-14 |
| AR-22-02 | T-22-02 | Card display order is not a security-sensitive concern; `Math.random` suffices for UX shuffle | plan threat model | 2026-06-14 |
| AR-22-SC | T-22-SC | No new packages introduced — supply chain surface unchanged from prior phases | plan threat model | 2026-06-14 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-15 | 3 | 3 | 0 | gsd-secure-phase (short-circuit: all plan-time, all accept) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-15
