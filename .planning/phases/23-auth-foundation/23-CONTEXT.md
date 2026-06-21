# Phase 23: Auth Foundation - Context

**Gathered:** 2026-06-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the database schema additions, backend infrastructure, and admin UI changes needed to support email-based auth and safe user deletion. No email is sent in this phase. Phases 24 and 25 build on these foundations.

**In scope:**
- Add `email` column to `User` model (nullable, unique) — EMAIL-01
- SMTP mailer singleton with env var config + admin test-send button — EMAIL-02
- `DELETE /api/admin/users/:id` endpoint with ordered cascade + media cleanup — ADMIN-01
- Two-step delete confirmation dialog (AlertDialog + username input + category list) — ADMIN-02, ADMIN-03
- Self-delete and last-admin guards — ADMIN-04
- Email column in admin user table — ADMIN-05

**Out of scope:**
- Sending any invitation or password reset emails (Phase 24, 25)
- Allowing admin to edit a user's email address (deferred)
- Orphaned media cleanup endpoint / background job
- InviteToken or PasswordResetToken models (Phase 24, 25 migrations)

</domain>

<decisions>
## Implementation Decisions

### Delete Confirmation Dialog (ADMIN-02, ADMIN-03)
- **D-01:** Dialog uses **shadcn AlertDialog** — single shared instance outside the user row map loop, controlled by `deleteTargetId` state (mirrors Phase 17 deck delete pattern).
- **D-02:** Trigger is a **3-dot DropdownMenu per row** with a "Delete user" option (consistent with Phase 17 / 22 DropdownMenu pattern; avoids inline button overflow issues).
- **D-03:** Dialog body shows a **static category list** — "This will permanently delete their decks, cards, study progress, and review logs." No live count prefetch or extra API call.
- **D-04:** Admin must **type the target username** to enable the confirm button (ADMIN-02 requirement).

### Cascade Delete Implementation (ADMIN-01, ADMIN-04)
- **D-05:** Use **explicit ordered `prisma.$transaction`** — no new `onDelete: Cascade` FK constraints added to schema. Delete order: RefreshToken → DeckShare (sharedWithUserId) → CardProgress → Cards in user's Decks → Decks → InviteCode (usedById) → User. (ReviewLog already has `onDelete: Cascade` on both userId and cardId so it auto-deletes.)
- **D-06:** **Media files are deleted from disk** during the transaction. Query `Media` records owned by the user, delete files from the local volume, then delete `Media` rows inside the transaction. This overrides the REQUIREMENTS.md out-of-scope decision ("Orphaned media cleanup on user delete — disk space not a concern") — explicit user decision made 2026-06-21.
- **D-07:** Media file deletion is **best-effort** — if a file delete fails (missing file, permissions error), log the error and continue; do not roll back the transaction.
- **D-08:** **Last-admin guard**: before executing delete, count `users WHERE role='ADMIN' AND isActive=true`. If count ≤ 1 and the target is the last active admin, return 400 with a clear error message. Also block self-delete (`id === authenticatedUserId`).

### SMTP Mailer (EMAIL-02)
- **D-09:** nodemailer singleton configured via env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `APP_URL`.
- **D-10:** **Soft fail on startup** — if SMTP env vars are missing or incomplete, log a warning but the server starts normally. The mailer returns a descriptive error when called.
- **D-11:** Add an **admin "Send test email" button** in AdminPage. Posts to `POST /api/admin/mailer/test`. Sends a test email to the logged-in admin's own email address.
- **D-12:** If the admin has no email address set, the test-send endpoint returns an error and the frontend shows a toast: "Set your email address first."

### Email Column (ADMIN-05)
- **D-13:** Add **email as an inline table column** in the UsersSection user table. Show `—` (em dash) for null emails, consistent with the invite code "Used by" column.
- **D-14:** Email is **display-only** in Phase 23. No inline edit capability.

