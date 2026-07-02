---
phase: 29-user-email-self-service
verified: 2026-07-02T20:57:57Z
status: gaps_found
score: 5/5 roadmap truths verified (1 blocker anti-pattern found separately — see below)
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "Submitting a duplicate email shows a clear conflict error (email uniqueness is enforced consistently)"
    status: partial
    reason: "Email normalization (.trim().toLowerCase()) was added only to the two write paths this phase introduced (UpdateEmailSchema/UpdateMeSchema, used by PATCH /api/auth/me and PATCH /api/admin/users/:id). Two pre-existing paths that also read/write user.email were NOT updated to match: POST /api/admin/invites (admin.ts:263, still `z.object({ email: z.string().email() })`, no trim/lowercase) and POST /api/auth/forgot-password (via PasswordResetRequestSchema in packages/shared/src/schemas/auth.ts:26, no trim/lowercase). User.email is a case-sensitive `String? @unique` column (no citext). Consequence: (1) a case-differing duplicate (e.g. an invite-provisioned 'User@Example.com' vs. a self-service-normalized 'user@example.com') will NOT collide at the DB unique-index level, silently defeating the EMAIL_TAKEN contract for a subset of accounts; (2) an existing user whose email is stored non-lowercase (e.g. provisioned via an admin invite that used mixed case) will get a silent no-op from Forgot Password, because RESET-03's anti-enumeration contract always returns the same generic 200 message. This is a real, reachable regression this phase introduced by only partially normalizing email handling, not a hypothetical edge case. It was already identified as CR-01 (Critical) in this phase's own 29-REVIEW.md ('should block ship') on 2026-07-02 and remains unresolved in the current code — verified directly by reading admin.ts:262-267, auth.ts:296-299, and packages/shared/src/schemas/auth.ts:25-27."
    artifacts:
      - path: "packages/shared/src/schemas/auth.ts"
        issue: "PasswordResetRequestSchema.email has no .trim().toLowerCase() normalization, unlike the new UpdateEmailSchema/UpdateMeSchema"
      - path: "apps/backend/src/routes/admin.ts"
        issue: "POST /invites (line ~262-267) validates email with a bare z.string().email(), storing whatever case the admin typed — no normalization to match the self-service write paths"
    missing:
      - "Add .trim().toLowerCase() to PasswordResetRequestSchema.email in packages/shared/src/schemas/auth.ts"
      - "Add .trim().toLowerCase() to the POST /invites email validation in admin.ts (or import/reuse a shared normalized email field, per the review's WR-01 finding), so InviteToken.email and self-service-set User.email are normalized consistently"
      - "Consider a follow-up migration to normalize existing User.email/InviteToken.email rows to lowercase, since application-layer normalization alone does not fix already-diverged data"
deferred: []
---

# Phase 29: User Email Self-Service Verification Report

