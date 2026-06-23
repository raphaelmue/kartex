---
phase: 23-auth-foundation
reviewed: 2026-06-24T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - apps/backend/prisma/migrations/20260621000000_add_user_email/migration.sql
  - apps/backend/prisma/schema.prisma
  - apps/backend/src/index.ts
  - apps/backend/src/lib/mailer.ts
  - apps/backend/src/routes/admin.ts
  - apps/backend/src/routes/__tests__/admin-delete.test.ts
  - apps/backend/src/routes/__tests__/admin-mailer.test.ts
  - apps/frontend/src/locales/de.json
  - apps/frontend/src/locales/en.json
  - apps/frontend/src/pages/AdminPage.tsx
  - packages/shared/src/schemas/user.ts
findings:
  critical: 3
  warning: 4
  info: 3
  total: 10
status: issues_found
---

# Phase 23: Code Review Report

**Reviewed:** 2026-06-24T00:00:00Z
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

This phase adds: (1) a nullable `email` column to `User`, (2) a nodemailer SMTP singleton (`mailer.ts`) with a test-email endpoint, (3) a hard-delete endpoint for users (`DELETE /api/admin/users/:id`) with cascade ordering and guards, and (4) frontend admin UI for user deletion and mailer testing.

The cascade-delete ordering, media cleanup design, and guard logic are well thought out. However, three critical issues were found: a race condition in the last-admin guard, complete absence of a mechanism to set the admin email address (rendering the test-email feature permanently non-functional in practice), and internal SMTP error details being leaked to API clients. Four warnings cover the role self-demotion gap, missing `CardProgress.userId` cascade in schema, missing email-set endpoint, and the `confirmRef` dead code. Three info items address test placeholder quality, invite code entropy, and minor i18n issues.

---

## Critical Issues

### CR-01: Last-Admin Guard Has a TOCTOU Race Condition

**File:** `apps/backend/src/routes/admin.ts:93-132`

**Issue:** The last-admin guard reads `adminCount` with a plain `SELECT COUNT(*)` at line 99, then proceeds through media cleanup and `deckIds` pre-computation before the `$transaction` at line 124. Between the count query and the delete transaction there is a window where two concurrent DELETE requests targeting two different admins can both observe `adminCount = 2`, both pass the guard, and both commit their transactions, leaving zero active admins. For a multi-user (2-5 person) instance this is low-probability but the consequence is a complete admin lockout with no self-recovery path.

**Fix:** Perform the count check inside an interactive transaction (or use `prisma.$transaction` with a serializable isolation level) so the guard and the delete are atomic:

```typescript
await prisma.$transaction(async (tx) => {
  const target = await tx.user.findUnique({ where: { id } })
  if (!target) throw new NotFoundError()

  if (id === authenticatedUserId) throw new SelfDeleteError()

  if (target.role === 'ADMIN') {
    const adminCount = await tx.user.count({ where: { role: 'ADMIN', isActive: true } })
    if (adminCount <= 1) throw new LastAdminError()
  }

  // cascade deletes …
  await tx.user.delete({ where: { id } })
}, { isolationLevel: 'Serializable' })
```

An alternative is to hold a `SELECT … FOR UPDATE` lock on the user row, but the interactive transaction approach is cleaner with Prisma.

---

### CR-02: No Mechanism to Set Admin Email — `testEmailNoEmail` Error Is Permanently Reachable

**File:** `apps/backend/src/routes/admin.ts:208-238` and `apps/backend/src/routes/auth.ts:229-244`

**Issue:** `POST /api/admin/mailer/test` returns `{ error: 'NO_EMAIL' }` when the calling admin has no email set. The only endpoint that updates a user's own profile is `PATCH /api/auth/me`, which exclusively updates `studyMode` (confirmed: `apps/backend/src/routes/auth.ts:230-240`). There is no endpoint that allows a user — or any admin — to set the `email` field. The admin email column is populated at the database level only. Any admin that doesn't have an email pre-seeded in the DB can never send a test email, and there is no UI path to fix this. The feature is silently broken for all realistically created admin accounts.

**Fix:** Add a `PATCH /api/auth/me` handler branch (or a new `PATCH /api/admin/users/:id/email`) that accepts and validates an email address:

```typescript
// In auth.ts PATCH /me — extend body schema
export const UpdateProfileSchema = z.object({
  studyMode: StudyModeSchema.optional(),
  email: z.string().email().nullable().optional(),
})

// In handler:
const data: { studyMode?: string; email?: string | null } = {}
if (body.data.studyMode !== undefined) data.studyMode = body.data.studyMode
if (body.data.email !== undefined) data.email = body.data.email
```

