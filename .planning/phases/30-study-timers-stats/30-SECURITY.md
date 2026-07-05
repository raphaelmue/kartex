---
phase: 30
slug: study-timers-stats
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-07-05
---

# Phase 30 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| dev shell → live DB | Schema DDL applied via Docker Compose entrypoint; no DATABASE_URL exposed in dev shell | DDL only |
| client → shared schema | All request bodies validated against Zod before reaching Prisma | thinkingTimeMs, cardsReviewed, deckIds |
| client → POST /session/start | Untrusted deckIds; a user could try to associate a session with decks they cannot access | deckIds |
| client → POST /session/complete | Untrusted sessionId + cardsReviewed; a user could try to complete another user's session or inflate duration | sessionId, cardsReviewed |
| client → POST /rate | Untrusted thinkingTimeMs (display stat) | thinkingTimeMs |
| study loop → POST /session/* | Client initiates session start/complete; server enforces ownership + computes duration | session lifecycle calls |
| GET /api/stats/summary → StatsSummaryPanel | Server-provided stats rendered as text; deck titles are user content rendered as React children | recentSessions, deckTitles |
| static locale files → UI | Translation strings rendered as text via i18next; deck titles are user content interpolated as values, never keys | i18n keys |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-30-01 | Tampering (IDOR) | POST /session/complete | high | mitigate | `session.userId !== userId` → 403 before any update (apps/backend/src/routes/study.ts:310) | closed |
| T-30-02 | Tampering | POST /session/start deckIds | medium | mitigate | Every deckId validated against ownership OR active DeckShare before StudySessionDeck rows created; 403 otherwise (study.ts:269-285) | closed |
| T-30-03 | Spoofing | client-supplied durationSeconds | medium | mitigate | Server computes durationSeconds from persisted startedAt→now; complete schema has no duration field (study.ts:312-314) | closed |
| T-30-04 | Tampering | migration.sql DDL | medium | mitigate | thinkingTimeMs nullable with no DEFAULT; new tables only — zero-downtime, no mutation of existing rows (20260704000000_add_study_timers/migration.sql) | closed |
| T-30-05 | Denial of Service | thinkingTimeMs / cardsReviewed inputs | low | mitigate | Zod `int().nonnegative()` bounds at shared-schema boundary (packages/shared/src/schemas/study.ts, stats.ts) | closed |
| T-30-06 | Information Disclosure | i18n interpolation | low | accept | New keys carry no user data except formatted time string; deck titles rendered as React children, never through translation keys | closed |
| T-30-07 | Tampering | client-supplied thinkingTimeMs / cardsReviewed | low | accept | Display-only stat; Zod bounds nonnegative int; no security decision derives from it | closed |
| T-30-08 | Tampering | client thinkingTimeMs | low | accept | Display-only stat; server stores verbatim, Zod bounds it nonnegative | closed |
| T-30-09 | Denial of Service | visibilitychange listeners / setInterval | low | mitigate | All intervals/listeners removed on unmount (SessionTimer.tsx:29,43; useStudySession.ts:67) | closed |
| T-30-10 | Information Disclosure | session lifecycle fetch errors | low | mitigate | Lifecycle calls wrapped in try/catch, DEV-only console logging, no raw error surfaced in production (StudySessionPage.tsx:65-75, 87-93) | closed |
| T-30-11 | Information Disclosure | deck-title badges in recent sessions | low | mitigate | Deck titles rendered as React text children via Badge (auto-escaped), never dangerouslySetInnerHTML or translation keys (StatsSummaryPanel.tsx:239-241) | closed |
| T-30-12 | Denial of Service | recentSessions render | low | mitigate | Server-capped at take: 10 (stats.ts:138); component reads null-safe `?? []` (StatsSummaryPanel.tsx:49) | closed |
| T-30-SC | Tampering | npm/pip/cargo installs | low | accept | No new package installs across all 5 plans in this phase | closed |

*Status: open · closed · open — below {block_on} threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-30-01 | T-30-06 | i18n keys carry no user data beyond a formatted time string; deck titles never pass through translation keys | Plan-time (30-02-PLAN.md) | 2026-07-05 |
| R-30-02 | T-30-07, T-30-08 | thinkingTimeMs is a client-measured display-only stat; no security decision derives from it; server bounds it nonnegative | Plan-time (30-03/30-04-PLAN.md) | 2026-07-05 |
| R-30-03 | T-30-SC | No new package installs introduced across all 5 plans in this phase | Plan-time (all plans) | 2026-07-05 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-05 | 13 | 13 | 0 | /gsd-secure-phase (orchestrator, L1 grep-depth — register authored at plan time, ASVS L1) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-05