**Phase Goal:** Users can add or update their email address from Settings, and see a warning when no email is set (since password reset requires one)
**Verified:** 2026-07-02T20:57:57Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GET /auth/me returns the email field (null for users who have none) | VERIFIED | `apps/backend/src/routes/auth.ts:241` — `select` includes `email: true`; Prisma returns `null` (not `undefined`) for a nullable column with no pre-check needed. `AuthContext.tsx` `User.email: string \| null` matches. |
| 2 | Settings page shows an Email section with an input and save button | VERIFIED | `apps/frontend/src/pages/SettingsPage.tsx:140-185` — first Card, `settings.emailSection`/`settings.emailDesc` title/description, `Input type="email"` bound to RHF, `Button type="submit"` with `saveEmail`/`emailSaving` labels. Confirmed rendering + interaction via `SettingsPage.test.tsx` (10/10 tests pass, run directly). |
| 3 | Submitting a duplicate email shows a clear conflict error; an invalid format is rejected at the schema level | VERIFIED (with a caveat — see Gaps) | Both `PATCH /api/auth/me` (`auth.ts:267-281`) and `PATCH /api/admin/users/:id` (`admin.ts:79-100`) catch Prisma `P2002` → `409 { error: 'EMAIL_TAKEN' }`, mapped to an inline field error on both the Settings form and the Admin dialog (`EMAIL-09b`, `EMAIL-11d` RTL tests pass). Invalid format is rejected by `UpdateEmailSchema`/`UpdateMeSchema` (shared Zod schema) before reaching Prisma, both client-side (zodResolver, `EMAIL-09c` test) and server-side (`safeParse` 400). **Caveat:** this contract only holds for the two write paths this phase touched — see the gap below re: pre-existing invite/forgot-password paths left unnormalized. |
| 4 | Settings page shows a prominent warning when email is null, explaining that password reset requires an email address | VERIFIED | `SettingsPage.tsx:125-138` — amber, non-dismissible `Alert role="alert"` rendered only when `user?.email == null`, using `settings.noEmailWarningTitle`/`noEmailWarningDesc` copy. `EMAIL-10a`/`EMAIL-10b` RTL tests confirm presence/absence toggling on `user.email`. |
| 5 | Admin can set or update any user's email from the admin panel user dropdown | VERIFIED | `AdminPage.tsx:531-536` — "Edit email" is the first `DropdownMenuItem` (above "Send password reset email" and destructive "Delete user"); opens a single shared `Dialog` (`AdminPage.tsx:606-655`) pre-filled via `adminEmailForm.reset()`, submitting to `PATCH /api/admin/users/:id`. `EMAIL-11a`–`EMAIL-11d` RTL tests (menu order, pre-fill, success+refresh+close, EMAIL_TAKEN inline conflict) all pass. |

