---
phase: 06-sharing-explore-deploy
reviewed: 2026-05-29T12:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - .env.example
  - .github/workflows/ci.yml
  - apps/backend/Dockerfile
  - apps/backend/package.json
  - apps/backend/prisma/schema.prisma
  - apps/backend/src/index.ts
  - apps/backend/src/routes/decks.ts
  - apps/backend/src/routes/explore.ts
  - apps/backend/src/routes/import.ts
  - apps/backend/src/routes/__tests__/explore.test.ts
  - apps/backend/src/routes/__tests__/sharing.test.ts
  - apps/backend/vitest.config.ts
  - apps/frontend/src/App.tsx
  - apps/frontend/src/pages/DeckDetailPage.tsx
  - apps/frontend/src/pages/DecksPage.tsx
  - apps/frontend/src/pages/ExplorePage.tsx
  - packages/shared/src/index.ts
  - packages/shared/src/schemas/deck.ts
  - packages/shared/src/schemas/share.ts
  - apps/backend/prisma/migrations/20260529122105_add_manage_permission/migration.sql
findings:
  critical: 2
  warning: 4
  info: 4
  total: 10
status: issues_found
---

# Phase 6: Code Review Report

**Reviewed:** 2026-05-29T12:00:00Z
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Phase 6 delivers deck sharing (READ/EDIT/MANAGE permissions), a public Explore page with fork capability, and a Docker CI/CD pipeline. The overall architecture is sound: Zod schemas are the single source of truth, authorization helpers are reused correctly, and the fork/import flow is well-hardened (magic-byte validation, UUID filenames, zip bomb ceiling).

Two critical issues need fixing before merging. The first is a broken authorization model in `cards.ts` that blocks EDIT-permission users from modifying cards on shared decks — the sharing UI adds an "Edit" permission level but the card endpoints only check deck ownership, making that permission level non-functional. The second is a privilege-escalation risk: a MANAGE-permission user can grant themselves (or another user) MANAGE permission on a deck they do not own, effectively accumulating owner-equivalent access indefinitely.

Four warnings round out reliability and correctness concerns; four info items are lower-priority suggestions.

---

## Critical Issues

### CR-01: EDIT/MANAGE share-permission users cannot modify cards — broken authorization contract

**File:** `apps/backend/src/routes/cards.ts:12`

**Issue:** Every card mutating endpoint (`POST /cards`, `PATCH /:cardId`, `DELETE /:cardId`) checks `deck.ownerId !== c.get('userId')` and returns 403 for anyone else. Phase 6 introduces EDIT and MANAGE share permissions with the explicit intent that EDIT users can add/modify cards (the UI surfaces an "Edit" badge; `DeckDetailPage` allows card add/edit for all visitors who can load the deck). Currently, any user with a DeckShare of EDIT or MANAGE who tries to add or edit a card receives a 403. The sharing feature is wired up end-to-end but silently broken for non-owner editors.

**Fix:** Add a `canEditCards(deckId, userId)` helper in `cards.ts` (parallel to `canManageDeck` in `decks.ts`) and use it in the three mutating card handlers:

```typescript
// apps/backend/src/routes/cards.ts
import { prisma } from '../lib/prisma.js'

async function canEditCards(deckId: string, userId: string): Promise<boolean> {
  const deck = await prisma.deck.findUnique({ where: { id: deckId } })
  if (!deck) return false
  if (deck.ownerId === userId) return true
  const share = await prisma.deckShare.findUnique({
    where: { deckId_sharedWithUserId: { deckId, sharedWithUserId: userId } },
  })
  return share?.permission === 'EDIT' || share?.permission === 'MANAGE'
}

// Replace the ownerId check in POST, PATCH, DELETE handlers:
if (!(await canEditCards(deckId, userId))) {
  return c.json({ error: 'Forbidden.' }, 403)
}
```

The read endpoint (`GET /cards`) also needs a parallel `canReadCards` check (owner, EDIT, MANAGE, or READ share), otherwise shared READ-only users cannot see card content.

---

### CR-02: MANAGE-permission user can escalate to perpetual co-owner by granting MANAGE to accomplices

**File:** `apps/backend/src/routes/decks.ts:136-168`

**Issue:** `canManageDeck` returns `true` for any user with a `MANAGE` DeckShare. The `POST /:id/shares` and `PATCH /:id/shares/:sharedWithUserId` endpoints use only `canManageDeck` as their gate. This means a MANAGE-permission user can:
1. Grant MANAGE permission to arbitrary other users.
2. Grant themselves a new MANAGE share if their existing one is somehow revoked (re-add flow).
3. Transitively, this creates an unbounded set of MANAGE users with no way for the true owner to audit who "authorized" whom.

