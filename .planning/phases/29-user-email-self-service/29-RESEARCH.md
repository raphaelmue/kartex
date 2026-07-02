# Phase 29: User Email Self-Service - Research

**Researched:** 2026-07-02
**Domain:** Hono REST API + Prisma unique-constraint handling + React Hook Form self-service forms (existing monorepo conventions, no new libraries)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Settings Email Save UX**
- **D-01:** Email gets its own Card section in Settings with an `<Input>` + explicit **Save button** — unlike Study Mode/Language sections which auto-save on radio change. Email can fail validation or hit a duplicate conflict, so a button gives a clear moment to show success/error feedback (matches the reasoning already used for other forms with server-side conflict potential in this codebase).
- **D-02:** Input is **pre-filled with the current email and always editable** — not add-only. Same section/form handles first-time set and later correction. Matches ROADMAP wording "add or update."

**No-Email Warning**
- **D-03:** Warning renders as an **Alert banner at the top of the Settings page** (above the Study Mode card), using the existing `alert.tsx` shadcn component (installed but currently unused anywhere in the app) in a warning/destructive variant.
- **D-04:** Warning is **Settings-page only** — no dashboard or global nudge. That would be new UI surface beyond this phase; not built now (see Deferred).
- The warning is not dismissible — it persists as long as `email` is null and disappears automatically once the user saves a valid email (no localStorage dismiss state).

**Admin Edit-Email Interaction**
- **D-05:** "Edit email" is a new `DropdownMenuItem` in the existing per-user-row DropdownMenu, opening a **Dialog modal** (component exists at `apps/frontend/src/components/ui/dialog.tsx`, currently unused elsewhere in the app) with an email `<Input>` + Save/Cancel. Not an inline-editable table cell — no such pattern exists in this codebase yet, and a modal is consistent with how "Delete user" already collects confirmation input via AlertDialog.
- **D-06:** Menu order: **"Edit email" first**, above the existing "Send password reset email" and "Delete user" (destructive stays last). Shown for every row, including the admin's own — harmless to have it available there too even though admins can also use Settings.

**Duplicate/Invalid Email Error UX**
- **D-07:** Errors render as **inline text under the input** on both the Settings form and the Admin edit Dialog — not toast-only. Unlike the reset/delete row actions (which have no form field to attach an error to), this is a validation-style form with a visible input, so an inline message is clearer. A success toast still confirms save.
- **D-08:** Duplicate-email conflict returns an **explicit "email already in use" message** (not a generic failure). RESET-03's no-enumeration concern doesn't apply here — Settings is an authenticated self-service form, and the admin edit path is already fully privileged. Backend should return a distinguishable error (e.g., a `EMAIL_TAKEN` code or 409) that the frontend maps to the inline message.

**Folded Todos**
None — the one matching todo (`2026-06-19-improve-user-management-and-email-based-auth-flows.md`) was already fully folded into Phase 23 and Phase 25's scope; nothing from it remains unresolved for this phase.

### Claude's Discretion
- Exact validation error copy and i18n key naming (follow existing `settings.*` / `admin.*` namespace conventions) — **resolved by UI-SPEC.md's Copywriting Contract**, treat as locked for planning.
- Whether the Settings Save button is disabled until the input value differs from the current email, or always enabled — **resolved by UI-SPEC.md**: always enabled except while submitting.
- Server-side email normalization (trim/lowercase) before uniqueness check and storage — **resolved by UI-SPEC.md and confirmed by this research**: `.trim().toLowerCase()` before validation/storage (see Pattern 1/2 Code Examples).
- Exact Prisma error handling for the unique constraint (P2002) → mapped to the `EMAIL_TAKEN`-style response — **resolved by this research**: `Prisma.PrismaClientKnownRequestError` + `code === 'P2002'` → `{ error: 'EMAIL_TAKEN' }`, 409.
- Dialog copy/layout details for the admin Edit Email modal (title, description, button labels) — **resolved by UI-SPEC.md's Interaction Contract §3**.
- Whether `PATCH /me` should accept `email` and `studyMode` independently in one call — **resolved by this research**: yes, via one combined partial `UpdateMeSchema` (see Architecture Pattern 1). Still remains the planner's call to confirm/implement.
- Whether admin email edit reuses `PATCH /users/:id` or gets a dedicated route — **resolved by this research, recommendation only**: reuse `PATCH /users/:id` (see Architecture Pattern 2). Planner's call to confirm.

### Deferred Ideas (OUT OF SCOPE)
- **Dashboard-wide or global "no email set" nudge** — raised and explicitly rejected for this phase; Settings-page-only warning is what's locked by ROADMAP success criteria. Could be proposed for a future phase if user feedback suggests the Settings-only warning is too easy to miss.
- **Email verification flow** — already tracked in `.planning/REQUIREMENTS.md` "Future Requirements"; unaffected by this phase.
</user_constraints>

## Summary

This phase is a pure extension of existing, already-working patterns — there is no new technology to evaluate. Every building block (Zod schema pattern, `react-hook-form` + `zodResolver` + shadcn `Form`, Prisma `P2002` unique-constraint handling, opaque error-code-to-toast mapping, single-shared-Dialog-instance admin pattern) already exists and is exercised elsewhere in this codebase (`ForgotPasswordPage.tsx`, `admin.ts` invite/reset-password routes, `AdminPage.tsx` delete-user AlertDialog). All file:line references cited in `29-CONTEXT.md` were verified against the current source and are accurate (see Verification table below). No new npm packages are required.