**Score:** 5/5 roadmap truths verified. **1 unresolved blocker-level defect found separately** (see Anti-Patterns / Gaps below) that undermines the completeness of truth #3's uniqueness guarantee across the full user lifecycle (not the two endpoints this phase wrote).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/shared/src/schemas/user.ts` | `UpdateEmailSchema`/`UpdateMeSchema` exports | VERIFIED | Both exported, `.trim().toLowerCase().email(msg)` chain confirmed at lines 31-49; `UpdateStudyModeSchema` still exported (not removed). |
| `apps/backend/src/routes/auth.ts` | GET/PATCH `/me` extended for email | VERIFIED | `email: true` in both `findUnique`/`update` selects; `UpdateMeSchema` parse; P2002 → `EMAIL_TAKEN` 409. |
| `apps/backend/src/routes/admin.ts` | PATCH `/users/:id` extended for email | VERIFIED | Explicit Zod validation (not raw cast) line 55; whitelist into `data` object line 74-77; P2002 → `EMAIL_TAKEN` 409. |
| `apps/backend/src/routes/__tests__/auth-me.test.ts` | Real normalization test + route stubs | VERIFIED (partial coverage by design) | 2 real, executable, passing tests (normalization); 5 `it.todo` route-behavior stubs — confirmed this matches the established repo convention (`admin-delete.test.ts`, `admin-mailer.test.ts` use the identical `it.todo` pattern for shipped, working features). Route-level behavior verified by direct code read instead. |
| `apps/backend/src/routes/__tests__/admin-email.test.ts` | Route stubs | VERIFIED (stub-only, matches convention) | 4 `it.todo` stubs, 0 real assertions — same established convention. |
| `apps/frontend/src/context/AuthContext.tsx` | `email: string \| null` on `User` | VERIFIED | Line 15. |
| `apps/frontend/src/locales/en.json` / `de.json` | All `settings.*`/`admin.*` email keys | VERIFIED | Node script confirms all 10 settings + 9 admin keys present in both locales (including `admin.emailColumn` used by the admin table header). Both files valid JSON. |
| `apps/frontend/src/pages/SettingsPage.tsx` | Email Card + no-email Alert | VERIFIED | See truths #2/#4 above. |
| `apps/frontend/src/pages/AdminPage.tsx` | Edit-email DropdownMenuItem + Dialog | VERIFIED | See truth #5 above. |
| `apps/frontend/src/pages/__tests__/SettingsPage.test.tsx` | RTL cases | VERIFIED | 10/10 pass (ran directly: `yarn workspace @kartex/frontend test run SettingsPage`). |
| `apps/frontend/src/pages/__tests__/AdminPage.test.tsx` | RTL cases | VERIFIED | 10/10 pass (ran directly: `yarn workspace @kartex/frontend test run AdminPage`). |
| `.planning/REQUIREMENTS.md` | EMAIL-09/10/11 enumerated | PARTIAL | EMAIL-09 and EMAIL-10 were checked `[x]` and marked "Complete" in Traceability by the Plan 03 commit (`d085689`). **EMAIL-11 is still `[ ]` / "Pending" in both the checklist and Traceability table**, even though Plan 04 (which delivers EMAIL-11) completed and its tests pass. No plan or commit after Plan 04 reconciled this. Minor documentation-accuracy gap — functionality itself is not affected. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| SettingsPage.tsx form | `PATCH /api/auth/me` | `api.patch('/api/auth/me', values)` | WIRED | Confirmed in code + `EMAIL-09a/b` tests. |
| AdminPage.tsx Edit Email Dialog | `PATCH /api/admin/users/:id` | `api.patch(\`/api/admin/users/${editEmailTargetId}\`, values)` | WIRED | Confirmed in code + `EMAIL-11c/d` tests. |
| `UpdateEmailSchema` (shared) | SettingsPage/AdminPage `zodResolver` | Custom `Resolver<UpdateEmailInput>` wrapper localizing the format-error message | WIRED | Both pages wrap `zodResolver(UpdateEmailSchema)` identically; confirmed by `EMAIL-09c`/localized-message tests. |
| `user.email == null` | No-email Alert | Derived JSX conditional, no backend call | WIRED | `EMAIL-10a/b` tests. |
| GET/PATCH `/me` response | AuthContext `User.email` | `setUser({ ...user, email: updated.email })` | WIRED | Non-optimistic — confirmed via `EMAIL-09a` (`setUser` only called after `res.ok`). |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Backend typecheck | `yarn workspace @kartex/backend typecheck` | Clean, no errors | PASS |
| Frontend typecheck | `yarn workspace @kartex/frontend typecheck` | Clean, no errors | PASS |
| SettingsPage test suite | `yarn workspace @kartex/frontend test run SettingsPage` | 10/10 passed | PASS |
| AdminPage test suite | `yarn workspace @kartex/frontend test run AdminPage` | 10/10 passed | PASS |
| Backend auth-me test file | `yarn workspace @kartex/backend test run auth-me` | 2 passed, 5 todo | PASS (real coverage limited to normalization, by established convention) |
| Backend admin-email test file | `yarn workspace @kartex/backend test run admin-email` | 0 passed, 4 todo | PASS (stub-only, by established convention) |
| i18n key presence (both locales) | node script (Plan 02 verify block, re-run) | "all i18n keys present in both locales" | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| EMAIL-09 | 29-01, 29-02, 29-03 | User can add/update their own email from Settings | SATISFIED | Backend PATCH /me + Settings Email Card, tested end to end. |
| EMAIL-10 | 29-01, 29-02, 29-03 | Settings shows a no-email warning | SATISFIED | Amber Alert, tested (`EMAIL-10a/b`). |
| EMAIL-11 | 29-01, 29-02, 29-04 | Admin can set/update any user's email | SATISFIED (functionally) — REQUIREMENTS.md not yet reconciled | Admin Edit Email Dialog, tested (`EMAIL-11a-d`). REQUIREMENTS.md still shows this as `[ ]`/"Pending" — documentation gap, not a functional gap. |