While the design document (D-01) says MANAGE users can grant/revoke access, there is no ceiling on what they can grant. A MANAGE user should not be able to elevate another user to MANAGE — that privilege should remain with the deck owner alone.

**Fix:** Add an owner-only guard when the requested permission is MANAGE:

```typescript
// apps/backend/src/routes/decks.ts — POST /:id/shares handler
// After the canManageDeck check, add:
const requestingUserIsOwner = (await prisma.deck.findUnique({
  where: { id },
  select: { ownerId: true },
}))?.ownerId === userId

if (body.data.permission === 'MANAGE' && !requestingUserIsOwner) {
  return c.json({ error: 'Only the deck owner can grant MANAGE permission.' }, 403)
}
```

Apply the same guard in `PATCH /:id/shares/:sharedWithUserId`.

---

## Warnings

### WR-01: `fetchShares` silently swallows all errors — share list may be stale without feedback

**File:** `apps/frontend/src/pages/DeckDetailPage.tsx:138-145`

**Issue:** The `fetchShares` function has an empty `catch` block with a comment "Non-blocking — sharing section will just show empty." If the request fails after an initial successful load (e.g., network blip after revoking a share), the UI shows the stale shares list with no indication of failure. Users could believe they successfully removed access when the share still exists on the server.

**Fix:** Distinguish initial load (empty state is fine) from post-mutation fetches. For post-mutation calls (`handleRevokeShare`, `handleUpdateSharePermission`, `handleAddShare`) already show toasts on failure. The `fetchShares` on mount can remain silent for initial empty state, but should at minimum log in development:

```typescript
const fetchShares = async () => {
  if (!deckId) return
  try {
    const res = await api.get(`/api/decks/${deckId}/shares`)
    if (res.ok) setShares(await res.json())
    // Non-200 from /shares means user lost MANAGE permission mid-session; silently clear is OK
  } catch {
    // Network error on initial load — leave shares empty, no toast needed
    // Consider: toast.error('Could not load share list.') if this is post-mutation
  }
}
```

The more impactful change: after `handleRevokeShare` and `handleUpdateSharePermission` succeed, the code uses optimistic local state updates (`setShares(prev => ...)`) rather than re-fetching. This is fine for UX but means if the server response differs from the optimistic update (rare but possible), shares state diverges. Consider re-fetching after those mutations.

---

### WR-02: CI workflow installs with `yarn` but `package.json` uses `pnpm workspaces` — package manager mismatch

**File:** `.github/workflows/ci.yml:20-23`

**Issue:** `CLAUDE.md` declares "Monorepo: pnpm workspaces" and the root `package.json` may use `pnpm`. The CI workflow sets up Node with `cache: 'yarn'` and runs `corepack enable` followed by `yarn install --immutable`. The Dockerfile also uses Yarn 4 (`yarn@4.15.0`). This mismatch needs clarification: if the project has fully migrated to Yarn 4 (Berry), the CI and Dockerfile are consistent with each other, but the CLAUDE.md technology table is stale. If pnpm is the intended package manager, both the Dockerfile and CI are wrong. As-is, CI and Dockerfile agree on Yarn 4, so this is a documentation inconsistency rather than a broken build — but it creates confusion for new contributors.

**Fix:** Update `CLAUDE.md`'s technology table to read `Yarn 4 (Berry)` instead of `pnpm workspaces`, or align Dockerfile and CI to use pnpm if that is the intended manager.

---

### WR-03: `POST /api/decks/:id/shares` returns 201 for both create and update (upsert)

**File:** `apps/backend/src/routes/decks.ts:161-167`

**Issue:** The endpoint uses `prisma.deckShare.upsert` and always returns HTTP 201. When the share already exists and only the permission is updated, 201 ("Created") is semantically incorrect — it should return 200. The `sharing.test.ts` stub has a todo "returns 409 when user is already a share recipient" which contradicts the current upsert behavior (the upsert silently updates, not conflicts). Callers that inspect status codes (tests, future API clients) will receive incorrect signal.

**Fix:** Check existence first and return the appropriate status code:

```typescript
const existing = await prisma.deckShare.findUnique({
  where: { deckId_sharedWithUserId: { deckId: id, sharedWithUserId: targetUser.id } },
})
const share = existing
  ? await prisma.deckShare.update({
      where: { deckId_sharedWithUserId: { deckId: id, sharedWithUserId: targetUser.id } },
      data: { permission: body.data.permission },
      include: { sharedWithUser: { select: { username: true } } },
    })
  : await prisma.deckShare.create({
      data: { deckId: id, sharedWithUserId: targetUser.id, permission: body.data.permission },
      include: { sharedWithUser: { select: { username: true } } },
    })
return c.json(share, existing ? 200 : 201)
```

