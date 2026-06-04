---
phase: 10
slug: active-deck-rotation
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-04
---

# Phase 10 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| migration → database | Schema DDL applied to the live PostgreSQL instance | DDL only (no user data) |
| npx shadcn install → project | Code-copy from official shadcn registry into the repo | UI component source |
| client → PATCH /api/decks/:id | Untrusted toggle request crosses into backend; must validate type + ownership | `isActive: boolean`, deck ID |
| client → GET /api/study/due | Client may request the global queue directly, bypassing the start screen | Due card list |
| client deck picker → committedConfig | Per-session deckIds selection is ephemeral client state; must not write to persisted isActive flag | `string[]` deck IDs (session-only) |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-10-01 | Tampering | DecksPage.test.tsx | accept | Test scaffold only — no runtime trust boundary crossed; no production code, no input handling | closed |
| T-10-02 | Tampering | Prisma migration | mitigate | Additive NOT NULL DEFAULT columns — zero-downtime; applied via `prisma migrate dev`, not hand-written SQL | closed |
| T-10-03 | Tampering | shadcn Switch/Checkbox install | accept | Official shadcn registry only — no third-party registry, no eval, standard Radix wrappers | closed |
| T-10-SC | Tampering | @radix-ui/react-switch, @radix-ui/react-checkbox | accept | Pulled transitively by official shadcn CLI; @radix-ui is the canonical org already used across frontend | closed |
| T-10-04 | Tampering | PATCH /api/decks/:id (ownership) | mitigate | `deck.ownerId !== c.get('userId')` → 403 enforced server-side; UI hides toggle for non-owners | closed |
| T-10-05 | Tampering | PATCH /api/decks/:id (isActive type coercion) | mitigate | `isActive: z.boolean().optional()` on UpdateDeckSchema — Zod rejects non-boolean strings → 400 | closed |
| T-10-06 | Tampering | GET /api/study/due (start-screen bypass) | mitigate | Server-side `{ isActive: true }` filter on owned-deck branch — inactive cards never returned regardless of client state | closed |
| T-10-07 | Tampering | Deck picker uncheck (session vs. persistent) | mitigate | `toggleDeckSelection` mutates only `selectedDeckIds` client state; no `api.patch` called from start screen; DECK-03c test asserts no PATCH fires | closed |
| T-10-08 | Information Disclosure | Client-side deckIds filter as sole enforcement | accept | Client filter is additive UX only; DECK-02 enforcement owned by T-10-06 server filter — client bypass still cannot retrieve inactive-deck cards | closed |
| T-10-09 | Information Disclosure | locale JSON (de.json / en.json) | accept | Static UI copy only — no secrets, no user data, no executable content; German key-parity enforced by verify script | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-10-01 | T-10-01 | Test-only plan — no runtime surface introduced | gsd-security-auditor | 2026-06-04 |
| AR-10-02 | T-10-03 | Official shadcn registry; @radix-ui is first-party tooling already in use | gsd-security-auditor | 2026-06-04 |
| AR-10-03 | T-10-SC | @radix-ui canonical org; component copy, not a new top-level dependency | gsd-security-auditor | 2026-06-04 |
| AR-10-04 | T-10-08 | Client-side deckIds filter is UX convenience; server isActive filter (T-10-06) is the enforcement boundary | gsd-security-auditor | 2026-06-04 |
| AR-10-05 | T-10-09 | Static locale JSON — no secrets, no user data, no executable content | gsd-security-auditor | 2026-06-04 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-04 | 10 | 10 | 0 | gsd-security-auditor |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-04