No orphaned requirements: REQUIREMENTS.md maps only EMAIL-09/10/11 to Phase 29, and all three are claimed and covered by plans in this phase.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `packages/shared/src/schemas/auth.ts` | 25-27 | `PasswordResetRequestSchema.email` has no `.trim().toLowerCase()`, inconsistent with the new `UpdateEmailSchema`/`UpdateMeSchema` this phase introduces | 🛑 Blocker | Silently breaks Forgot Password for any user whose stored email differs in case from what they type — RESET-03's anti-enumeration contract means this failure is invisible to the user. Already flagged as CR-01 in `29-REVIEW.md` (unresolved). |
| `apps/backend/src/routes/admin.ts` | 262-267 | `POST /invites` email validation (`z.object({ email: z.string().email() })`) has no trim/lowercase, unlike the new self-service write paths | 🛑 Blocker | New invite-provisioned accounts can store a differently-cased email than a later self-service update would produce, defeating the DB unique-index uniqueness guarantee this phase's `EMAIL_TAKEN` contract depends on. Same CR-01 finding. |
| `apps/backend/src/routes/admin.ts` | 31-101 (`PATCH /users/:id` role branch) | No last-admin guard on role demotion (unlike the equivalent guard on `DELETE /users/:id`) | ℹ️ Info (out of scope) | Confirmed via `git show` that this gap **pre-dates Phase 29** (present before the email branch was added in Plan 01) — flagged in `29-REVIEW.md` as CR-02 because the reviewer was already reading this file, but it is not a regression introduced by this phase and is not part of Phase 29's success criteria. Noted for visibility, not counted as a Phase 29 gap. |
| `apps/backend/src/routes/admin.ts` / `packages/shared/src/schemas/user.ts` | 55 / 32-36 / 44 | Email validation chain (`trim→toLowerCase→email`) duplicated three times instead of a single shared field | ⚠️ Warning | Maintenance risk (WR-01 in `29-REVIEW.md`) — not a functional break today, but the proximate cause of the CR-01 inconsistency above. |
| `apps/backend/src/routes/auth.ts` | 95-100 (`POST /register`) | `catch` block only recognizes `TOKEN_CONSUMED`/`USERNAME_TAKEN`; a `P2002` on `email` (two invites redeemed for the same address) falls through to an unhandled 500 | ⚠️ Warning | Pre-existing gap surfaced adjacent to this phase's work (WR-02); narrow race condition, not part of Phase 29's stated scope. |

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` debt markers found in any file this phase modified (grep matches on "placeholder" were all legitimate HTML `placeholder=` input attributes).

### Human Verification Required

None — all observable truths and their supporting artifacts/wiring were verifiable programmatically (code read, typecheck, and direct test execution). No behavior-dependent (state-transition/cancellation-invariant) truths in this phase required a runtime spot-check beyond what the RTL/unit suites already exercise.

### Gaps Summary

Phase 29 delivers all 5 stated success criteria and all 3 requirement IDs (EMAIL-09/10/11) functionally — every Settings/Admin UI surface, backend route, and RTL/unit test I checked was real (not a stub) and passed when I ran it directly (not just per the SUMMARY.md narrative).

However, this phase's own code-review artifact (`29-REVIEW.md`, generated 2026-07-02, `status: issues_found`, 2 critical findings) flagged a real, unresolved correctness defect that I independently re-verified is still present in the current code:

**CR-01 (unresolved):** This phase added `.trim().toLowerCase()` email normalization only to the two write paths it introduced (`PATCH /api/auth/me`, `PATCH /api/admin/users/:id`). It did not extend the same normalization to two pre-existing paths that also read/write `user.email` — `POST /api/admin/invites` and `POST /api/auth/forgot-password` (via `PasswordResetRequestSchema`). Since `User.email` is a case-sensitive Postgres unique column (no `citext`), this means: (1) the `EMAIL_TAKEN` uniqueness guarantee this phase's success criterion 3 depends on can be silently bypassed by a case-differing duplicate created through the invite path, and (2) an existing user provisioned with a mixed-case email can no longer receive a password-reset email if they type their email in lowercase (the overwhelmingly common case) — and because `RESET-03`'s no-enumeration contract always returns the same generic success message, this failure is completely invisible. This is a real regression this phase's own scope introduced, not a hypothetical.

I'm reporting `status: gaps_found` because of this unresolved, previously-identified, unfixed defect — not because any of the 5 stated success criteria literally failed. The fix is small and well-scoped (add the same `.trim().toLowerCase()` chain to `PasswordResetRequestSchema` and the invite-creation email validator, per the review's own suggested fix), so this does not require re-planning the phase — it needs either (a) a small follow-up fix commit, or (b) an explicit override if the team decides this class of edge case is acceptable for a 2-5-user self-hosted deployment.

Separately, `.planning/REQUIREMENTS.md` still shows EMAIL-11 as `[ ]`/"Pending" even though Plan 04 fully delivered and tested it — a minor documentation-accuracy gap, not a functional one.

---

_Verified: 2026-07-02T20:57:57Z_
_Verifier: Claude (gsd-verifier)_
