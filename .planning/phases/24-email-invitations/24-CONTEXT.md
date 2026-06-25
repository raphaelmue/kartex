# Phase 24: Email Invitations - Context

**Gathered:** 2026-06-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin can invite new users via email with a one-time token link; invitees register through that link by setting a username and password. The existing invite-code system is fully removed in this phase.

**In scope:**
- `InviteToken` model — email-linked, one-time, 7-day expiry (EMAIL-03, EMAIL-04)
- `POST /api/admin/invites` — admin sends invite email (EMAIL-03)
- `GET /api/invites/:token` — validate token (returns email + error state)
- `POST /api/auth/register` — reworked to accept token instead of invite code (EMAIL-05)
- `DELETE /api/admin/invites/:id` — revoke pending invite (EMAIL-08)
- `GET /api/admin/invites` — list active (non-expired, non-used) invites (EMAIL-07)
- `/invite/:token` — new frontend route + InviteRegisterPage (EMAIL-05, EMAIL-06)
- `InviteTokensSection` in AdminPage — email form + pending table with revoke (EMAIL-03, EMAIL-07, EMAIL-08)
- SQL migration: add `InviteToken` table + drop `InviteCode` table + remove `User.inviteCodeUsed` relation

**Out of scope:**
- Password reset (Phase 25)
- Resending an expired invitation (deferred)
- Invite history / audit log (active-only list is sufficient)
- Admin editing a user's email address (deferred)

</domain>

<decisions>
## Implementation Decisions

### Old InviteCode System (D-01 to D-02)
- **D-01:** The `InviteCode` model, all admin routes (`GET/POST/DELETE /api/admin/invite-codes`), `InviteCodesSection` component, and `inviteCode` field in `RegisterSchema` are **removed entirely** in Phase 24. No backward compatibility layer.
- **D-02:** SQL migration **drops the `InviteCode` table** and removes the `inviteCodeUsed` relation from `User`. This migration runs alongside the new `InviteToken` table migration (can be a single migration file or two separate ones — planner decides).

### Registration Route (D-03 to D-05)
- **D-03:** New dedicated route `/invite/:token` — a new `InviteRegisterPage` component. The token is a path segment, not a query param.
- **D-04:** Old `/register` route and `RegisterPage` component are **removed entirely**. Registration is invitation-only; no public registration path remains.
- **D-05:** Fields on `/invite/:token`: email (read-only, pre-filled from token), username (user sets), password (user sets), confirm password (user sets). Four fields total; email cannot be edited.

### Admin UI (D-06 to D-08)
- **D-06:** `InviteCodesSection` is replaced by **`InviteTokensSection`** — a single Card-based section in AdminPage. Top: email `<Input>` + "Send Invite" `<Button>`. Below: pending invites table.
- **D-07:** Pending invites table columns: **Email · Sent date · Expires · Revoke** (icon button per row). Revoke triggers `DELETE /api/admin/invites/:id`.
- **D-08:** Backend filters to **active-only** invites (WHERE usedAt IS NULL AND expiresAt > NOW()). Expired invites are not shown to admin.

