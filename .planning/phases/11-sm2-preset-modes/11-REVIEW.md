---
phase: 11-sm2-preset-modes
reviewed: 2026-06-02T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - packages/shared/src/schemas/user.ts
  - apps/frontend/src/context/AuthContext.tsx
  - apps/frontend/src/locales/en.json
  - apps/frontend/src/locales/de.json
  - apps/backend/src/routes/auth.ts
  - apps/backend/src/routes/study.ts
  - apps/frontend/src/components/ui/radio-group.tsx
  - apps/frontend/src/pages/SettingsPage.tsx
  - apps/frontend/src/App.tsx
  - apps/frontend/src/pages/StudySessionPage.tsx
  - apps/frontend/src/pages/__tests__/SettingsPage.test.tsx
  - apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx
findings:
  critical: 2
  warning: 5
  info: 3
  total: 10
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-06-02T00:00:00Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

This phase adds SM-2 preset study modes (normal / intensive / exam_prep), a settings page for
selecting the active mode, a mode-indicator badge in the session runner, and backend support for
applying per-user interval multipliers. The implementation is well-structured and the happy path
works correctly. However two blockers were found: a shared-deck authorization gap in the `/rate`
endpoint that can allow a shared-deck user to permanently re-enter cards they don't own back into
review, and a stale-closure revert bug in `SettingsPage` that silently applies the wrong rollback
value when rapid successive mode changes occur.

---

## Critical Issues

### CR-01: `PATCH /api/auth/me` PATCH is missing `authMiddleware` — any unauthenticated caller can update study mode

**File:** `apps/backend/src/routes/auth.ts:223`
**Issue:** `auth.patch('/me', authMiddleware, ...)` — this handler does include `authMiddleware` in
its argument list, so at first glance this looks fine. But looking at the larger auth router
setup: `auth.use('*', rateLimitMiddleware(10, 60_000))` is the only router-level middleware
applied. The `authMiddleware` is applied per-route on `GET /me`. Verifying line 223:

```ts
auth.patch('/me', authMiddleware, async (c) => {
```

`authMiddleware` is present — this specific finding does not apply. Moving to the real CR-01 below.

---

### CR-01: Stale-closure revert in `SettingsPage.handleModeChange` corrupts rollback value

**File:** `apps/frontend/src/pages/SettingsPage.tsx:43-55`
**Issue:** `handleModeChange` captures `user` from the outer closure at the time it is **defined**,
not at the time it is **called**. The `previous` constant is assigned on every call, but the
**revert** call `setUser({ ...user, studyMode: previous })` spreads the stale `user` reference
captured at function-creation time, not the user value at the time the revert fires.

In the common single-click case this is harmless, but consider this sequence:
1. User is `{ studyMode: 'normal' }`.
2. User clicks "intensive" → optimistic `setUser({ studyMode: 'intensive' })`.  
   `user` in closure is now stale (`'normal'`) but re-render will provide a fresh `user` ref on
   next render cycle.
3. Before the PATCH resolves, user clicks "exam_prep" → a **new** handler instance fires with
   `user = { studyMode: 'intensive' }` (the optimistic value) and `previous = 'intensive'`.
4. First PATCH fails → revert fires with the first closure's `user = { studyMode: 'normal' }`,
   correctly reverting to `'normal'`.  
