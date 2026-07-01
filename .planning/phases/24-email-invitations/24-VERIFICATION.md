---
phase: 24-email-invitations
verified: 2026-07-01T08:29:52Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 1
overrides:
  - truth: "After registration the invite link is consumed — a second click shows a clear 'already used' error page (not a crash or blank page)"
    accepted_by: "human (UAT 24-UAT.md test 9, plus plan 06/07 auth-bypass fix verified via A1/A2 automated coverage)"
    accepted_at: "2026-07-01T08:29:52Z"
    reason: >
      Sequential reuse (register, then revisit same link) was manually tested and passed
      (24-UAT.md test 9) — matching this report's own stated sufficiency bar ("a manual
      sequential test... is sufficient to confirm the consumed-token path works end-to-end").
      The stricter two-simultaneous-request race was accepted without a live concurrency test:
      the TOCTOU guard (prisma.$transaction + updateMany WHERE usedAt IS NULL +
      result.count===0 abort) is a standard correct pattern whose exactly-once guarantee comes
      from Postgres transaction serialisation, not application logic.
---

# Phase 24: Email Invitations Verification Report

**Phase Goal:** Admin can invite new users via email and invitees can register through the one-time link
**Verified:** 2026-07-01T08:29:52Z
**Status:** passed
**Re-verification:** Yes — canonicalized after 24-UAT.md completed (11/11 passed, 0 issues), including coverage for plans 06/07 (auth-bypass fix) which landed after the original 2026-06-27 run

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Admin enters an email address in the admin panel and triggers an invitation; the invitee receives an email with a unique link | ✓ VERIFIED | `InviteTokensSection` in `AdminPage.tsx` calls `api.post('/api/admin/invites', { email })`; backend `POST /invites` in `admin.ts` uses `randomBytes(32).toString('hex')`, creates `InviteToken`, calls `sendMail` with link; guarded by `isConfigured()`; AdminPage.test.tsx EMAIL-03 passes |
| 2 | Clicking the invite link opens a registration page with the email pre-filled and read-only; user sets username and password to complete registration | ✓ VERIFIED | `InviteRegisterPage.tsx` fetches `GET /api/invites/:token`, sets email from response, renders a disabled email `<Input>` not in RegisterSchema; `RegisterSchema` has `{ username, password, token }` only; confirmPassword is client-only via `useRef`; InviteRegisterPage.test.tsx EMAIL-05 (5 tests) passes |
| 3 | After registration the invite link is consumed — a second click shows a clear "already used" error page (not a crash or blank page) | ✓ VERIFIED (override) | Code: `auth.ts` marks `usedAt = new Date()` inside `prisma.$transaction` with `updateMany WHERE usedAt IS NULL + result.count===0 throw`; `invites.ts` returns ALREADY_USED when `usedAt !== null`; `InviteRegisterPage` renders error card with `auth.inviteAlreadyUsed`; sequential reuse manually confirmed in 24-UAT.md test 9 (pass); concurrent TOCTOU race accepted on Postgres transaction-serialisation guarantee, not independently load-tested |
| 4 | Admin can view all pending (unused, non-expired) invitations in the admin panel | ✓ VERIFIED | `admin.ts GET /invites` filters `usedAt: null, expiresAt: { gt: new Date() }`, omits `token` field from `select`; `InviteTokensSection` fetches and renders Email/Sent/Expires table; AdminPage.test.tsx EMAIL-07 (column headers + data row) passes |
| 5 | Admin can revoke a pending invitation; revoked tokens are immediately invalid | ✓ VERIFIED | `admin.ts DELETE /invites/:id` returns 400 when `usedAt !== null`, otherwise deletes the row; `InviteTokensSection` `handleRevoke` calls `api.delete`, optimistically removes row, toasts `admin.inviteRevokeSuccess`; AdminPage.test.tsx EMAIL-08 passes; deleted row returns NOT_FOUND on next GET (code-analysis) |

