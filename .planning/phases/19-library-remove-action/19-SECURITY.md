---
phase: 19
slug: library-remove-action
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-13
---

# Phase 19 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser → Hono API | Untrusted `deckId` route param + authenticated `userId` from JWT httpOnly cookie via authMiddleware | deck ID (untrusted), user identity (trusted via JWT) |
| Hono API → PostgreSQL | Prisma compound-unique lookup and delete on `DeckShare` table | `{ deckId, sharedWithUserId }` compound key — caller-scoped only |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-19-01 | Elevation of Privilege / IDOR | `DELETE /api/decks/:id/library` | mitigate | Handler calls `prisma.deckShare.findUnique` keyed on `{ deckId_sharedWithUserId: { deckId: id, sharedWithUserId: userId } }` where `userId = c.get('userId')` from JWT. A user cannot reference another user's DeckShare row. Returns 403 if no share exists. **Verified:** handler present at `apps/backend/src/routes/decks.ts` line 322; compound-unique lookup confirmed. | closed |
| T-19-02 | Spoofing / AuthZ bypass | `DELETE /api/decks/:id/library` | mitigate | Route mounted under the same `authMiddleware` chain as `PATCH /:id/library`. `userId` is injected server-side from the validated JWT cookie; no `userId` ever comes from request body or URL params. Unauthenticated requests are rejected before the handler runs. **Verified:** `userId = c.get('userId')` pattern at line 324; no body parse for userId. | closed |
| T-19-03 | Information Disclosure | 403 vs 404 response for non-existent/non-owned shares | accept | Handler returns `403 ("Forbidden.")` uniformly whether the DeckShare row is absent or belongs to another user. This matches the established `PATCH /:id/library` behavior (line 311) — no new disclosure surface introduced. See Accepted Risks Log. | closed |
| T-19-04 | Tampering / Data loss | `prisma.deckShare.delete` scope | mitigate | Only `prisma.deckShare.delete` executes in the handler; zero references to `cardProgress` in the file (`grep cardProgress apps/backend/src/routes/decks.ts` → no matches). The compound-unique key scopes deletion to the calling user's own share only. **Verified:** no `cardProgress` in decks.ts; delete keyed on `{ deckId_sharedWithUserId: { deckId: id, sharedWithUserId: userId } }` at line 331. | closed |
| T-19-SC | Tampering (supply chain) | npm dependencies | accept | No new packages were installed in Phase 19. All UI components (`DropdownMenu`, `AlertDialog`, `Button`, `MoreVertical`) and the Prisma client were already present from prior phases. No package-legitimacy gate required. See Accepted Risks Log. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-19-01 | T-19-03 | Uniform `403` response for absent/unauthorized DeckShare rows is the established project pattern (matches `PATCH /:id/library`, line 311). Returning `404` for truly absent rows would expose deck-existence information without improving security. Risk: negligible (attacker learns no more than from PATCH). | orchestrator | 2026-06-13 |
| AR-19-02 | T-19-SC | Phase 19 adds no new npm dependencies. All referenced components (`DropdownMenu`, `AlertDialog`, `Button`, `MoreVertical`, Prisma) were introduced in earlier phases and are already trusted. Supply-chain gate not required for this phase. | orchestrator | 2026-06-13 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-13 | 5 | 5 | 0 | gsd-secure-phase (orchestrator) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-13