Alternatively, expose the email field as editable in the admin user PATCH endpoint and let admins set their own email from the settings page.

---

### CR-03: Raw SMTP Error Message Leaked to API Clients

**File:** `apps/backend/src/routes/admin.ts:235-236`

**Issue:** When `verifyConnection()` or `sendMail()` throws, the catch block returns the raw exception message directly to the HTTP client:

```typescript
return c.json({ error: (err as Error).message }, 500)
```

SMTP errors frequently contain internal host names, TLS certificate details, authentication failure reasons, or credentials-adjacent information (e.g., `"535 Authentication failed for user smtp-user@internal.corp.example.com"`). This constitutes internal infrastructure disclosure.

**Fix:** Log the full error server-side and return a generic message to the client:

```typescript
} catch (err) {
  console.error('[admin] Mailer test failed:', (err as Error).message)
  return c.json({ error: 'Failed to send test email. Check server logs for details.' }, 500)
}
```

---

## Warnings

### WR-01: Admin Can Demote Themselves to USER Role — No Guard

**File:** `apps/backend/src/routes/admin.ts:27-77`

**Issue:** `PATCH /api/admin/users/:id` guards against self-deactivation (`isActive: false`) at line 50, but it does not prevent an admin from setting their own `role` to `'USER'`. If the only admin does this, they immediately lose access to all `/api/admin/*` routes (protected by `requireAdmin` middleware in `index.ts:80`). The admin panel becomes inaccessible with no recovery path other than direct DB manipulation. This is a distinct scenario from the last-admin deletion guard — it is not covered by any existing check.

**Fix:** Add a guard analogous to the self-deactivation guard:

```typescript
// Prevent admin self-demotion
if (id === authenticatedUserId && body.role === 'USER') {
  return c.json({ error: 'Cannot remove admin role from your own account.' }, 400)
}
```

---

### WR-02: `CardProgress.userId` FK Has No `onDelete` — Inconsistency with Transaction Comment

**File:** `apps/backend/prisma/schema.prisma:118-119`

**Issue:** The `CardProgress` model's `userId` FK has no `onDelete` annotation (defaults to `Restrict` in Prisma/PostgreSQL). The code comment at `admin.ts:118` claims that `ReviewLog` auto-cascades via its `userId` FK (correct — schema line 134 has `onDelete: Cascade`). However, `CardProgress.userId` also has no `onDelete: Cascade`. This means the explicit `prisma.cardProgress.deleteMany({ where: { userId: id } })` step at `admin.ts:127` is mandatory and correctly present, but the schema inconsistency is a defect: if the explicit step were ever removed or reordered, Prisma would throw a FK constraint violation rather than silently succeeding or cascading.

More importantly, the transaction comment at line 118 only mentions `ReviewLog` auto-cascading, which could mislead future maintainers into thinking `CardProgress` also auto-cascades and the explicit step is redundant (causing them to remove it).

**Fix:** Either add `onDelete: Cascade` to `CardProgress.userId` for consistency with `ReviewLog`:

```prisma
model CardProgress {
  userId  String
  user    User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  // ...
}
```

Or update the comment to explicitly state that `CardProgress` does NOT auto-cascade and that the explicit delete step is required.

---

### WR-03: `confirmRef` Is Assigned But Never Used — Dead Accessibility Code

**File:** `apps/frontend/src/pages/AdminPage.tsx:125,256`

**Issue:** `const confirmRef = useRef<HTMLSpanElement | null>(null)` is declared at line 125 and attached to the confirm-delete span at line 256. However, `confirmRef.current` is never read or called anywhere in the component. The evident intent was to call `confirmRef.current?.focus()` when `confirmDeleteId` changes to the current invite code ID (to shift keyboard focus to the inline confirmation buttons, giving keyboard users a way to confirm/cancel without mousing). Without the `focus()` call, the confirmation buttons appear but keyboard focus stays on the "Delete" button that just disappeared from the DOM — a keyboard accessibility regression.

**Fix:** Add a `useEffect` to shift focus when the inline confirmation opens:

```typescript
useEffect(() => {
  if (confirmDeleteId !== null) {
    confirmRef.current?.focus()
  }
}, [confirmDeleteId])
```

---

### WR-04: `SMTP_SECURE` Excluded From `allPresent` Check — Silent Misconfiguration

**File:** `apps/backend/src/lib/mailer.ts:18-20`

