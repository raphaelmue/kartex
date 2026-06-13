---
phase: 19-library-remove-action
reviewed: 2026-06-13T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - apps/backend/src/routes/__tests__/library-remove.test.ts
  - apps/backend/src/routes/decks.ts
  - apps/frontend/src/locales/en.json
  - apps/frontend/src/locales/de.json
  - apps/frontend/src/pages/DecksPage.tsx
  - apps/frontend/src/pages/__tests__/DecksPage.test.tsx
findings:
  critical: 1
  warning: 4
  info: 2
  total: 7
status: issues_found
---

# Phase 19: Code Review Report

**Reviewed:** 2026-06-13T00:00:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

This phase introduces the "Remove from library" action for shared/library decks: a `DELETE /api/decks/:id/library` backend endpoint, a confirmation dialog and handler on the frontend `DecksPage`, and i18n keys in both locales. Tests cover the frontend flow via `DecksPage.test.tsx`; the backend test file is present but all cases are `it.todo` stubs.

The `api` wrapper (`apps/frontend/src/lib/api.ts`) returns the raw `Response` without eagerly parsing JSON, so the 204 null body from the backend is handled correctly by the frontend. One critical bug is present: when `user` is `null` during auth loading, all owned decks are misrouted to the library footer and expose "Remove from library" instead of Edit/Delete. Four warnings cover: the delete-confirmation dialog not closing on failure, the backend test file having zero assertions, a TOCTOU in `canManageDeck`, and an ordering anomaly in the PATCH shares route. Two info items flag a missing `DeckFormModal` mock and missing backend coverage for `PATCH /library`.

---

## Critical Issues

### CR-01: All owned decks render as library decks when `user` is `null` during auth hydration

**File:** `apps/frontend/src/pages/DecksPage.tsx:199`

**Issue:** The footer branch that selects between owner actions (Edit, Delete) and library actions (Remove from library) is:

```tsx
{deck.ownerId !== user?.id ? (
  // library footer — shows "Remove from library"
) : (
  // owner footer — shows Edit, Delete
)}
```

`user` comes from `useAuth()`. During the window between page mount and auth context hydration (JWT cookie validation, user fetch), `user` is `null`. `user?.id` evaluates to `undefined`. Since `deck.ownerId` (a non-empty UUID string) is never strictly equal to `undefined`, the condition is always `true` during that window — every deck, including decks the authenticated user owns, renders the library footer with the "Remove from library" dropdown item.

A user who clicks quickly on page load will see "Remove from library" for their own decks. Clicking confirm triggers `DELETE /api/decks/:id/library` for an owned deck; the backend returns 403 ("Forbidden.") because no `DeckShare` row exists for `(deckId, ownerId)`, and `toast.error(t('common.somethingWrong'))` fires — but the visual damage is done. More critically, the Edit and Delete actions are unreachable during this window.

**Fix:** Gate deck rendering on `user` being confirmed, or treat an unresolved `user` as the owner to fail safe:

```tsx
{/* Fail-safe: if user not yet loaded, treat as owner — never show destructive library action */}
{user !== null && deck.ownerId !== user.id ? (
  // library footer
) : (
  // owner footer
)}
```

---

## Warnings

### WR-01: Delete confirmation dialog not dismissed when `DELETE /api/decks/:id` fails

**File:** `apps/frontend/src/pages/DecksPage.tsx:88-101`

**Issue:** In `handleDelete`, `setDeleteTargetId(null)` is only called in the success path (line 93). When the server returns a non-2xx response or the request throws, the dialog stays open. There is no dismiss in the `else` branch (line 96) or the `catch` block (line 99). The user sees `toast.error` but the dialog remains, creating the appearance that the action is still pending and enabling double-submission.

**Fix:**

```ts
} else {
  toast.error(t('common.somethingWrong'))
  setDeleteTargetId(null)  // dismiss dialog on failure
}
```

And in the catch block:
```ts
} catch {
  toast.error(t('common.somethingWrong'))
  setDeleteTargetId(null)
}
```

---

### WR-02: Backend test file has zero executable assertions — all four cases are `it.todo` stubs

**File:** `apps/backend/src/routes/__tests__/library-remove.test.ts:9-13`

**Issue:** Every test case in the file is `it.todo(...)`. Nothing is executed. The behavioral guarantees documented in the todo descriptions — 204 on success, 403 on IDOR, CardProgress preservation, absence from study queue — are entirely untested at the backend level. Shipping a phase with only `it.todo` stubs means the backend acceptance criteria have zero runtime verification.

