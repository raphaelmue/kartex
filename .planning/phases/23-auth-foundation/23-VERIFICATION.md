---
phase: 23-auth-foundation
verified: 2026-06-24T00:09:00Z
status: human_needed
score: 10/10
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Open the admin panel, verify the Email column shows each user's email or an em dash for null (ADMIN-05)"
    expected: "Email column visible in users table; null email renders as '—'"
    why_human: "Visual rendering and correct em-dash fallback require browser inspection; cannot be grepped"
  - test: "Click the 3-dot menu on a non-admin user → 'Delete user'; verify the dialog shows title 'Delete user?', description listing decks/cards/progress/review logs, and the confirm button stays DISABLED until you type the exact username (ADMIN-02, ADMIN-03)"
    expected: "Dialog appears with correct copy; confirm button enabled only after exact-username entry; deletion removes the user from the list"
    why_human: "Interactive AlertDialog + controlled Input behavior requires browser interaction"
  - test: "Attempt to delete your own account → expect toast 'You cannot delete your own account' (ADMIN-04 self-delete guard)"
    expected: "Toast displayed; no deletion occurs"
    why_human: "Toast rendering on server error code requires live app interaction"
  - test: "If only one active admin exists, attempt to delete that admin → expect toast 'Cannot delete the last admin account' (ADMIN-04 last-admin guard)"
    expected: "Toast displayed; no deletion occurs"
    why_human: "Requires a controlled admin-count database state to test"
  - test: "In the MailerSection, click 'Send test email' with no admin email set → expect toast 'Set your email address first' (EMAIL-02 NO_EMAIL guard)"
    expected: "Error toast shown; no email sent"
    why_human: "Requires live backend and a user account without an email address"
  - test: "With SMTP configured and admin email present, click 'Send test email' → expect toast 'Test email sent' and a real email delivered (EMAIL-02 happy path)"
    expected: "Success toast; email received at admin's inbox"
    why_human: "Requires a real SMTP server and a configured admin email — cannot be tested programmatically"
  - test: "Switch language to German and confirm all new admin.* strings are translated (no raw key strings like 'admin.deleteUser' visible)"
    expected: "All 16 new strings appear in German"
    why_human: "i18n rendering in the browser requires visual inspection"
---

# Phase 23: auth-foundation — Verification Report