### Folded Todos
- **"Improve user management and email-based auth flows"** (2026-06-19) — the auth and admin management work captured in this todo is exactly what Phase 23 (and 24/25) delivers. Fully folded into scope.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/REQUIREMENTS.md` — EMAIL-01, EMAIL-02, ADMIN-01 through ADMIN-05 with full acceptance criteria
- `.planning/ROADMAP.md` §Phase 23 — Goal, success criteria, and phase dependencies

### Data Model
- `apps/backend/prisma/schema.prisma` — Current User model (no email field yet), existing FK relations (ReviewLog has Cascade on userId/cardId; others do not), RefreshToken, InviteCode, Deck, DeckShare models

### Existing Admin Implementation
- `apps/backend/src/routes/admin.ts` — Existing GET /users, PATCH /users/:id, invite-code endpoints; self-deactivation guard pattern (T-02-08)
- `apps/frontend/src/pages/AdminPage.tsx` — UsersSection (line 232+), existing confirmDeleteId pattern, DropdownMenu usage, invite code delete pattern

### Migration Pattern
- `.planning/STATE.md` §Decisions — Hand-written SQL migration pattern (10-02, 18-01 decisions): `prisma migrate dev` unavailable; apply via `prisma migrate deploy` or Docker Compose entrypoint
- `apps/backend/prisma/migrations/` — Existing migration files for reference format

### Shared Types
- `packages/shared/src/schemas/user.ts` — UserSchema (no email field yet), UserRole enum; email field must be added here for API response type safety

### UI Patterns
- Phase 17 deck delete pattern (deleteTargetId, single AlertDialog outside map, DropdownMenuItem destructive styling via className) — established in `apps/frontend/src/pages/DeckDetailPage.tsx`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **shadcn AlertDialog**: Already installed and used in DeckDetailPage.tsx (Phase 17). Import as-is; same destructive delete pattern applies here.
- **DropdownMenu per row**: Established in Phase 17/22 — `DropdownMenuTrigger` + `DropdownMenuContent` + `DropdownMenuItem` with `text-destructive focus:text-destructive` className for delete items.
- **`deleteTargetId` state pattern**: Single dialog shared outside the `.map()` loop — avoids N dialog instances in DOM. Copy from DeckDetailPage.
- **`admin.ts` route**: Existing GET /users already has the SELECT shape; extend to include `email: true`. Existing PATCH pattern for single-field updates.

### Established Patterns
- **Hand-written SQL migrations**: No `prisma migrate dev` — write migration SQL manually, apply via entrypoint. Migration name: `add_user_email` (adds nullable unique email column to User table).
- **`prisma.$transaction`**: Used in Phase 16 import-update for atomic multi-model operations. Explicit ordered delete follows the same approach.
- **Soft startup failure**: `seedAdminIfNeeded` wrapped in try-catch (12-04 decision) — same approach for mailer singleton initialization.
- **Best-effort error handling**: log and continue, don't crash server on non-critical failures.
- **Toast feedback**: `toast.success()` / `toast.error()` from sonner — used throughout admin actions.

### Integration Points
- `GET /api/admin/users` response → must include `email` field → `UserRecord` interface in AdminPage.tsx needs `email?: string | null`
- `DELETE /api/admin/users/:id` → new route in admin.ts → registered in main index.ts under `adminRouter`
- `POST /api/admin/mailer/test` → new route in admin.ts → uses mailer singleton
- `packages/shared/src/schemas/user.ts` → `UserSchema` needs `email: z.string().email().nullable().optional()` for type safety
- SQL migration `add_user_email`: `ALTER TABLE "User" ADD COLUMN "email" TEXT UNIQUE;` (nullable by default in Postgres)

</code_context>

<specifics>
## Specific Ideas

- The "Send test email" button should be placed in a logical section of AdminPage — likely at the top level alongside the invite-code management, not inside the UsersSection.
- The username input field in the AlertDialog should use a controlled `<Input>` with the confirm button disabled until `inputValue === targetUsername`.
- i18n keys needed: `admin.deleteUser`, `admin.deleteUserConfirmTitle`, `admin.deleteUserConfirmDesc`, `admin.deleteUserTypePlaceholder`, `admin.deleteUserLastAdmin`, `admin.deleteUserSelf`, `admin.deleteUserSuccess`, `admin.emailColumn`, `admin.testEmailBtn`, `admin.testEmailSuccess`, `admin.testEmailNoEmail`.

</specifics>

<deferred>
## Deferred Ideas

- **Admin edit user email** — viewing only in Phase 23; editing deferred per existing REQUIREMENTS.md "Self-service email update" note
- **Resend invitation** — captured in REQUIREMENTS.md future requirements; not in this phase
- **Return-to-study after card edit** — mentioned in REQUIREMENTS.md future requirements; unrelated to this phase

### Reviewed Todos (not folded)
- **"Support deck update via zip file upload"** (2026-06-15) — maps to Phase 27, not Phase 23
- **"Add quick-edit / jump-to-card button in study mode"** (2026-06-15) — maps to Phase 28, not Phase 23

</deferred>

---

*Phase: 23-Auth Foundation*
*Context gathered: 2026-06-21*