Also update the test stub expectation from "returns 409 when user is already a share recipient" to "returns 200 with updated permission when share already exists."

---

### WR-04: `canManageDeck` makes two sequential DB queries — TOCTOU window and N+1 in share endpoints

**File:** `apps/backend/src/routes/decks.ts:15-23`

**Issue:** `canManageDeck` first fetches the deck, then (if not owner) fetches the DeckShare. Every shares endpoint calls this helper. In the `POST /:id/shares` handler, the deck is fetched a third time to get `ownerId` for the "cannot share with owner" check (line 155), and a fourth time implicitly via the upsert. This is three separate round-trips for a single operation. More importantly, there is a TOCTOU gap: the deck could be deleted between the `canManageDeck` check and the subsequent upsert, resulting in a foreign-key error bubbling up as an unhandled 500.

**Fix:** Combine the deck fetch and permission check into a single query with an include, or at minimum wrap the `POST /shares` logic in a transaction. At a minimum, add a top-level try/catch for Prisma's `P2003` (foreign key) and `P2025` (record not found) errors in the shares handlers to return 404 instead of 500.

---

## Info

### IN-01: `VisibilityBadge` duplicated between `DecksPage` and `DeckDetailPage`

**File:** `apps/frontend/src/pages/DecksPage.tsx:18-38` and `apps/frontend/src/pages/DeckDetailPage.tsx:28-48`

**Issue:** The `VisibilityBadge` component is defined identically in both files. Any future change (e.g., adding a new visibility level) requires updating two places.

**Fix:** Extract to a shared component at `apps/frontend/src/components/VisibilityBadge.tsx` and import in both pages.

---

### IN-02: `ExploreDeck` schema missing `updatedAt` in `_count` optionality — inconsistent with `DeckSchema`

**File:** `packages/shared/src/schemas/share.ts:23-34`

**Issue:** `ExploreDeckSchema` marks `_count` as optional (`.optional()`), matching `DeckSchema`. However, the backend `GET /api/explore` always includes `_count` via Prisma's `include`. In practice `_count` is never `undefined` from this endpoint. The optional typing means frontend code uses the `??` fallback everywhere (`deck._count?.cards ?? 0`) defensively. This is minor but creates noise.

**Fix:** In `ExploreDeckSchema`, make `_count` required (remove `.optional()`) since the explore endpoint always includes it. This makes the type more precise and removes the need for null-coalescing at the call site in `ExplorePage`.

---

### IN-03: All tests in `explore.test.ts` and `sharing.test.ts` are `it.todo` stubs

**File:** `apps/backend/src/routes/__tests__/explore.test.ts:1-21` and `apps/backend/src/routes/__tests__/sharing.test.ts:1-43`

**Issue:** Every behavioral test is a `it.todo` placeholder. The CI pipeline runs these test files and they pass vacuously (todos count as skipped, not failures). The security-relevant behaviors — "returns 403 when deck is PRIVATE and caller has no DeckShare", "returns 403 when called by READ-permission user" — have no runtime verification. The one passing test (`expect(true).toBe(true)` in `sharing.test.ts:37`) verifies nothing meaningful.

**Fix:** Implement at minimum the security-boundary tests using `vi.mock('../../../lib/prisma.js')`. The comment "Fill with vi.mock in a follow-up" should become a tracked issue with a deadline, not left open-ended.

---

### IN-04: Dockerfile copies Prisma binaries from builder but `yarn workspaces focus --production` in production stage may re-resolve native binaries

**File:** `apps/backend/Dockerfile:68-79`

**Issue:** The production stage runs `yarn workspaces focus @kartex/backend --production` which installs production dependencies fresh, then copies the pre-generated Prisma client from the builder stage. If the `@prisma/client` version installs a query engine binary that differs from the pre-generated one (e.g., platform target mismatch), the copied binaries could be shadowed or the native engine may fail to load at runtime. The `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` in `schema.prisma` mitigates this on Alpine, but the dual-install pattern is fragile.

**Fix:** After `yarn workspaces focus`, run `prisma generate` in the production stage using the already-copied schema, or copy only the generated client's JS/TS files (not the binary) and rely on the production install's `@prisma/client` package to provide the engine. Alternatively, document the expected behavior and add a smoke test in CI that runs `prisma validate` against the production image.

---

_Reviewed: 2026-05-29T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