**Phase Goal:** Deliver the auth-overhaul data foundation and admin tooling — email column on User, SMTP mailer singleton, DELETE /users/:id endpoint with cascade guards, and the Admin UI for email display, user deletion (two-step confirmation), and mailer test button.
**Verified:** 2026-06-24T00:09:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The User model has a nullable, unique email column; existing users keep email = NULL | VERIFIED | `schema.prisma` line 42: `email String? @unique`; migration SQL: `ALTER TABLE "User" ADD COLUMN "email" TEXT UNIQUE;` (no NOT NULL constraint) |
| 2 | The shared UserSchema exposes email so frontend and backend share one email type | VERIFIED | `packages/shared/src/schemas/user.ts` line 16: `email: z.string().email().nullable().optional()` |
| 3 | Wave 0 test files exist and define the delete-guard and mailer behaviors as runnable specs | VERIFIED | `admin-delete.test.ts` (72 lines, 5 passing structural tests + 10 todos); `admin-mailer.test.ts` (16 lines, 6 todos); `yarn workspace @kartex/backend test --run` exits 0 (5 pass, 16 todo) |
| 4 | The backend exposes a mailer singleton that initializes from SMTP env vars and soft-fails when they are missing | VERIFIED | `apps/backend/src/lib/mailer.ts`: reads SMTP_HOST/PORT/SECURE/USER/PASS/FROM; sets `transporter = null` and warns when any are missing; does not throw; `verify()` NOT called at init |
| 5 | POST /api/admin/mailer/test sends a test email to the logged-in admin's own email, or returns a clear error if SMTP is unconfigured or the admin has no email | VERIFIED | `admin.ts` lines 208-238: handler returns 400 `NO_EMAIL` when `!user?.email`, 400 when `!isConfigured()`, calls `verifyConnection()` + `sendMail({ to: user.email })` in try/catch, returns 200 on success |
| 6 | GET /api/admin/users returns each user's email field | VERIFIED | `admin.ts` lines 11-23: `select` includes `email: true` |
| 7 | docker-compose passes the SMTP and APP_URL env vars to the backend container | VERIFIED | `docker-compose.yml` lines 16-22: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM, APP_URL all present with `${VAR:-}` empty-string defaults |
| 8 | DELETE /api/admin/users/:id permanently removes a user and all of their owned/linked data in FK-safe order | VERIFIED | `admin.ts` lines 83-136: ordered `prisma.$transaction([RefreshToken, DeckShare(sharedWithUserId), CardProgress, Card(deckIds), Deck, InviteCode(usedById), Media, User.delete])`; deckIds pre-computed before the array |
| 9 | An admin cannot delete their own account (400 SELF_DELETE) or the last active admin account (400 LAST_ADMIN) | VERIFIED | `admin.ts` lines 88-101: self-delete guard `id === authenticatedUserId → SELF_DELETE`; last-admin guard `adminCount <= 1 && target.role === 'ADMIN' → LAST_ADMIN`; structural tests pass confirming these error codes |
| 10 | Admin UI shows email column, two-step delete dialog, and MailerSection button, all strings localized in en + de | VERIFIED (code) | `AdminPage.tsx`: UserRecord.email; Email `<TableHead>` line 391; `deleteTargetId` state; single AlertDialog outside map; `Button disabled={usernameInput !== deleteTarget.username}`; `MailerSection` function lines 76-115; rendered first in AdminPage (line 622). All 16 i18n keys confirmed present in both locale files by node verification script. |

**Score:** 10/10 truths verified (0 present-behavior-unverified)

