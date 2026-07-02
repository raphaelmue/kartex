# Phase 29: User Email Self-Service - Context

**Gathered:** 2026-07-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can add or update their own email address from the Settings page, and see a prominent warning there when no email is set (since password reset requires one). Admins can set or update any user's email from the admin panel. Covers `EMAIL-09`, `EMAIL-10`, `EMAIL-11` (see note below — not yet enumerated in REQUIREMENTS.md; ROADMAP §Phase 29 success criteria are the authoritative source for this phase).

**In scope:**
- `GET /api/auth/me` returns `email` field (currently omitted from the select)
- `PATCH /api/auth/me` accepts an `email` update (currently only accepts `studyMode`)
- Settings page: new Email card — input pre-filled with current email (or empty), explicit Save button
- Settings page: Alert banner shown when email is null, explaining password reset requires one
- Admin panel: "Edit email" action in the existing per-row DropdownMenu, opens a Dialog with input + Save/Cancel
- Duplicate-email and invalid-format conflict handling on both surfaces, with inline field errors

**Out of scope:**
- Email verification (confirming ownership via a sent link) — deferred per REQUIREMENTS.md "Future Requirements"
- Any change to the invite or password-reset email flows themselves
- A dashboard-wide or global nudge about missing email — Settings page only, per locked success criteria
- Schema migration — `User.email` column already exists (nullable, unique) from Phase 23

</domain>

<decisions>
## Implementation Decisions

### Settings Email Save UX
- **D-01:** Email gets its own Card section in Settings with an `<Input>` + explicit **Save button** — unlike Study Mode/Language sections which auto-save on radio change. Email can fail validation or hit a duplicate conflict, so a button gives a clear moment to show success/error feedback (matches the reasoning already used for other forms with server-side conflict potential in this codebase).
- **D-02:** Input is **pre-filled with the current email and always editable** — not add-only. Same section/form handles first-time set and later correction. Matches ROADMAP wording "add or update."

### No-Email Warning
- **D-03:** Warning renders as an **Alert banner at the top of the Settings page** (above the Study Mode card), using the existing `alert.tsx` shadcn component (installed but currently unused anywhere in the app) in a warning/destructive variant.
- **D-04:** Warning is **Settings-page only** — no dashboard or global nudge. That would be new UI surface beyond this phase; not built now (see Deferred).
- The warning is not dismissible — it persists as long as `email` is null and disappears automatically once the user saves a valid email (no localStorage dismiss state).

### Admin Edit-Email Interaction
- **D-05:** "Edit email" is a new `DropdownMenuItem` in the existing per-user-row DropdownMenu, opening a **Dialog modal** (component exists at `apps/frontend/src/components/ui/dialog.tsx`, currently unused elsewhere in the app) with an email `<Input>` + Save/Cancel. Not an inline-editable table cell — no such pattern exists in this codebase yet, and a modal is consistent with how "Delete user" already collects confirmation input via AlertDialog.
- **D-06:** Menu order: **"Edit email" first**, above the existing "Send password reset email" and "Delete user" (destructive stays last). Shown for every row, including the admin's own — harmless to have it available there too even though admins can also use Settings.

### Duplicate/Invalid Email Error UX
- **D-07:** Errors render as **inline text under the input** on both the Settings form and the Admin edit Dialog — not toast-only. Unlike the reset/delete row actions (which have no form field to attach an error to), this is a validation-style form with a visible input, so an inline message is clearer. A success toast still confirms save.
- **D-08:** Duplicate-email conflict returns an **explicit "email already in use" message** (not a generic failure). RESET-03's no-enumeration concern doesn't apply here — Settings is an authenticated self-service form, and the admin edit path is already fully privileged. Backend should return a distinguishable error (e.g., a `EMAIL_TAKEN` code or 409) that the frontend maps to the inline message.

### Claude's Discretion
- Exact validation error copy and i18n key naming (follow existing `settings.*` / `admin.*` namespace conventions)
- Whether the Settings Save button is disabled until the input value differs from the current email, or always enabled
- Server-side email normalization (trim/lowercase) before uniqueness check and storage
- Exact Prisma error handling for the unique constraint (P2002) → mapped to the `EMAIL_TAKEN`-style response
- Dialog copy/layout details for the admin Edit Email modal (title, description, button labels)

### Folded Todos
None — the one matching todo (`2026-06-19-improve-user-management-and-email-based-auth-flows.md`) was already fully folded into Phase 23 and Phase 25's scope; nothing from it remains unresolved for this phase (see Reviewed Todos below).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/ROADMAP.md` §"Phase 29: User Email Self-Service" — Goal, success criteria (the authoritative requirements source for this phase; **note**: EMAIL-09/10/11 are referenced by ID but not yet enumerated in `.planning/REQUIREMENTS.md`, which currently stops at SEDIT-04 — flag this gap during planning or a documentation pass)
- `.planning/REQUIREMENTS.md` §"Future Requirements (deferred)" — "Self-service email update" is listed as deferred with the note "admin update of user email is sufficient for v1.4"; Phase 29 supersedes that note by adding the self-service half too — worth reconciling in REQUIREMENTS.md

### Data Model (no migration needed)
- `apps/backend/prisma/schema.prisma` — `User.email` column already exists (nullable, unique) from Phase 23's `add_user_email` migration
- `packages/shared/src/schemas/user.ts` (line 16) — `UserSchema.email: z.string().email().nullable().optional()` already present