**Score:** 5/5 truths verified (1 confirmed via human override — see Overrides)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/backend/prisma/schema.prisma` | `InviteToken` model, no `InviteCode` model, no `User.inviteCodeUsed` | ✓ VERIFIED | `model InviteToken` with `id, email, token @unique, expiresAt, usedAt?, createdAt` at lines 61-68; `InviteCode` model absent; `User` model has no `inviteCodeUsed` field |
| `apps/backend/prisma/migrations/20260625000000_replace_invite_code_with_invite_token/migration.sql` | DROP InviteCode, CREATE InviteToken, unique index | ✓ VERIFIED | SQL contains `DROP TABLE IF EXISTS "InviteCode"`, `CREATE TABLE "InviteToken"`, `CREATE UNIQUE INDEX "InviteToken_token_key"` |
| `packages/shared/src/schemas/auth.ts` | `RegisterSchema` with `token` field, no `inviteCode` | ✓ VERIFIED | `RegisterSchema` has `token: z.string().min(1, 'Invite token is required.')` and no `inviteCode` or `confirmPassword` field |
| `apps/backend/src/routes/invites.ts` | Public `invitesPublicRouter` with `GET /:token` returning distinct error codes | ✓ VERIFIED | Exports `invitesPublicRouter`; handler returns `200 { email }` for valid token, `400 { error: 'NOT_FOUND' / 'ALREADY_USED' / 'EXPIRED' }` for three invalid states; token/usedAt never returned |
| `apps/backend/src/routes/admin.ts` | `GET /invites`, `POST /invites`, `DELETE /invites/:id`; no `inviteCode` references | ✓ VERIFIED | Three handlers present; `randomBytes(32).toString('hex')` token generation; `isConfigured()` guard; sendMail rollback; active-only filter; `select` omits `token`; no `prisma.inviteCode` reference anywhere in file |
| `apps/backend/src/routes/auth.ts` | `POST /register` uses `token`, TOCTOU-safe `$transaction` | ✓ VERIFIED | Destructures `{ username, password, token }`; `prisma.$transaction` with `updateMany WHERE usedAt IS NULL + count===0 throw`; `role: 'USER'` hard-coded; `email` from invite row |
| `apps/frontend/src/pages/InviteRegisterPage.tsx` | Three states: loading / error (3 variants) / form with pre-filled read-only email | ✓ VERIFIED | `status: 'loading' | 'ok' | 'error'`; error state maps ALREADY_USED/EXPIRED/otherwise to three distinct i18n keys; email `<Input>` is `disabled` and outside RegisterSchema |
| `apps/frontend/src/pages/__tests__/InviteRegisterPage.test.tsx` | Tests for valid-token form + three error codes | ✓ VERIFIED | 10 tests covering EMAIL-05 (form, disabled email, POST body, navigation) and EMAIL-06 (ALREADY_USED, EXPIRED, NOT_FOUND, network error, inline rendering) |
| `apps/frontend/src/App.tsx` | `/invite/:token` outside `ProtectedRoute`, no `/register` | ✓ VERIFIED | Line 58: `<Route path="/invite/:token" element={<InviteRegisterPage />} />` placed before `<Route element={<ProtectedRoute />}>` at line 60; no `/register` route present |
| `apps/frontend/src/pages/RegisterPage.tsx` | DELETED | ✓ VERIFIED | File does not exist on disk |
| `apps/frontend/src/pages/AdminPage.tsx` | `InviteTokensSection` with send/list/revoke; no `InviteCodesSection` | ✓ VERIFIED | `InviteTokensSection` component defined (lines 108-241); `<InviteTokensSection />` rendered in `AdminPage`; no `InviteCodesSection`, `InviteCode` interface (old), `getInviteCodeStatus`, or `InviteStatusBadge` present |
| `apps/frontend/src/pages/__tests__/AdminPage.test.tsx` | Tests for EMAIL-03/07/08 | ✓ VERIFIED | 5 tests covering `InviteTokensSection` — pending table (EMAIL-07), send invite POST (EMAIL-03), revoke DELETE (EMAIL-08) |
| `apps/frontend/src/locales/en.json` + `de.json` | 23 new invite i18n keys in both locales | ✓ VERIFIED | All 11 `auth.*` keys and 12 `admin.*` keys present with correct values and `{{email}}` interpolation in both files |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/backend/src/index.ts` | `invitesPublicRouter` | `app.route('/api/invites', invitesPublicRouter)` BEFORE `authMiddleware` | ✓ WIRED | Line 60: public mount; line 63: `app.use('/api/*', authMiddleware)` — correct order confirmed |
| `apps/backend/src/index.ts` | `adminRouter` | `app.use('/api/admin/*', requireAdmin)` then `app.route('/api/admin', adminRouter)` | ✓ WIRED | Lines 86-87; new invite routes in `adminRouter` inherit `requireAdmin` middleware |
| `InviteRegisterPage.tsx` | `GET /api/invites/:token` | `api.get('/api/invites/' + token)` in `useEffect` on mount | ✓ WIRED | Line 64; response used to set `email` and `status` |
| `InviteRegisterPage.tsx` | `POST /api/auth/register` | `api.post('/api/auth/register', values)` in `onSubmit` | ✓ WIRED | Line 91; `values` = `RegisterInput { token, username, password }` — no confirmPassword |
| `AdminPage.tsx InviteTokensSection` | `GET /api/admin/invites` | `api.get('/api/admin/invites')` in `fetchTokens()` | ✓ WIRED | Line 116; called on mount and after send/revoke |
| `AdminPage.tsx InviteTokensSection` | `POST /api/admin/invites` | `api.post('/api/admin/invites', { email })` in `handleSendInvite` | ✓ WIRED | Line 134 |
| `AdminPage.tsx InviteTokensSection` | `DELETE /api/admin/invites/${id}` | `api.delete(...)` in `handleRevoke` | ✓ WIRED | Line 157 |
| `auth.ts POST /register` | `prisma.$transaction` | `updateMany WHERE { token, usedAt: null }` + `result.count === 0` throw | ✓ WIRED | Lines 73-89; `throw` (not `return`) used inside callback per Pitfall 7 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `InviteRegisterPage.tsx` | `email` state | `api.get('/api/invites/:token')` → invites.ts `prisma.inviteToken.findUnique` → `invite.email` | Yes — DB lookup or 400 error | ✓ FLOWING |
| `AdminPage.tsx InviteTokensSection` | `tokens` state | `api.get('/api/admin/invites')` → admin.ts `prisma.inviteToken.findMany({ where: { usedAt: null, expiresAt: { gt: now } } })` | Yes — active-only DB query | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Frontend test suite: 138 tests | `yarn workspace @kartex/frontend vitest run` | 17 files, 138 tests passed | ✓ PASS |
| Backend typecheck | `yarn workspace @kartex/backend typecheck` | exit 0 (no output = no errors) | ✓ PASS |
| InviteRegisterPage tests (10 tests) | `vitest run InviteRegisterPage.test.tsx` (included in suite run) | Covered in 138-test run | ✓ PASS |
| AdminPage tests (5 tests) | `vitest run AdminPage.test.tsx` (included in suite run) | Covered in 138-test run | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| EMAIL-03 | 24-03, 24-05 | Admin can send email invitation | ✓ SATISFIED | `POST /api/admin/invites` in admin.ts; `InviteTokensSection` send form; AdminPage.test.tsx |
| EMAIL-04 | 24-01, 24-03 | Invite link is one-time with 7-day expiry, cryptographically strong token | ✓ SATISFIED | `randomBytes(32).toString('hex')` (256-bit); `expiresAt = now + 7 days`; `usedAt` consumed atomically |
| EMAIL-05 | 24-04 | Invitee registers through link with email pre-filled read-only | ✓ SATISFIED | InviteRegisterPage: disabled email input outside RegisterSchema; token in hidden field; tests verify disabled email and POST body |
| EMAIL-06 | 24-03, 24-04 | Invite link is single-use; replay shows "already used" | ✓ SATISFIED (override) | Sequential reuse confirmed by 24-UAT.md test 9 (pass); TOCTOU concurrent-race invariant accepted on Postgres serialisation guarantee, not independently load-tested |
| EMAIL-07 | 24-03, 24-05 | Admin sees pending (unused, non-expired) invitations | ✓ SATISFIED | `GET /invites` active-only filter; `InviteTokensSection` table; AdminPage.test.tsx |
| EMAIL-08 | 24-03, 24-05 | Admin can revoke a pending invitation | ✓ SATISFIED | `DELETE /invites/:id` with used-guard; Trash2 icon button; AdminPage.test.tsx |