The two substantive technical decisions this research resolves (left open by CONTEXT.md's "Claude's Discretion") are: (1) `PATCH /api/auth/me` should accept `{ email }` and `{ studyMode }` **independently** via one combined, partial Zod schema — mirroring the exact optional-field-merge pattern `admin.ts` `PATCH /users/:id` already uses for `role`/`isActive` — rather than adding a second endpoint; and (2) the admin email edit should **reuse** the existing `PATCH /users/:id` endpoint (extending its select and body handling) rather than adding a new route, for the same reason. Both are additive, low-risk, minimal-diff changes to already-open handlers.

One real technical risk was found and is not mentioned in CONTEXT.md or the UI-SPEC: `POST /api/admin/invites` (Phase 24) does **not** normalize email casing before storing `InviteToken.email`, and that raw casing is copied verbatim into `User.email` at registration (`auth.ts` line 91). If Phase 29 normalizes (trim + lowercase) only on the *new* email-write paths (self-service, admin edit), a small casing inconsistency could exist between legacy invite-created accounts and the new normalized paths, which would not be caught by Postgres's case-sensitive `@unique` constraint. This does not block the phase (documented as an Open Question) but the planner should decide whether to also normalize on read/compare, or accept the residual edge case as out of scope.

**Primary recommendation:** Extend `GET /me`, `PATCH /me`, and `PATCH /users/:id` in place (add `email` to selects, add a shared `UpdateEmailSchema`/combined `UpdateMeSchema`), catch Prisma `P2002` in both write paths and map to `{ error: 'EMAIL_TAKEN' }` / 409, and build both forms with `react-hook-form` + `zodResolver` + shadcn `Form` exactly as `ForgotPasswordPage.tsx` already does — no new packages, no new routes beyond what's listed.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Return `email` on session hydration | API / Backend | Browser / Client (AuthContext type) | `GET /me` select list is the single source of truth for what `AuthContext.user` contains; frontend only needs a matching TS type |
| Self-service email update + validation | API / Backend | Browser / Client (form UX, inline error display) | Uniqueness must be enforced at the DB/Prisma layer (source of truth); Zod on both tiers is UX-only defense-in-depth (shared schema) |
| No-email warning banner | Browser / Client | — | Pure derived-state UI (`user?.email == null`); no backend involvement beyond `email` being present in the session payload |
| Admin email edit (any user) | API / Backend | Browser / Client (Dialog UI) | Same uniqueness/validation logic as self-service, reused server-side; admin-only authorization already enforced by `requireAdmin` middleware at the route-group level |
| Email format + uniqueness validation | API / Backend (Prisma `@unique` + Zod) | Shared package (`packages/shared`) | `packages/shared/src/schemas/user.ts` is the single source of truth for the Zod shape consumed by both frontend and backend — this project has no SSR/frontend-server tier (pure SPA) |

**Note:** This project has no Frontend-Server/SSR tier — `apps/frontend` is a client-only Vite SPA served as static files by the Hono backend (`serveStatic` + SPA fallback in `index.ts`). All "server" responsibility in this phase belongs to the `API / Backend` tier only.

## Verification of CONTEXT.md File:Line References

All references in `29-CONTEXT.md`'s `<canonical_refs>` were re-checked against current source and are **accurate**:

| Reference | CONTEXT.md claim | Verified |
|-----------|-------------------|----------|
| `auth.ts` `GET /me` | lines 234-248 | ✅ exact (`auth.get('/me', ...)` at 234, closing `})` at 248) |
| `auth.ts` `PATCH /me` | lines 252-267 | ✅ exact |
| `admin.ts` `GET /users` | lines 12-26 | ✅ exact, already selects `email: true` |
| `admin.ts` `PATCH /users/:id` | lines 30-79 | ✅ exact — body is hand-typed (`{ role?: string; isActive?: boolean }`), **not** Zod-validated (see Pitfall 4) |
| `admin.ts` `POST /users/:id/reset-password` | line 153+ | ✅ route starts at line 153; `NO_EMAIL` pattern at line 166-168 confirmed |
| `packages/shared/src/schemas/user.ts` line 16 | `UserSchema.email` already present | ✅ confirmed: `email: z.string().email().nullable().optional()` |
| `AuthContext.tsx` `User` interface | lines 8-15 | ✅ exact — `email` field is absent, needs adding |
| `AdminPage.tsx` DropdownMenu per row | lines ~464-475 | ✅ close (actual: 463-476) — contains `sendPasswordReset` + `deleteUser` items |
| `AdminPage.tsx` shared AlertDialog | line ~486 | ✅ close (actual: 486-530), `deleteTargetId`-controlled, outside `.map()` |

No corrections needed to CONTEXT.md's file:line claims.

## Standard Stack

### Core (all already installed — zero new packages)
| Library | Version (installed) | Purpose | Why Standard (in this codebase) |
|---------|---------|---------|--------------|
| `react-hook-form` | `^7.76.1` `[VERIFIED: apps/frontend/package.json]` | Form state + validation wiring | Exact pattern already used by `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`, `InviteRegisterPage.tsx`, `LoginPage.tsx` for every single-field, server-validated form |
| `@hookform/resolvers` | `^5.4.0` `[VERIFIED: apps/frontend/package.json]` | `zodResolver` bridge between RHF and Zod | Same as above |
| `zod` | `^3.23.8` `[VERIFIED: packages/shared/package.json]` | Shared validation schema, single source of truth | `packages/shared/src/schemas/*.ts` convention — never duplicate a validation shape between FE/BE |
| `@prisma/client` + `prisma` | `^7.0.0` `[VERIFIED: apps/backend/package.json]` | ORM, unique constraint enforcement | Already the only DB access layer; `Prisma.PrismaClientKnownRequestError` with `code === 'P2002'` is the stable, documented pattern for catching unique-constraint violations across all Prisma versions `[CITED: prisma.io/docs/orm/prisma-client/debugging-and-troubleshooting/handling-exceptions-and-errors]` |

### Supporting (already installed, first real UI consumer this phase)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn `Alert`/`AlertTitle`/`AlertDescription` | n/a (copy-paste, in-repo) | No-email warning banner | Installed in a prior phase, unused until now — confirmed at `apps/frontend/src/components/ui/alert.tsx`; `role="alert"` is built into the primitive (line 28), no manual a11y wiring needed |
| shadcn `Dialog` | n/a (copy-paste, in-repo) | Admin edit-email modal | Confirmed at `apps/frontend/src/components/ui/dialog.tsx`, unused until now; built-in `DialogClose` X provides redundant dismiss |
| shadcn `Form`/`FormField`/`FormItem`/`FormLabel`/`FormControl`/`FormMessage` | n/a (copy-paste, in-repo) | RHF+Zod wiring, inline error display | Confirmed at `apps/frontend/src/components/ui/form.tsx` — `FormMessage` renders `error.message` from RHF field state automatically; this **is** the D-07 "inline text under the input" mechanism, not a bespoke component |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| RHF + zodResolver + shadcn Form | Hand-rolled `useState` + manual error string (as `InviteTokensSection`/`UsersSection` in `AdminPage.tsx` currently do for their existing inputs) | Rejected — UI-SPEC already resolved this discretion point; `AdminPage.tsx`'s existing inputs are single-purpose action triggers (send invite, type-to-confirm), not validated forms with format+uniqueness rules, so they aren't the right precedent. `ForgotPasswordPage.tsx` (an actual email-format-validated form) is the correct analog. |
| Reusing `PATCH /users/:id` for admin email edit | New dedicated `PATCH /users/:id/email` route | Adding a route is not wrong, but duplicates the `P2002`-catch/normalization logic that would otherwise live in one place if merged into the existing handler. Recommend reuse (see Architecture Patterns). |

**Installation:** None — no `npm install` / `yarn add` needed for this phase.

## Package Legitimacy Audit

**Not applicable — this phase installs no new external packages.** All libraries used (`react-hook-form`, `@hookform/resolvers`, `zod`, `@prisma/client`) are already present in `package.json` and already in production use elsewhere in this codebase. No registry lookup or legitimacy check required.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EMAIL-09 | Users can add/update their own email from Settings (not yet enumerated in REQUIREMENTS.md — ROADMAP §Phase 29 is authoritative per CONTEXT.md; flag for a REQUIREMENTS.md reconciliation pass) | `PATCH /api/auth/me` extension (Architecture Pattern 1), Settings Email Card (UI-SPEC §1, already approved) |
| EMAIL-10 | No-email warning shown on Settings (password reset requires an email) | `GET /api/auth/me` returning `email: null`, Alert banner (UI-SPEC §2, already approved) |
| EMAIL-11 | Admin can set/update any user's email from the admin panel | `PATCH /api/admin/users/:id` extension (Architecture Pattern 2), Admin Edit Email Dialog (UI-SPEC §3, already approved) |
</phase_requirements>

## Architecture Patterns

### System Architecture Diagram

```
Browser (React SPA)
  │
  ├─ SettingsPage.tsx ── RHF+Zod form ──▶ PATCH /api/auth/me { email }
  │                                            │
  │                                            ▼
  │                              authMiddleware (JWT cookie → userId)
  │                                            │
  │                                            ▼
  │                          UpdateMeSchema.safeParse (email XOR studyMode, ≥1 required)
  │                                            │
  │                                            ▼
  │                     prisma.user.update({ where:{id:userId}, data:{email: normalized} })
  │                                            │
  │                              ┌─────────────┴─────────────┐
  │                              │ P2002 (unique violation)?  │
  │                         yes  ▼                        no  ▼
  │                    409 { error:'EMAIL_TAKEN' }   200 updated user (incl. email)
  │                              │                             │
  │                              ▼                             ▼
  │                 form.setError('email', ...)      setUser({...user, email})
  │                    (FormMessage inline)              toast.success()
  │
  ├─ AdminPage.tsx (UsersSection) ── "Edit email" DropdownMenuItem
  │        │
  │        ▼
  │  Dialog (editEmailTargetId state) ── RHF+Zod form ──▶ PATCH /api/admin/users/:id { email }
  │                                                              │
  │                                                              ▼
  │                                        requireAdmin middleware (role check)
  │                                                              │
  │                                                              ▼
  │                          existing role/isActive branch + new email branch
  │                          (normalize → prisma.user.update → catch P2002)
  │                                                              │
  │                              ┌───────────────────────────────┴──────────────┐
  │                         409 EMAIL_TAKEN → inline FormMessage        200 → toast + fetchUsers() refresh
  │
  └─ GET /api/auth/me (session hydration, on app load)
              │
              ▼
    select: { ..., email: true }  ──▶  AuthContext.user.email (null | string)
              │
              ▼
    SettingsPage: user?.email == null → render Alert banner
```

### Recommended Project Structure

No new files or directories — every touch-point is an existing file:

```
apps/backend/src/routes/
├── auth.ts          # GET /me + email:true; PATCH /me → UpdateMeSchema (combined)
└── admin.ts          # PATCH /users/:id → add email branch + email:true in select

packages/shared/src/schemas/
└── user.ts            # add UpdateEmailSchema + combined UpdateMeSchema

apps/frontend/src/
├── context/AuthContext.tsx   # User interface: add `email: string | null`
├── pages/SettingsPage.tsx    # new Email Card (first) + Alert banner (above it)
└── pages/AdminPage.tsx       # UsersSection: editEmailTargetId state, DropdownMenuItem, Dialog
```

### Pattern 1: Combined partial `PATCH /me` schema (resolves CONTEXT.md discretion item)

**What:** One Zod schema accepting `email` and `studyMode` as independent optional fields, refined to require at least one.
**When to use:** `PATCH /api/auth/me` — the endpoint is already shared infrastructure (auth + rate-limited), and `SettingsPage.tsx`'s two forms (study mode radio, email input) already fire independent PATCH calls with disjoint bodies (`{ studyMode }` only, or `{ email }` only) — never both fields in one request.
**Why not two endpoints:** `admin.ts`'s `PATCH /users/:id` already establishes the in-house convention for this exact shape — optional fields, build the Prisma `data` object conditionally from whichever keys were provided (see `admin.ts` lines 62-65 today). Reusing that idiom on `auth.ts` keeps the two "partial user update" endpoints in this codebase consistent with each other.

```typescript
// packages/shared/src/schemas/user.ts — new additions
export const UpdateEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Valid email address required.'),
})
export type UpdateEmailInput = z.infer<typeof UpdateEmailSchema>

// Combined schema for PATCH /me — mirrors admin.ts's optional-field-merge convention
export const UpdateMeSchema = z
  .object({
    studyMode: StudyModeSchema.optional(),
    email: z.string().trim().toLowerCase().email('Valid email address required.').optional(),
  })
  .refine((data) => data.studyMode !== undefined || data.email !== undefined, {
    message: 'At least one field is required.',
  })
export type UpdateMeInput = z.infer<typeof UpdateMeSchema>
```

```typescript
// apps/backend/src/routes/auth.ts — PATCH /me (replaces UpdateStudyModeSchema.safeParse)
auth.patch('/me', authMiddleware, async (c) => {
  const body = UpdateMeSchema.safeParse(await c.req.json())
  if (!body.success) {
    return c.json({ error: 'Validation failed.', details: body.error.flatten() }, 400)
  }
  const userId = c.get('userId')
  const data: { studyMode?: StudyMode; email?: string } = {}
  if (body.data.studyMode !== undefined) data.studyMode = body.data.studyMode
  if (body.data.email !== undefined) data.email = body.data.email // already trim+lowercased by Zod

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, username: true, role: true, isActive: true, studyMode: true, createdAt: true, email: true },
    })
    return c.json(updated, 200)
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return c.json({ error: 'EMAIL_TAKEN' }, 409)
    }
    throw err
  }
})
```
*(Source pattern for the P2002 catch: `[CITED: prisma.io/docs/orm/prisma-client/debugging-and-troubleshooting/handling-exceptions-and-errors]` — `import { Prisma } from '@prisma/client'` alongside the existing `prisma` client import.)*

### Pattern 2: Reuse `PATCH /users/:id` for admin email edit (resolves CONTEXT.md discretion item)

**What:** Extend the existing hand-typed body/`data` object in `admin.ts` `PATCH /users/:id` with an `email` branch, following the exact `if (body.x !== undefined) data.x = ...` shape already used for `role`/`isActive`.
**When to use:** Admin Edit Email Dialog submit handler (UI-SPEC §3) posts here.
**Why not a new route:** The handler already does per-field optional validation and a conditional Prisma `data` object — this is additive, not a rewrite. A dedicated `/email` sub-route would fragment the "update a user as admin" surface into two endpoints doing the same kind of thing for no behavioral benefit.

```typescript
// apps/backend/src/routes/admin.ts — PATCH /users/:id (additive changes only)
let body: { role?: string; isActive?: boolean; email?: string }   // add email
// ...existing role/isActive validation unchanged...

// New: validate + normalize email if provided
let normalizedEmail: string | undefined
if (body.email !== undefined) {
  const parsed = z.string().trim().toLowerCase().email().safeParse(body.email)
  if (!parsed.success) {
    return c.json({ error: 'Valid email address required.' }, 400)
  }
  normalizedEmail = parsed.data
}

// ...existing self-deactivation guard + existing-user check unchanged...

const data: { role?: 'ADMIN' | 'USER'; isActive?: boolean; email?: string } = {}
if (body.role !== undefined) data.role = body.role as 'ADMIN' | 'USER'
if (body.isActive !== undefined) data.isActive = body.isActive
if (normalizedEmail !== undefined) data.email = normalizedEmail

try {
  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, username: true, role: true, isActive: true, createdAt: true, email: true }, // add email: true
  })
  return c.json(updated, 200)
} catch (err) {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return c.json({ error: 'EMAIL_TAKEN' }, 409)
  }
  throw err
}
```

### Pattern 3: Non-optimistic email save (already locked by CONTEXT.md/UI-SPEC — confirmed correct)

**What:** Unlike `handleModeChange` (optimistic, revert-on-failure), the email save waits for the server response before touching `AuthContext`.
**Why:** `handleModeChange`'s revert branch (`SettingsPage.tsx` lines 45-63) is the wrong template here — a 409 conflict is an *expected, common* outcome for email edits (unlike study-mode changes, which essentially never fail), so briefly showing a wrong optimistic value and then reverting would be a worse UX than just waiting. Confirmed as UI-SPEC §1's explicit design.

### Anti-Patterns to Avoid
- **Do not wrap the email update in a `prisma.$transaction`:** unlike the invite-token/reset-token consumption flows (which need TOCTOU-safe atomic `updateMany` because two racing requests could both "win"), a single `prisma.user.update` with a `@unique` column is already atomic and TOCTOU-safe at the database level — the unique index itself is the race-safe gate. Adding a transaction here is unneeded complexity that CONTEXT.md's other patterns (invite/reset flows) do not apply to this case.
- **Do not add a `findUnique({ where: { email } })` pre-check before the update:** it doesn't close the race (two concurrent requests could both pass the pre-check) and duplicates work the unique constraint already does for free. Catch `P2002` instead — same reasoning Prisma's own docs give.
- **Do not use the shadcn `destructive` Alert variant for the no-email warning:** already resolved in UI-SPEC (amber custom classes, matching `ImportPage.tsx` line 347) — `destructive` is reserved project-wide for the fatal app-crash boundary in `App.tsx`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email format validation | Regex | `z.string().email()` (already in `UserSchema.email` and now `UpdateEmailSchema`) | Zod's email validator is already the project-wide standard (`RegisterSchema`, `PasswordResetRequestSchema`, `admin.ts` invite validation all use it) |
| Duplicate-email detection | Manual `findFirst` pre-check + custom error | Postgres `@unique` constraint + catch `Prisma.PrismaClientKnownRequestError` code `P2002` | Race-free by construction; pre-check-then-write is a classic TOCTOU bug |
| Inline form error display | Custom `<p className="text-red-500">` | shadcn `FormMessage` (already wired via `useFormField()` to RHF field state) | Automatic `aria-describedby`/`aria-invalid` wiring — hand-rolling loses the accessibility contract for free |

**Key insight:** Every piece of this phase already has a working precedent in this exact codebase (not a similar codebase, not a "best practice" from elsewhere) — the job is consistent reuse, not new design.

## Common Pitfalls

### Pitfall 1: `PATCH /me` schema swap breaks study-mode-only requests if not done carefully
**What goes wrong:** If `UpdateStudyModeSchema` is fully replaced by `UpdateMeSchema` without also updating every call site, a stray reference to the old schema/type elsewhere in the codebase could break compilation.
**Why it happens:** `UpdateStudyModeSchema` is exported from `packages/shared` and could theoretically be imported elsewhere.
**How to avoid:** `grep -r "UpdateStudyModeSchema" apps/` before removing/replacing it. Recommend **keeping** `UpdateStudyModeSchema` exported (it's still a valid, narrower shape) and adding `UpdateEmailSchema` + `UpdateMeSchema` alongside it — `UpdateMeSchema` is the one actually parsed by the route handler.
**Warning signs:** TypeScript build failure referencing `UpdateStudyModeInput` in a test file or elsewhere.

### Pitfall 2: Zod `.trim().toLowerCase().email()` chain order
**What goes wrong:** If `.email()` is called before `.trim()`/`.toLowerCase()`, a value like `" Foo@Bar.com "` (leading/trailing whitespace) would fail format validation before normalization ever runs.
**Why it happens:** Zod's `ZodString` transform methods (`trim`, `toLowerCase`, `toUpperCase`) return `ZodString` (not `ZodEffects`), so they chain like any other string check — but chain **order matters**, since each check/transform runs left-to-right against the *current* transformed value.
**How to avoid:** Always chain `.trim().toLowerCase().email(...)` in that order (transform first, validate the normalized form second) — this is the order used in the Code Examples above.
**Warning signs:** A valid email with surrounding whitespace or mixed case gets rejected by the schema when it shouldn't be.

### Pitfall 3: Legacy invite-created emails are not normalized (pre-existing, out of this phase's direct scope)
**What goes wrong:** `POST /api/admin/invites` (`admin.ts` line 241) validates with a bare `z.object({ email: z.string().email() }).safeParse(body)` — **no** `.trim().toLowerCase()`. That raw-cased value is stored on `InviteToken.email` and copied verbatim to `User.email` at registration (`auth.ts` line 91). If Phase 29's self-service/admin-edit paths normalize to lowercase but a legacy user's stored email is mixed-case (e.g., `Foo@Bar.com`), a *new* duplicate-check against `foo@bar.com` will not trigger Postgres's case-sensitive unique constraint — both rows can coexist, silently defeating uniqueness for that pair.
**Why it happens:** Normalization was never applied when `EMAIL-03`/`EMAIL-05` were built in Phase 24; this phase only touches the update paths, not the invite-creation path.
**How to avoid:** Documented as an Open Question below — planner should decide whether to (a) also add `.trim().toLowerCase()` to `POST /invites`' validation (small, safe addition, arguably a bug fix) or (b) explicitly accept the residual edge case (very low real-world likelihood for a 2-5 user self-hosted app) and note it as a known limitation.
**Warning signs:** None visible at Phase 29 test time (no legacy mixed-case data exists yet in a fresh v1.4 install) — this is a forward-looking risk, not a regression.

### Pitfall 4: `admin.ts` `PATCH /users/:id` body is currently hand-typed, not Zod-validated
**What goes wrong:** The existing handler parses `body` with a raw `await c.req.json()` cast to `{ role?: string; isActive?: boolean }` and validates manually (`if (body.role !== undefined && body.role !== 'ADMIN' ...)`). Adding `email` naively (e.g., `body.email as string`) without validation would let a non-email string reach `prisma.user.update` and either silently store garbage or throw an unhandled runtime error.
**Why it happens:** This route predates the RHF+Zod convention established later in Phase 25 (`ForgotPasswordPage.tsx` etc.); it was never retrofitted.
**How to avoid:** Validate `body.email` explicitly with a Zod one-liner before use (see Pattern 2's Code Example) — do not extend the manual-cast style to the new field, even though the surrounding code uses that style for `role`/`isActive`. This is the same reasoning `POST /invites` already applies (`z.object({ email: z.string().email() }).safeParse(body)` at line 241) — reuse that exact idiom, just add `.trim().toLowerCase()`.
**Warning signs:** A malformed email reaching `prisma.user.update` and throwing an unhandled `PrismaClientValidationError` instead of a clean 400.

### Pitfall 5: Self-conflict false positive does NOT occur (verified, not a real pitfall — noted to prevent unnecessary defensive code)
**What might look like a bug but isn't:** A user resubmitting their own current, unchanged email will **not** trigger `P2002` — Postgres's unique constraint only fires when a *different* row already has that value; `UPDATE ... SET email = 'x' WHERE id = <row that already has email = 'x'>` never conflicts with itself.
**Why this matters:** No special-case ("skip update if unchanged") is needed server-side purely for correctness — UI-SPEC's discretion note about the Save button not being dirty-gated is safe as written.

## Code Examples

### GET /me — add email to select (both success-criteria #1 requirement)
```typescript
// Source: apps/backend/src/routes/auth.ts lines 234-248 (current)
auth.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, role: true, isActive: true, studyMode: true, createdAt: true, email: true }, // + email: true
  })
  if (!user) return c.json({ error: 'Unauthorized.' }, 401)
  return c.json(user, 200) // email will be `null` (not undefined) for users without one — matches success criterion #1
})
```

### AuthContext type extension
```typescript
// Source: apps/frontend/src/context/AuthContext.tsx lines 8-15 (current)
export interface User {
  id: string
  username: string
  role: 'ADMIN' | 'USER'
  isActive: boolean
  studyMode: StudyMode
  createdAt: string
  email: string | null // new
}
```

### Frontend error-code mapping convention (already established — reuse verbatim)
```typescript
// Source: apps/frontend/src/pages/AdminPage.tsx lines 328-340 (handleSendPasswordReset) — the established
// code-not-string → localized-toast pattern. The new EMAIL_TAKEN case follows this same shape, but per
// D-07 renders inline via form.setError() instead of toast.error() (only error case that differs).
const body = await res.json().catch(() => ({}))
const errorCode = (body as { error?: string }).error
if (errorCode === 'EMAIL_TAKEN') {
  form.setError('email', { message: t('settings.emailTaken') })
} else {
  toast.error(t('settings.saveFailed'))
}
```

## State of the Art

Not applicable — this phase introduces no new library or pattern; it is a same-version extension of infrastructure built in Phases 23-25 within the same milestone. No deprecated/outdated approaches are involved.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `Prisma.PrismaClientKnownRequestError` with `code === 'P2002'` is the correct, stable way to catch a unique-constraint violation on Prisma 7 (this project's installed version) | Pattern 1 & 2 Code Examples, Standard Stack | Low — this is a long-stable, version-independent part of the public Prisma Client API `[CITED: official Prisma docs, confirmed via WebSearch this session]`; if wrong, the failure mode is an unhandled 500 instead of a clean 409, easily caught by manual testing of the duplicate-email path |
| A2 | Zod `ZodString.trim().toLowerCase().email()` chains correctly (transform-then-validate, in that order) without needing `.pipe()` | Pattern 1 Code Example, Pitfall 2 | Low-Medium — based on Zod v3's documented string-method chaining behavior, not independently executed in this research session; planner/executor should run one `.safeParse()` unit check on a mixed-case, whitespace-padded email during Wave 0 to confirm before relying on it |

## Open Questions

1. **Should `POST /api/admin/invites` also gain `.trim().toLowerCase()` normalization to close Pitfall 3's legacy-data gap?**
   - What we know: The gap is real (verified by reading `admin.ts` line 241) but currently has zero real-world impact (no existing installs have mixed-case duplicate emails yet, per a fresh v1.4 milestone).
   - What's unclear: Whether this is in scope for Phase 29 (EMAIL-09/10/11 only mention Settings + admin *update*, not invite creation) or should be filed as a follow-up quick task.
   - Recommendation: Treat as out of scope for this phase's plan (don't touch `invites.ts`/`POST /invites`), but flag it explicitly in the phase's implementation notes or as a follow-up todo — a one-line, low-risk fix when someone does pick it up.

2. **EMAIL-09/10/11 are not yet enumerated in `.planning/REQUIREMENTS.md`** (confirmed — file stops at `SEDIT-04`; CONTEXT.md already flagged this).
   - What we know: ROADMAP.md §Phase 29 success criteria are the authoritative source per CONTEXT.md.
   - What's unclear: Whether a REQUIREMENTS.md reconciliation edit is expected as part of this phase's plan or a separate docs pass.
   - Recommendation: Planner should include a small task to add EMAIL-09/10/11 rows to REQUIREMENTS.md's EMAIL section and update the Traceability table — this is a two-line doc edit, not a research risk, but leaving it undone would make future phase discovery harder.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 `[VERIFIED: STATE.md decision 03-01, apps/frontend/vitest.config.ts + apps/backend/vitest.config.ts]` |
| Config file | `apps/frontend/vitest.config.ts` (jsdom, `@testing-library/react`), `apps/backend/vitest.config.ts` (node) |
| Quick run command | `yarn workspace @kartex/frontend test -- SettingsPage` / `yarn workspace @kartex/backend test -- <file>` (adjust per actual yarn script name — confirm exact script in `package.json` during Wave 0) |
| Full suite command | `npm test` (per CLAUDE.md) / `yarn test` at workspace root |

### Established Test Convention in This Codebase (important — asymmetric coverage)
- **Frontend page tests** (`apps/frontend/src/pages/__tests__/*.test.tsx`) are fully implemented: real render + `fireEvent`/`waitFor` + mocked `api`, `useAuth`, `sonner` (see `SettingsPage.test.tsx`, `AdminPage.test.tsx` — both already exist and will need new test cases added, not new files).
- **Backend route tests** (`apps/backend/src/routes/__tests__/*.test.ts`) for admin/auth mutation endpoints are consistently `it.todo(...)` **structural stub declarations**, not executed integration tests — confirmed by reading `admin-delete.test.ts`, `admin-mailer.test.ts`, `library-toggle.test.ts` (all say "Full integration tests require Prisma mocking or a test DB... Fill in with `vi.mock('../../../lib/prisma.js')` in the execution pass" and never actually do). **This is the established pattern for this codebase, not a gap Phase 29 introduces** — the planner should follow it (add `it.todo(...)` stubs describing expected `EMAIL_TAKEN`/format/admin-auth behaviors for the new `auth.ts`/`admin.ts` branches) unless the plan explicitly wants to break from convention and add real Prisma mocking (a larger, precedent-breaking undertaking not asked for by this phase's scope).

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EMAIL-09 | `GET /me` returns `email` (null-safe) | structural/`it.todo` | new stub in a new/existing `auth-me.test.ts` | ❌ Wave 0 (no existing `auth.ts` test file found) |
| EMAIL-09 | `PATCH /me` accepts `{ email }`, rejects duplicate (409 `EMAIL_TAKEN`), rejects bad format (400) | structural/`it.todo` + frontend `SettingsPage.test.tsx` case | `it.todo` stubs (backend) + real RTL test (frontend, following existing SM2-01* numbering convention) | ⚠️ Partial — `SettingsPage.test.tsx` exists, needs new `EMAIL-09*`-prefixed cases added |
| EMAIL-10 | No-email Alert renders when `user.email == null`, hidden otherwise | frontend RTL test | real test in `SettingsPage.test.tsx` (`screen.getByRole('alert')` / `queryByRole`) | ⚠️ Partial — same file, new cases |
| EMAIL-11 | `PATCH /users/:id` accepts `{ email }` (admin), same conflict/format handling | structural/`it.todo` + frontend `AdminPage.test.tsx` case | `it.todo` stubs (backend, new file or append to an existing admin test file) + real RTL test (frontend) | ⚠️ Partial — `AdminPage.test.tsx` exists, needs new `EMAIL-11*`-prefixed cases added |

### Sampling Rate
- **Per task commit:** targeted `vitest` run against the touched test file(s) only
- **Per wave merge:** full `apps/frontend` + `apps/backend` test suites green
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] No existing `apps/backend/src/routes/__tests__/auth-me.test.ts` (or similarly named) file for `auth.ts` — create following the `it.todo` stub convention shown in `admin-delete.test.ts`/`admin-mailer.test.ts`
- [ ] `SettingsPage.test.tsx` needs new test cases for the Email Card + Alert banner (extend existing file, follow the existing `mockUser`/`mockApiPatch`/`vi.hoisted` setup already present — add `email` to the hoisted mock user fixture)
- [ ] `AdminPage.test.tsx` needs new test cases for the Edit Email Dialog (extend existing file, follow the existing `mockApiGet`/`mockApiPost`/`vi.hoisted` setup — note `mockApiPatch` already exists in this file's mock but is currently unused/`vi.fn()` stubbed at line 33, will need real assertions now)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | This phase does not touch password/session mechanics |
| V3 Session Management | No | Unaffected — email change does not invalidate sessions (unlike password reset's RESET-05, which explicitly does) |
| V4 Access Control | Yes | `authMiddleware` (JWT cookie) already gates `PATCH /me`; `requireAdmin` middleware (route-group level, `index.ts` line 86) already gates all of `/api/admin/*` including the extended `PATCH /users/:id` — no new access-control code needed, both are inherited |
| V5 Input Validation | Yes | Zod (`UpdateEmailSchema`/`UpdateMeSchema`, one-line inline schema for admin route) — never hand-roll email regex; `z.string().email()` project-wide convention |
| V6 Cryptography | No | Not applicable — no secrets/tokens generated in this phase |

### Known Threat Patterns for This Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Email enumeration via 409 conflict response | Information Disclosure | **Explicitly accepted risk, per CONTEXT.md D-08** — both surfaces are already-authenticated (Settings requires a valid session; Admin edit requires `ADMIN` role), unlike `POST /forgot-password` (`RESET-03`) which is a public, unauthenticated endpoint where enumeration is a real concern. The existing rate limiter (`rateLimitMiddleware(10, 60_000)` applied to all `/api/auth/*` routes, `auth.ts` line 16) already caps brute-force probing of `PATCH /me` even though enumeration itself is accepted for this authenticated context. `/api/admin/*` has no rate limiter but is role-gated, not IP-gated — consistent with how `POST /invites`/`POST /users/:id/reset-password` already behave. |
| Mass-assignment via hand-typed admin body | Tampering | Existing `admin.ts` `PATCH /users/:id` already whitelists exactly which body keys are read (`body.role`, `body.isActive`) rather than spreading the raw body into `data` — the new `email` field must follow the same explicit-whitelist discipline (see Pitfall 4's Code Example), not `...body` spreading |
| Unvalidated email reaching Prisma from the admin route's hand-typed body | Injection (data integrity, not SQLi — Prisma parameterizes queries) | Explicit Zod validation of `body.email` before use (Pitfall 4) — Prisma itself is already immune to SQL injection via parameterized queries, but a non-email string stored in the `email` column would break the invariant relied on by `forgot-password`'s `findUnique({ where: { email } })` lookup |

## Sources

### Primary (HIGH confidence — verified this session by reading source)
- `apps/backend/src/routes/auth.ts` (full file read) — `GET /me`, `PATCH /me`, existing error-code/transaction patterns
- `apps/backend/src/routes/admin.ts` (full file read) — `PATCH /users/:id`, `POST /invites`, `POST /users/:id/reset-password` (`NO_EMAIL` pattern)
- `apps/backend/prisma/schema.prisma` — `User.email String? @unique`
- `apps/frontend/src/pages/SettingsPage.tsx`, `AdminPage.tsx`, `ForgotPasswordPage.tsx` (full files read)
- `apps/frontend/src/context/AuthContext.tsx` (full file read)
- `apps/frontend/src/components/ui/{form,alert,dialog}.tsx` (full files read)
- `packages/shared/src/schemas/{user,auth,update}.ts`, `packages/shared/src/index.ts`
- `apps/backend/src/middleware/auth.ts`, `apps/backend/src/index.ts` — route registration and middleware ordering
- `apps/backend/src/lib/prisma.ts` — Prisma 7 + driver-adapter client construction
- Existing test files: `SettingsPage.test.tsx`, `AdminPage.test.tsx`, `admin-delete.test.ts`, `admin-mailer.test.ts`, `library-toggle.test.ts`
- `.planning/phases/29-user-email-self-service/29-UI-SPEC.md` (approved design contract — cross-checked, not re-derived)
- `.planning/config.json` — `nyquist_validation: true`, no `security_enforcement: false` override

### Secondary (MEDIUM confidence)
- [Prisma — Handling exceptions and errors](https://www.prisma.io/docs/orm/prisma-client/debugging-and-troubleshooting/handling-exceptions-and-errors) — confirmed `P2002` catch pattern via WebSearch this session

### Tertiary (LOW confidence)
- None — every claim in this document is either verified against this repo's source directly, or cited from official Prisma documentation confirmed this session.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new packages, every library already installed and precedented in this exact codebase
- Architecture: HIGH — both new patterns (combined `PATCH /me` schema, reused admin route) are direct extrapolations of an existing in-repo convention (`admin.ts`'s optional-field-merge for `role`/`isActive`), not invented from scratch
- Pitfalls: HIGH for Pitfalls 1, 2, 4, 5 (verified by direct source reading); MEDIUM for Pitfall 3 (real gap, confirmed by reading `admin.ts` line 241, but its practical impact is a judgment call left as an Open Question)

**Research date:** 2026-07-02
**Valid until:** No expiry driver — this is an internal, same-milestone extension of infrastructure that will not shift with external ecosystem changes. Re-verify only if `auth.ts`/`admin.ts`/`AuthContext.tsx` are modified by an intervening phase before Phase 29 executes.