### Existing Auth Endpoints (to extend)
- `apps/backend/src/routes/auth.ts` lines 234-248 — `GET /me`: select list omits `email`; needs `email: true` added
- `apps/backend/src/routes/auth.ts` lines 252-267 — `PATCH /me`: only validates/updates `studyMode` via `UpdateStudyModeSchema`; needs an email branch (new schema, uniqueness handling)

### Existing Admin Endpoints (to extend)
- `apps/backend/src/routes/admin.ts` lines 12-26 — `GET /users`: already selects `email` — no change needed
- `apps/backend/src/routes/admin.ts` lines 30-79 — `PATCH /users/:id`: currently handles `role`/`isActive` only; closest analog for adding an `email` field, or add a dedicated endpoint — planner's call
- `apps/backend/src/routes/admin.ts` lines 153+ — `POST /users/:id/reset-password` — NO_EMAIL error-code pattern to reuse/reference for the email-required check elsewhere

### Frontend Pages (to extend)
- `apps/frontend/src/pages/SettingsPage.tsx` — existing Card-based section pattern (Study Mode, Language); new Email Card follows the same `<Card><CardHeader><CardTitle>/<CardDescription></CardHeader><CardContent>` structure
- `apps/frontend/src/pages/AdminPage.tsx` lines ~360-530 — `emailColumn` table header already exists (display-only); DropdownMenu per row (lines ~464-475) has "Send password reset email" and "Delete user"; single shared AlertDialog pattern (line ~486) for delete confirmation is the analog for how the new Dialog should be wired (single shared Dialog instance, not per-row)

### UI Components
- `apps/frontend/src/components/ui/dialog.tsx` — shadcn Dialog, installed but currently unused anywhere in the app; first consumer will be the admin Edit Email modal
- `apps/frontend/src/components/ui/alert.tsx` — shadcn Alert, installed but currently unused anywhere in the app; first consumer will be the Settings no-email warning
- `apps/frontend/src/components/ui/input.tsx`, `apps/frontend/src/components/ui/label.tsx` — existing form primitives

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`SettingsPage.tsx` Card pattern**: Study Mode and Language sections are both `<Card className="mt-6">` blocks — the Email section should follow the same visual rhythm, likely placed first (above Study Mode) since the warning banner needs to sit above it too.
- **`AdminPage.tsx` DropdownMenu + single-shared-dialog pattern**: `deleteTargetId`-style state (one dialog instance outside the row `.map()`, controlled by an `editEmailTargetId`-style state) — established in Phase 17/23, directly reusable for the new Edit Email Dialog.
- **NO_EMAIL / error-code-to-toast mapping**: Established in Phase 23 (D-12) and Phase 25 (D-03) — `admin.ts` returns an opaque error code, frontend maps it to a localized message. The new `EMAIL_TAKEN`-equivalent should follow the same code-not-string convention (D-12 pattern from `.planning/STATE.md` decisions), even though this phase renders it inline rather than as a toast.

### Established Patterns
- **Toast feedback**: `toast.success()` / `toast.error()` from sonner — still used for the *success* case in both flows (per D-07, only the *error* case moves to inline).
- **Optimistic update pattern**: `handleModeChange` in `SettingsPage.tsx` does optimistic state update + revert-on-failure. Email save should NOT be optimistic (unlike studyMode) — wait for server confirmation before updating displayed state, since a duplicate-conflict failure is expected/common for email edits.
- **Hand-written SQL migrations**: Not needed this phase — `User.email` column already exists.

### Integration Points
- `GET /api/auth/me` response → `AuthContext` / `useAuth().user` → needs `email` in the `User` type used by `AuthContext` (check `apps/frontend/src/context/AuthContext.tsx` for the type definition during planning)
- `PATCH /api/auth/me` → extend to accept `{ email?: string }` alongside `{ studyMode?: StudyMode }`, or determine if this needs a distinct request shape (planner's call, informed by whether both fields should be independently PATCHable in one call)
- `PATCH /api/admin/users/:id` (or a new dedicated route) → admin Edit Email Dialog submits here
- `packages/shared/src/schemas/user.ts` → may need a dedicated `UpdateEmailSchema` (mirrors `UpdateStudyModeSchema`) for shared frontend/backend validation

</code_context>

<specifics>
## Specific Ideas

- Settings Email card should sit above the Study Mode card (so the no-email Alert banner, if shown, is the very first thing visible on the page).
- Admin Dialog and Settings form should share the same validation/error-code contract where practical (both hit the same duplicate-email business rule).

</specifics>

<deferred>
## Deferred Ideas

- **Dashboard-wide or global "no email set" nudge** — raised and explicitly rejected for this phase; Settings-page-only warning is what's locked by ROADMAP success criteria. Could be proposed for a future phase if user feedback suggests the Settings-only warning is too easy to miss.
- **Email verification flow** — already tracked in `.planning/REQUIREMENTS.md` "Future Requirements"; unaffected by this phase.

### Reviewed Todos (not folded)
- **`2026-06-19-improve-user-management-and-email-based-auth-flows.md`** — matched at high relevance (0.9) on generic user/email/auth keywords, but its concrete asks (admin reset password, admin delete user, email verification, self-service password reset, email invitations) were already fully delivered by Phases 23-25. Nothing in it maps to self-service email *update* specifically — not folded, already resolved.

</deferred>

---

*Phase: 29-user-email-self-service*
*Context gathered: 2026-07-02*