### Anti-Patterns Found

| File | Finding | Severity | Impact |
|------|---------|----------|--------|
| `packages/shared/src/schemas/inviteCode.ts` | Stale file still present and exported from `packages/shared/src/index.ts`; exports `InviteCodeSchema`, `InviteCode`, `InviteCodeStatus`, `getInviteCodeStatus` | ⚠️ Warning | Dead code — no production file imports these symbols (grep confirmed); the Prisma model is dropped; stale export not addressable without explicit cleanup plan |
| `apps/backend/src/routes/__tests__/admin-delete.test.ts` line 10 | `it.todo` description mentions `InviteCode(usedById)` in cascade order — this table no longer exists | ℹ️ Info | Stale documentation in a TODO test; does not run; Phase 23 file outside Phase 24 scope |
| `apps/backend/src/routes/__tests__/admin-delete.test.ts` lines 44-53 | `InviteCode FK — structural assertion` test passes `expect(true).toBe(true)` but describes a FK constraint that was dropped by Phase 24 migration | ⚠️ Warning | Misleading test comment; test always passes; Phase 23 file outside Phase 24 scope |
| `apps/frontend/src/locales/en.json` and `de.json` | Stale keys `auth.inviteCode`, `admin.inviteCodesTitle`, `admin.inviteCodesDesc`, `admin.noInviteCodes` remain alongside the new invite keys | ℹ️ Info | Dead keys; no component renders them; harmless but clutters locale files |

No `TBD`, `FIXME`, or `XXX` markers found in any Phase 24 production files.

### Human Verification Required

None outstanding. The TOCTOU single-use guarantee (EMAIL-06) was resolved via override — see Overrides in frontmatter.

### Gaps Summary

No gaps outstanding. All five roadmap success criteria have implementation evidence and human confirmation. The one previously behavior-unverified truth (EMAIL-06 TOCTOU race) is closed via human override: sequential reuse tested and passed (24-UAT.md test 9); the concurrent-request edge is accepted on the strength of the Postgres transaction-serialisation guarantee rather than a live concurrency test.

**Notable cleanup items (not blocking):**

- `packages/shared/src/schemas/inviteCode.ts` was never in scope for any Phase 24 plan; it remains as dead code exported from `packages/shared/src/index.ts`. A dedicated cleanup can delete it and remove the export line.
- `apps/backend/src/routes/__tests__/admin-delete.test.ts` has stale Phase 23 comments referencing the dropped `InviteCode` table; the test body passes trivially but the description misleads.

---

_Verified: 2026-07-01T08:29:52Z_
_Verifier: Claude (gsd-verifier), canonicalized post-UAT with human override_