### Token Error States (D-09 to D-10)
- **D-09:** Invalid/bad token states are handled **inline on `/invite/:token`**. On page load, frontend calls `GET /api/invites/:token`; if the backend returns an error, the page renders an error state instead of the registration form. No redirect.
- **D-10:** **Three distinct error messages** shown inline:
  - Already used: "This invite has already been used."
  - Expired: "This invite link has expired. Contact an admin for a new invitation."
  - Not found / invalid: "This invite link is not valid."

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/REQUIREMENTS.md` — EMAIL-03 through EMAIL-08 with acceptance criteria
- `.planning/ROADMAP.md` §Phase 24 — Goal, success criteria, phase dependencies

### Data Model
- `apps/backend/prisma/schema.prisma` — Current `InviteCode` model (to be dropped), `User` model (`inviteCodeUsed` relation to remove), `RefreshToken` and existing FK patterns

### Existing Auth Implementation
- `apps/backend/src/routes/auth.ts` — Current `POST /register` (to be reworked; inviteCode validation pattern to replace with token validation)
- `apps/frontend/src/pages/RegisterPage.tsx` — Current register page (to be removed; reuse form field patterns for InviteRegisterPage)
- `packages/shared/src/schemas/auth.ts` — `RegisterSchema` (inviteCode field to be replaced with token field or removed)

### Existing Admin Implementation
- `apps/backend/src/routes/admin.ts` — Existing invite-code endpoints (to be removed); `POST /api/admin/mailer/test` pattern; user delete pattern from Phase 23
- `apps/frontend/src/pages/AdminPage.tsx` — `InviteCodesSection` (to be replaced); existing Card + Table patterns, DropdownMenu per row, toast feedback pattern

### Mailer Singleton (Phase 23 foundation)
- `apps/backend/src/lib/mailer.ts` (or equivalent path) — nodemailer singleton from Phase 23; Phase 24 uses it to send invitation emails

### Migration Pattern
- `.planning/STATE.md` §Decisions — Hand-written SQL migration pattern; `prisma migrate deploy` only
- `apps/backend/prisma/migrations/` — Existing migration files for format reference

### UI Patterns
- Phase 17 deck delete pattern — `deleteTargetId`, single AlertDialog outside map, DropdownMenuItem destructive styling
- Phase 23 admin UI — UsersSection, toast feedback, DropdownMenu per row established patterns

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`InviteCodesSection` in AdminPage.tsx (line 119+)**: Replace with `InviteTokensSection`. Same Card + Table + Button structure; adapt email input form instead of code generation.
- **`InviteStatusBadge` (AdminPage.tsx line 555+)**: Can be removed or adapted; D-08 filters to active-only so a status badge is unnecessary.
- **nodemailer singleton (Phase 23)**: Already configured via `SMTP_*` env vars. Phase 24 calls `mailer.sendMail()` with invite link template.
- **shadcn `<Input>` + `<Button>` + `<Table>`**: All installed. InviteTokensSection reuses the same component imports as the existing InviteCodesSection.
- **`POST /api/auth/register`**: The validation block (`inviteCode` lookup) needs to be replaced with `InviteToken` lookup. The rest of the route (username uniqueness check, bcrypt hash, user create, JWT issue) stays the same.

### Established Patterns
- **Hand-written SQL migrations**: Write migration SQL manually; apply via `prisma migrate deploy` in Docker Compose entrypoint. No `prisma migrate dev`.
- **`prisma.$transaction`**: Used in Phase 16 and 23 for atomic multi-model operations. Token consumption (mark usedAt + create User) should be atomic.
- **Soft startup failure**: Mailer singleton already wraps initialization in try-catch. Token send failures should return a clear error response (not crash).
- **Toast feedback**: `toast.success()` / `toast.error()` from sonner for all admin actions.
- **DropdownMenu per row**: Established Phase 17/22 pattern — use for revoke action if needed, or a direct icon button (simpler for single-action rows).

### Integration Points
- `GET /api/admin/invites` → new route in admin.ts → `InviteTokensSection` fetches on mount
- `POST /api/admin/invites` → admin submits email → mailer sends invite email with `APP_URL/invite/:token` link
- `DELETE /api/admin/invites/:id` → revoke button per row
- `GET /api/invites/:token` → new public (unauthenticated) route → `InviteRegisterPage` validates token on load
- `POST /api/auth/register` → reworked to accept `{ token, username, password }` → validates `InviteToken`, creates `User`, marks token used
- `packages/shared/src/schemas/auth.ts` → `RegisterSchema` → replace `inviteCode` with `token` field; add `confirmPassword` for frontend validation (or keep in frontend only)
- `apps/frontend/src/App.tsx` → add `/invite/:token` route, remove `/register` route

</code_context>

<specifics>
## Specific Ideas

- Confirm password field is client-side only (validate passwords match before submit); backend does not need a `confirmPassword` field.
- The invite email content should include the invitee's email address, a clear CTA button/link ("Complete your registration"), and the 7-day expiry deadline.
- `APP_URL` env var (already defined in Phase 23 for mailer) is used to construct the invite link: `${APP_URL}/invite/${token}`.
- The `InviteToken` model should use `cuid()` as the token value (consistent with other IDs in schema), or a longer random token for security — planner should evaluate whether cuid is sufficient entropy for a one-time invite token vs a `crypto.randomBytes(32).toString('hex')` approach.

</specifics>

<deferred>
## Deferred Ideas

- **Resend invitation** — if an invite expires before the user clicks, admin must create a new one. Resend as a shortcut (pre-fill email, revoke old) is a future UX improvement.
- **Invite expiry visibility to invitee** — email mentions 7-day expiry but the page itself could show a countdown; deferred as unnecessary complexity.
- **Bulk invites** — sending to multiple emails at once; deferred to a future phase.

### Reviewed Todos (not folded)
- **"Support deck update via zip file upload"** (2026-06-15) — maps to Phase 27, not Phase 24
- **"Add quick-edit / jump-to-card button in study mode"** (2026-06-15) — maps to Phase 28, not Phase 24
- **"Improve user management and email-based auth flows"** (2026-06-19) — folded into Phase 23; Phase 24 builds on that foundation

</deferred>

---

*Phase: 24-Email Invitations*
*Context gathered: 2026-06-25*