The comment on line 6 acknowledges this is intentional ("Fill in with vi.mock in a future execution pass"), but this leaves the new DELETE endpoint without any server-side test coverage, including the IDOR guard which is the primary security property of this endpoint.

**Fix:** Implement the four stubs with `vi.mock('../../../lib/prisma.js')`. The minimal viable implementation is the 204 success case and the 403 IDOR case:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  deckShare: {
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
}))
vi.mock('../../../lib/prisma.js', () => ({ prisma: mockPrisma }))

// ... test handlers via Hono app instance
```

---

### WR-03: `canManageDeck` issues two sequential queries — TOCTOU allows a just-revoked manager to pass authorization

**File:** `apps/backend/src/routes/decks.ts:16-24`

**Issue:** `canManageDeck` first fetches the `Deck` row (to check `ownerId`), then fetches the `DeckShare` row (to check `permission`). Between those two reads, a concurrent request could revoke the user's MANAGE permission. In that window, the in-flight request passes the auth check with a permission level that no longer exists in the database. The affected routes are: `GET /:id/shares`, `POST /:id/shares`, `PATCH /:id/shares/:sharedWithUserId`, `DELETE /:id/shares/:sharedWithUserId`.

**Fix:** Collapse into a single Prisma query:

```ts
async function canManageDeck(deckId: string, userId: string): Promise<boolean> {
  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    select: {
      ownerId: true,
      shares: {
        where: { sharedWithUserId: userId, permission: 'MANAGE' },
        select: { id: true },
      },
    },
  })
  if (!deck) return false
  return deck.ownerId === userId || deck.shares.length > 0
}
```

---

### WR-04: `PATCH /:id/shares/:sharedWithUserId` checks MANAGE guard before validating the body — 403 is never returned for an invalid body with `permission: 'MANAGE'`

**File:** `apps/backend/src/routes/decks.ts:192-198`

**Issue:** The code parses the body and then checks `body.success && body.data.permission === 'MANAGE'`. If the body fails schema validation but nominally contained `permission: 'MANAGE'`, the MANAGE guard is skipped and a 400 validation error is returned. This is not a security bug (returning 400 is fine), but the guard order is fragile: if `UpdateShareSchema` is ever relaxed or the guard is refactored, an invalid payload could bypass the MANAGE check. More concretely, the current code silently skips the MANAGE guard when body parsing fails, which is subtly different from the intent.

**Fix:** Validate the body first, then apply the MANAGE guard against the validated data:

```ts
const body = UpdateShareSchema.safeParse(await c.req.json())
if (!body.success) {
  return c.json({ error: 'Validation failed.', details: body.error.flatten() }, 400)
}
// Only check MANAGE after confirming body is valid
if (body.data.permission === 'MANAGE' && !(await isDeckOwner(id, userId))) {
  return c.json({ error: 'Only the deck owner can grant MANAGE permission.' }, 403)
}
```

---

## Info

### IN-01: `DeckFormModal` is not mocked in the frontend test file

**File:** `apps/frontend/src/pages/__tests__/DecksPage.test.tsx:81-86`

**Issue:** `renderPage()` renders the full `<DecksPage />`, which includes `<DeckFormModal>`. The modal is not mocked, so its real implementation (and its own dependency chain) is executed in the test environment. If `DeckFormModal` has dependencies that fail in JSDOM (e.g., portal rendering, complex Radix primitives), the tests may fail with misleading errors unrelated to the library remove feature.

**Fix:**

```ts
vi.mock('@/components/DeckFormModal', () => ({
  DeckFormModal: () => null,
}))
```

---

### IN-02: `PATCH /api/decks/:id/library` (the toggle endpoint) has no backend-level tests

**File:** `apps/backend/src/routes/__tests__/library-remove.test.ts`

**Issue:** The test file only stubs behavior for the new DELETE endpoint. The `PATCH /api/decks/:id/library` endpoint (introduced in a prior phase, used by this phase's toggle) has no backend test coverage either in this file or in any visible sibling file. Both the PATCH and DELETE library endpoints lack server-side test coverage.

**Fix:** Extend the backend test file (or create `library.test.ts`) to cover both endpoints. The PATCH endpoint should at minimum test the 403 path (no share row) and the 200 success path.

---

_Reviewed: 2026-06-13T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