Note: Truth 10 is partially behavior-dependent (visual rendering, toast behavior, interactive dialog) and routes to human verification for those aspects. The code-level wiring is fully verified.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/backend/prisma/schema.prisma` | User.email field declaration | VERIFIED | `email String? @unique` present at line 42 |
| `apps/backend/prisma/migrations/20260621000000_add_user_email/migration.sql` | SQL adds nullable unique email column | VERIFIED | Contains `ALTER TABLE "User" ADD COLUMN "email" TEXT UNIQUE;` |
| `packages/shared/src/schemas/user.ts` | email field on UserSchema | VERIFIED | `email: z.string().email().nullable().optional()` at line 16 |
| `apps/backend/src/routes/__tests__/admin-delete.test.ts` | Wave 0 spec, ≥20 lines | VERIFIED | 72 lines; 5 passing structural assertions + 10 todos; exits 0 |
| `apps/backend/src/routes/__tests__/admin-mailer.test.ts` | Wave 0 spec, ≥15 lines | VERIFIED | 16 lines; 6 todos; exits 0 |
| `apps/backend/src/lib/mailer.ts` | nodemailer SMTP singleton with sendMail + isConfigured + verifyConnection | VERIFIED | All three exports present; 74 lines; soft-fail confirmed |
| `apps/backend/src/routes/admin.ts` | POST /mailer/test + DELETE /users/:id + email in GET /users | VERIFIED | All three features present in 241-line file |
| `docker-compose.yml` | SMTP_* and APP_URL env vars | VERIFIED | 7 env vars with empty-string defaults |
| `apps/frontend/src/pages/AdminPage.tsx` | email column, deleteTargetId, MailerSection | VERIFIED | All three present; 628 lines; frontend build passes |
| `apps/frontend/src/locales/en.json` | 16 new admin.* keys | VERIFIED | All 16 keys confirmed by node script |
| `apps/frontend/src/locales/de.json` | German translations for same 16 keys | VERIFIED | All 16 keys confirmed by node script |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `packages/shared/src/schemas/user.ts` | `apps/backend/prisma/schema.prisma` | email field shape mirrors nullable unique column | VERIFIED | Both are nullable; schema has `String? @unique`; shared type has `.nullable().optional()` |
| `apps/backend/src/routes/admin.ts` | `apps/backend/src/lib/mailer.ts` | imports sendMail, isConfigured, verifyConnection | VERIFIED | Line 4: `import { sendMail, isConfigured, verifyConnection } from '../lib/mailer.js'` |
| `apps/backend/src/index.ts` | `apps/backend/src/lib/mailer.ts` | import triggers singleton init at startup | VERIFIED | Line 19: `import { isConfigured } from './lib/mailer.js'`; line 130: startup log using `isConfigured()` |
| `apps/frontend/src/pages/AdminPage.tsx` | `apps/backend/src/routes/admin.ts` | DELETE /api/admin/users/:id and POST /api/admin/mailer/test via api client | VERIFIED | Line 347: `api.delete('/api/admin/users/' + id)`; line 83: `api.post('/api/admin/mailer/test', {})` |
| `apps/frontend/src/pages/AdminPage.tsx` | `apps/frontend/src/locales/en.json` | t('admin.*') keys rendered in table, dialog, mailer card | VERIFIED | t('admin.emailColumn'), t('admin.deleteUser'), t('admin.mailerTitle') etc. all present |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `AdminPage.tsx` UsersSection | `users` state | `api.get('/api/admin/users')` → `prisma.user.findMany({ select: { email: true } })` | Yes — Prisma query with email:true in select | FLOWING |
| `AdminPage.tsx` MailerSection | `sending` / res from POST | `api.post('/api/admin/mailer/test')` → `prisma.user.findUnique` + `sendMail` | Yes — live DB lookup and SMTP call | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Backend test suite passes (admin-delete + admin-mailer) | `yarn workspace @kartex/backend test --run src/routes/__tests__/admin-delete.test.ts src/routes/__tests__/admin-mailer.test.ts` | 5 passed, 16 todo — exit 0 | PASS |
| Full backend test suite | `yarn workspace @kartex/backend test --run` | 26 passed, 62 todo — exit 0 | PASS |
| Backend typecheck | `yarn workspace @kartex/backend typecheck` | Exit 0 (no output) | PASS |
| Frontend build | `yarn workspace @kartex/frontend build` | Built in 13.99s — exit 0 | PASS |
| Shared package build | `yarn workspace @kartex/shared build` | Exit 0 (no output) | PASS |
| Prisma schema validation | `cd apps/backend && npx prisma validate` | "The schema at prisma/schema.prisma is valid" — exit 0 | PASS |
| All 16 i18n keys present in both locales | node verification script | "All 16 keys present in both en.json and de.json: OK" | PASS |
| All documented commits exist | `git log --oneline <11 hashes>` | All 11 commits present (83b257a through 7740548) | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| EMAIL-01 | Plan 01 | User.email field — nullable, unique | SATISFIED | schema.prisma `email String? @unique`; migration SQL confirmed |
| EMAIL-02 | Plans 02, 04 | SMTP singleton + POST /mailer/test + MailerSection UI | SATISFIED | mailer.ts singleton; admin.ts /mailer/test handler; AdminPage.tsx MailerSection; docker-compose env vars |
| ADMIN-01 | Plans 03, 04 | Admin can permanently delete a user account | SATISFIED | admin.ts `admin.delete('/users/:id')` with ordered $transaction cascade |
| ADMIN-02 | Plan 04 | Two-step confirmation (modal + type username) | SATISFIED (code) | AlertDialog with username Input; `disabled={usernameInput !== deleteTarget.username}` — interactive behavior needs human verify |
| ADMIN-03 | Plan 04 | Dialog explicitly lists what will be deleted | SATISFIED (code) | `t('admin.deleteUserConfirmDesc')` en.json: "This will permanently delete their decks, cards, study progress, and review logs." — dialog rendering needs human verify |
| ADMIN-04 | Plans 03, 04 | Cannot delete own account or last admin | SATISFIED | SELF_DELETE guard (line 88-90); LAST_ADMIN guard (lines 99-101) in admin.ts; error toast mapping in AdminPage.tsx |
| ADMIN-05 | Plans 02, 04 | Admin sees each user's email in user list | SATISFIED (code) | GET /users select includes `email: true`; UserRecord.email in AdminPage; Email column rendered — visual display needs human verify |

No orphaned requirements: REQUIREMENTS.md maps exactly EMAIL-01, EMAIL-02, ADMIN-01 through ADMIN-05 to Phase 23. All 7 are covered by plans.

---

### Anti-Patterns Found

No anti-patterns found. Scanned all 8 files modified by this phase:
- No TBD, FIXME, or XXX markers
- No TODO or HACK markers
- No placeholder comments or hardcoded empty returns in production code paths
- The 10 `it.todo` entries in `admin-delete.test.ts` and 6 `it.todo` entries in `admin-mailer.test.ts` are intentional Wave 0 scaffolds (test placeholders for integration tests requiring a test DB or Prisma mock harness) — not code stubs

---

### Human Verification Required

The automated static checks all pass. The following interactive/visual behaviors require a running app to verify:

#### 1. Email column display (ADMIN-05)

**Test:** Open the admin panel. Check the users table.
**Expected:** An "Email" column appears; users with email set show their address; users without email show an em dash (—).
**Why human:** Visual rendering and null fallback cannot be verified by grep.

#### 2. Two-step delete dialog UX (ADMIN-02, ADMIN-03)

**Test:** Click the 3-dot menu on a non-admin test user → "Delete user". Inspect the dialog.
**Expected:** Dialog title "Delete user?"; description says "This will permanently delete their decks, cards, study progress, and review logs. This action cannot be undone."; the confirm button is DISABLED until the exact username is typed into the Input; correct username enables the button and triggers deletion.
**Why human:** Interactive AlertDialog + controlled Input disabled state requires browser interaction.

#### 3. Self-delete guard toast (ADMIN-04)

**Test:** Attempt to delete your own account via the 3-dot menu.
**Expected:** Toast "You cannot delete your own account" appears; no deletion occurs.
**Why human:** Error toast routing requires live backend returning `SELF_DELETE` and frontend toast rendering.

#### 4. Last-admin guard toast (ADMIN-04)

**Test:** Ensure only one active admin exists, then attempt to delete that admin's account.
**Expected:** Toast "Cannot delete the last admin account" appears; no deletion occurs.
**Why human:** Requires controlled database state (adminCount = 1) to trigger the guard.

#### 5. Mailer test — no-email guard toast (EMAIL-02)

**Test:** Log in as an admin with no email set. Click "Send test email" in the MailerSection.
**Expected:** Toast "Set your email address first" appears.
**Why human:** Requires a user account with `email = NULL` in the live database.

#### 6. Mailer test — happy path (EMAIL-02)

**Test:** With SMTP configured and admin email address set, click "Send test email".
**Expected:** Toast "Test email sent"; a real email is received at the admin's inbox.
**Why human:** Requires a real SMTP server and a configured admin email address.

#### 7. German i18n completeness

**Test:** Switch language to German in Settings; navigate to the Admin panel.
**Expected:** All new admin strings appear in German — no raw i18n key strings (e.g., "admin.deleteUser") are visible.
**Why human:** i18n rendering in the browser requires visual inspection.

---

### Migration Status Note

The migration `20260621000000_add_user_email` is applied automatically via `npx prisma migrate deploy` in `apps/backend/entrypoint.sh` at container start. `npx prisma validate` confirms the schema is valid against the migration set. The actual column apply against a running database must be confirmed by starting the Docker Compose stack (human verification step, per Plan 03 Task 3 decision).

---

_Verified: 2026-06-24T00:09:00Z_
_Verifier: Claude (gsd-verifier)_