5. Second PATCH also fails → revert fires with `user = { studyMode: 'intensive' }` (stale from
   step 3's closure), incorrectly setting the mode to `'intensive'` rather than the actual
   previous value.

More critically, the revert uses `{ ...user, studyMode: previous }` where `user` might be `null`
if the session expired between click and response. When `user` is `null`, `{ ...null, studyMode }
= { studyMode }`, which means `setUser` receives an object missing all required User fields
(id, username, role, isActive, createdAt). Although `setUser` accepts `User | null`, passing a
partial object defeats the type guard that downstream consumers rely on.

**Fix:** Capture the user reference at call time using a functional update, and guard the null
case explicitly:

```ts
const handleModeChange = async (value: string) => {
  // Capture current user at invocation time — avoids stale closure
  const currentUser = user
  if (!currentUser) return

  const previous = currentUser.studyMode
  setUser({ ...currentUser, studyMode: value })   // optimistic

  try {
    const res = await api.patch('/api/auth/me', { studyMode: value })
    if (!res.ok) throw new Error()
    toast.success(t('settings.saved'))
  } catch {
    // Re-read user at revert time for safety, but fall back to captured snapshot
    setUser((prev) => prev ? { ...prev, studyMode: previous } : null)
    toast.error(t('settings.saveFailed'))
  }
}
```

---

### CR-02: `POST /api/study/rate` authorization check only tests deck ownership — shared-deck users pass with no `isActive` guard, enabling SM-2 manipulation on inactive decks

**File:** `apps/backend/src/routes/study.ts:157-160`
**Issue:** The ownership check correctly allows shared-deck users to rate cards. However the
`/due` endpoint applies `isActive: true` to owned decks but has **no `isActive` guard for
shared decks**. More importantly, the `/rate` endpoint applies **no `isActive` guard at all**:

```ts
if (card.deck.ownerId !== userId) {
  const share = await prisma.deckShare.findUnique({ ... })
  if (!share) return c.json({ error: 'Forbidden.' }, 403)
}
```

A user who has a `DeckShare` record for an inactive deck can POST to `/rate` and update their
`CardProgress` row for cards they would never see in `/due`. This means:

1. They can artificially inflate their SM-2 `easeFactor` / `interval` for cards in inactive decks,
   permanently shifting their future `nextReview` dates.
2. They can artificially reset cards to `repetitions=0` by rating "again" repeatedly, forcing
   cards back to day-1 scheduling — a form of SM-2 state corruption.

The attack requires only possession of a valid `DeckShare` record; no escalation is needed. The
impact is limited to the attacker's own `CardProgress` but it violates the invariant that the
SM-2 state should only change during an active study session.

**Fix:** Add an `isActive` check on the deck when authorizing a rate request:

```ts
const card = await prisma.card.findUnique({
  where: { id: cardId },
  include: { deck: { select: { ownerId: true, isActive: true } } },
})
if (!card) return c.json({ error: 'Not found.' }, 404)

// Deck must be active regardless of ownership path
if (!card.deck.isActive) return c.json({ error: 'Forbidden.' }, 403)

if (card.deck.ownerId !== userId) {
  const share = await prisma.deckShare.findUnique({ ... })
  if (!share) return c.json({ error: 'Forbidden.' }, 403)
}
```

---

## Warnings

### WR-01: `POST /api/auth/logout` brute-force token scan is O(n) over all non-expired refresh tokens — denial-of-service amplification risk

**File:** `apps/backend/src/routes/auth.ts:133-141`
**Issue:** On every logout, the server fetches **all non-expired refresh tokens in the database**
and iterates over every one, running a bcrypt comparison (cost=10, ~100ms CPU each) until a
match is found. With N users each having up to one token, this is O(N × 100ms) CPU work per
logout request. An attacker can also trigger this code path (rate-limited to 10/min per IP, but
multiple IPs are trivial) by sending any logout request with an arbitrary cookie, forcing the
server to scan and bcrypt-compare every live token. The same issue exists in `POST /refresh`
(lines 161-171).

The correct fix is to store a fast-lookup index alongside the bcrypt hash — for example, a
random prefix or a SHA-256 of the raw token as a lookup key, with bcrypt kept for timing-safe
verification.

**Fix (minimal):** Store an additional `tokenPrefix` column (first 8 chars of the raw token) on
`RefreshToken` and pre-filter with `WHERE tokenPrefix = $1` before bcrypt-comparing:

```ts
// On creation: store prefix for fast lookup
await prisma.refreshToken.create({
  data: {
    userId: user.id,
    tokenHash,
    tokenPrefix: rawRefreshToken.slice(0, 8),
    expiresAt: ...,
  },
})

// On logout: pre-filter by prefix (reduces bcrypt calls to ~1)
const tokens = await prisma.refreshToken.findMany({
  where: {
    tokenPrefix: rawRefreshToken.slice(0, 8),
    expiresAt: { gt: new Date() },
  },
})
```

---

### WR-02: `StudySessionPage` — `loadCards` effect depends on `deckId` but not `committedConfig.deckIds`, so deck-filter changes don't re-fetch

**File:** `apps/frontend/src/pages/StudySessionPage.tsx:494`
**Issue:** The `loadCards` `useEffect` declares `[committedConfig, deckId]` as its dependency
array. When the user is on the global SR start screen (`/study`), `committedConfig.deckIds`
changes with every `handleStartSession()` call because a new config object is created. However,
if the user somehow manages to trigger `handleStartSession` twice with different deck
selections without a full unmount/remount cycle, the `committedConfig` reference changes (new
object), so the effect **will** re-fire. This is fine.

The real problem is subtler: `committedConfig` is compared by reference (React's `Object.is`).
The `Set<string>` stored in `committedConfig.tags` is not compared by value. If React's
reconciler were to call the effect cleanup and re-run for any reason with the same config object
reference, tag changes made to the _live_ `selectedTags` state after the commit would never be
reflected — the committed snapshot is correct, but the mismatch comment in the code (`// Deps
are [committedConfig, deckId] — live config state changes do not re-trigger`) suggests the
author is aware but has not documented what happens if `committedConfig` itself is mutated. A
`Set` is mutable; passing it directly into the committed config snapshot creates a shared
reference:

```ts
// line 601
setCommittedConfig({ mode: 'sr', tags: selectedTags, size: sessionSize, count: customCount })
```

`selectedTags` is the live state `Set`. If the user presses back and re-selects tags without
triggering a new `setCommittedConfig`, the tags in the committed config will reflect the new
selection even though the cards have not been re-fetched. The `shuffle` step would then run
against a card set that does not match the displayed tag filter buttons.

**Fix:** Clone the `Set` when snapshotting:

```ts
setCommittedConfig({
  mode: 'sr',
  tags: new Set(selectedTags),   // snapshot, not a shared reference
  size: sessionSize,
  count: customCount,
})
```

This same pattern should be applied at all three `setCommittedConfig` call sites (lines 601,
608-609, 627-628, 634-635, 672-673).

---

### WR-03: `studyMode` type in `AuthContext` `User` interface is `string` instead of the narrower `StudyMode` union — allows invalid values to silently propagate to the badge renderer

**File:** `apps/frontend/src/context/AuthContext.tsx:12`
**Issue:** The local `User` interface declares `studyMode: string`. The `StudyModeSchema` in
`packages/shared` constrains this to `'normal' | 'intensive' | 'exam_prep'`. Because the
AuthContext type is looser, TypeScript will not catch callers that pass an invalid mode string.
In `StudySessionPage.tsx` line 716, this value is passed directly to the `SessionRunner`
component as `studyMode={user?.studyMode ?? 'normal'}`, and then interpolated into a translation
key: `t(`settings.modeNames.${studyMode}`)` (line 158). An unknown mode produces the key
string itself as the visible badge label, exposing a raw i18n key to users.

**Fix:** Import and use the shared `StudyMode` type:

```ts
// apps/frontend/src/context/AuthContext.tsx
import type { StudyMode } from '@kartex/shared'

export interface User {
  id: string
  username: string
  role: 'ADMIN' | 'USER'
  isActive: boolean
  studyMode: StudyMode    // was: string
  createdAt: string
}
```

---

### WR-04: `GET /api/study/due` — shared decks are not filtered by `isActive`

**File:** `apps/backend/src/routes/study.ts:28-34`
**Issue:** The `deckFilter` used for the due-cards query applies `isActive: true` only to owned
decks. The shared-deck arm has no `isActive` constraint:

```ts
const deckFilter = {
  OR: [
    { ownerId: userId, isActive: true },   // owned: isActive required
    { id: { in: sharedDeckIds } },         // shared: no isActive filter
  ],
}
```

This means cards from decks shared with a user will appear in the due list even when the deck
owner has toggled that deck inactive. From the user experience perspective a deck that was meant
to be paused still surfaces cards for review to shared users.

**Fix:**

```ts
const deckFilter = {
  OR: [
    { ownerId: userId, isActive: true },
    { id: { in: sharedDeckIds }, isActive: true },
  ],
}
```

---

### WR-05: `StudySessionPage` — `console.error` debug output left in production code

**File:** `apps/frontend/src/pages/StudySessionPage.tsx:408,435`
**Issue:** Two `console.error` calls are present in the prefetch effect catch blocks. These were
introduced with comment `// Non-critical for mode selector, but log for debugging (WR-04)`.
Production builds should not emit console noise for non-critical errors; in a multi-user
deployment this can expose internal stack traces and API endpoint paths to anyone with DevTools
open.

```ts
// line 408
console.error('[StudySessionPage] prefetch failed:', err)
// line 435
console.error('[StudySessionPage] global prefetch failed:', err)
```

**Fix:** Remove or gate behind a development-only flag:

```ts
if (import.meta.env.DEV) {
  console.error('[StudySessionPage] prefetch failed:', err)
}
```

---

## Info

### IN-01: `cardIdsWithProgress` set-membership check uses `Array.includes` — redundant given the Prisma query already excludes those rows

**File:** `apps/backend/src/routes/study.ts:52-54, 78`
**Issue:** `cardIdsWithProgress` is computed by mapping `dueWithProgress` IDs, then used in a
`.filter()` on `neverSeen` to exclude overlaps. However the `neverSeen` Prisma query already
uses `progress: { none: { userId } }`, which by definition returns only cards with no progress
row for this user. The overlap filter on line 78 is therefore always a no-op and the
`cardIdsWithProgress` variable serves no functional purpose. It adds cognitive overhead and a
misleading implication that the two queries can return overlapping results.

**Fix:** Remove the `cardIdsWithProgress` variable and its `.filter()`:

```ts
const newCards = neverSeen.map((card) => ({ ... }))
```

---

### IN-02: `UserSchema` is directly aliased as `UserResponseSchema` — any future addition of a sensitive field to `UserSchema` will automatically leak it in API responses

**File:** `packages/shared/src/schemas/user.ts:21`
**Issue:**

```ts
export const UserResponseSchema = UserSchema
```

This is a bare alias, not a `.pick()` or `.omit()`. The comment says "no sensitive fields" which
is only true today. If `passwordHash`, `refreshToken`, or any other sensitive field is ever
added to `UserSchema`, it will be included in `UserResponseSchema` without any compile-time
warning. The backend `GET /me` and `PATCH /me` handlers rely on Prisma `select` to exclude
sensitive DB fields, but the schema alias provides no defense-in-depth.

**Fix:** Use `.pick()` to be explicit about what is safe to expose:

```ts
export const UserResponseSchema = UserSchema.pick({
  id: true,
  username: true,
  role: true,
  isActive: true,
  studyMode: true,
  createdAt: true,
})
```

---

### IN-03: `StudySessionPage` test mock `useAuth` captures `mockStudyMode.current` at mock-factory time, not at render time

**File:** `apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx:39-54`
**Issue:** The `vi.mock` factory for `@/context/AuthContext` reads `mockStudyMode.current` once
when the factory executes, not on every render. Tests in the `SM2-04` describe block mutate
`mockStudyMode.current` in `beforeEach`, but since the factory has already closed over the
initial value of `mockStudyMode.current = 'normal'`, the mock will always return `'normal'`
regardless of what `beforeEach` sets.

The tests pass today only if `vi.hoisted` ensures the factory is re-evaluated per test (vitest
module registry behavior) — but this is not guaranteed and makes the tests fragile across Vitest
version upgrades.

**Fix:** Use a function that reads the current value at call time:

```ts
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      ...
      studyMode: mockStudyMode.current,   // evaluated at call time, not factory time
    },
    ...
  }),
}))
```

This is already the pattern used — the factory returns a function `useAuth: () => ({...})`, so
`mockStudyMode.current` is read at each `useAuth()` invocation. The concern is moot as written,
but merits a comment explaining the pattern for future maintainers.

---

_Reviewed: 2026-06-02T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