**Issue:** The `requiredVars` array at line 18 lists `['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM']` — `SMTP_SECURE` is intentionally omitted (it has a safe default of `false`). However, the `allPresent` check at line 19-20 also omits `SMTP_SECURE`, which is correct. The defect is that `requiredVars` is used only in error messages (`sendMail` and `verifyConnection` throw messages listing required vars), yet `SMTP_SECURE` is genuinely optional and its absence from the list is correct. There is no bug here in isolation.

The actual issue is subtler: `SMTP_SECURE` is read from env at module load time (line 11) and evaluated as `SMTP_SECURE === 'true'` (line 26). Any value other than the exact string `'true'` (e.g., `'1'`, `'yes'`, `'TRUE'`) silently defaults to `false` (plain SMTP, no TLS). This is not documented anywhere in the code or env var comments, and operators who set `SMTP_SECURE=1` will unexpectedly get unencrypted connections.

**Fix:** Document the accepted values and consider accepting truthy variants:

```typescript
const secure = ['true', '1', 'yes'].includes((SMTP_SECURE ?? '').toLowerCase())
```

Or add a startup warning when `SMTP_SECURE` is set to an unrecognized value:

```typescript
if (SMTP_SECURE !== undefined && SMTP_SECURE !== 'true' && SMTP_SECURE !== 'false') {
  console.warn(`[mailer] Unrecognized SMTP_SECURE value "${SMTP_SECURE}" — defaulting to false (no TLS)`)
}
```

---

## Info

### IN-01: All Meaningful Tests Are `it.todo()` — No Behavioral Coverage

**File:** `apps/backend/src/routes/__tests__/admin-delete.test.ts` and `apps/backend/src/routes/__tests__/admin-mailer.test.ts`

**Issue:** Both test files contain zero passing behavioral tests. `admin-delete.test.ts` has 10 `it.todo()` stubs and three passing tests that assert only string literal equality (`expect('SELF_DELETE').toBe('SELF_DELETE')`) or `expect(true).toBe(true)` — these tests cannot fail regardless of the production code's behavior and provide no regression protection. `admin-mailer.test.ts` has 6 `it.todo()` stubs and zero passing tests. The critical paths — cascade order, last-admin guard, self-delete guard, SMTP error handling — are completely uncovered.

**Fix:** Implement the stubs using `vi.mock('../../../lib/prisma.js')` and `vi.mock('../../../lib/mailer.js')` as the file comments indicate was the plan. This is marked as a future execution pass in the file comments, but shipping production features with zero behavioral test coverage is a quality gap.

---

### IN-02: Invite Code Entropy Is 60 Bits — Acceptable But Worth Documenting

**File:** `apps/backend/src/routes/admin.ts:169-173`

**Issue:** The invite code is generated by taking a UUID v4 (122 bits of entropy), stripping hyphens, and slicing to 12 uppercase hex characters. A UUID v4 hex string (32 chars, 0-9A-F) has exactly 4 bits per character, so 12 characters = 48 bits of entropy. After `toUpperCase()` the character set is still hexadecimal (16 symbols), not full alphanumeric (36), so entropy remains 48 bits, not the 60+ bits a 12-character alphanumeric code would provide. At 48 bits, the code is adequate for a low-volume invite system (the backend has no apparent rate-limiting on the registration endpoint, though that's out of scope), but the entropy is lower than it appears from reading the code.

**Fix:** No action required for the current threat model. Document the calculation in a comment, or use `crypto.randomBytes(9).toString('base64url').slice(0, 12).toUpperCase()` for a true 12-character code with higher entropy if desired.

---

### IN-03: `UserResponseSchema` Is an Alias of `UserSchema` With No Distinction

**File:** `packages/shared/src/schemas/user.ts:22-24`

**Issue:** `UserResponseSchema` is declared as `export const UserResponseSchema = UserSchema` with a comment "Safe public shape — no sensitive fields." However, `UserSchema` itself already includes `email`, `studyMode`, and `role`. There is no differentiation — `UserResponseSchema` is the exact same Zod object as `UserSchema`. If a truly safe public shape is intended (e.g., excluding `studyMode` or restricting email visibility), the alias provides false documentation assurance. If they are meant to be the same, the alias and comment add confusion.

**Fix:** If the intent is to have a distinct response shape in the future, define it as a `pick` or `omit` of `UserSchema`. If they are meant to be identical, remove the alias and use `UserSchema` directly, or at minimum update the comment to clarify they are currently identical.

---

_Reviewed: 2026-06-24T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
