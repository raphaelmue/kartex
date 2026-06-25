# Phase 24: Email Invitations - Research

**Researched:** 2026-06-25
**Domain:** Token-based invite system — Node.js crypto, Prisma, nodemailer, React Router, react-hook-form
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** The `InviteCode` model, all admin routes (`GET/POST/DELETE /api/admin/invite-codes`), `InviteCodesSection` component, and `inviteCode` field in `RegisterSchema` are **removed entirely** in Phase 24. No backward compatibility layer.

**D-02:** SQL migration **drops the `InviteCode` table** and removes the `inviteCodeUsed` relation from `User`. This migration runs alongside the new `InviteToken` table migration (can be a single migration file or two separate ones — planner decides).

**D-03:** New dedicated route `/invite/:token` — a new `InviteRegisterPage` component. The token is a path segment, not a query param.

**D-04:** Old `/register` route and `RegisterPage` component are **removed entirely**. Registration is invitation-only; no public registration path remains.

**D-05:** Fields on `/invite/:token`: email (read-only, pre-filled from token), username (user sets), password (user sets), confirm password (user sets). Four fields total; email cannot be edited.

**D-06:** `InviteCodesSection` is replaced by **`InviteTokensSection`** — a single Card-based section in AdminPage. Top: email `<Input>` + "Send Invite" `<Button>`. Below: pending invites table.

**D-07:** Pending invites table columns: **Email · Sent date · Expires · Revoke** (icon button per row). Revoke triggers `DELETE /api/admin/invites/:id`.

**D-08:** Backend filters to **active-only** invites (WHERE usedAt IS NULL AND expiresAt > NOW()). Expired invites are not shown to admin.

**D-09:** Invalid/bad token states are handled **inline on `/invite/:token`**. On page load, frontend calls `GET /api/invites/:token`; if the backend returns an error, the page renders an error state instead of the registration form. No redirect.

**D-10:** **Three distinct error messages** shown inline:
  - Already used: "This invite has already been used."
  - Expired: "This invite link has expired. Contact an admin for a new invitation."
  - Not found / invalid: "This invite link is not valid."

### Claude's Discretion

None specified.

### Deferred Ideas (OUT OF SCOPE)

- **Resend invitation** — admin creates a new one if old expires. Resend as a shortcut (pre-fill email, revoke old) is a future UX improvement.
- **Invite expiry visibility to invitee** — email mentions 7-day expiry but the page itself could show a countdown; deferred.
- **Bulk invites** — sending to multiple emails at once; deferred.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EMAIL-03 | Admin can send an email invitation to a specific address from the admin panel | `POST /api/admin/invites` → `sendMail()` from Phase 23 mailer singleton |
| EMAIL-04 | Invitation email contains a one-time link (valid 7 days) navigating to the registration page | `crypto.randomBytes(32).toString('hex')` token stored in `InviteToken`, link = `${APP_URL}/invite/${token}` |
| EMAIL-05 | User registers via invite link — email pre-filled (read-only), user sets username and password | `InviteRegisterPage` — `GET /api/invites/:token` pre-fills email; `POST /api/auth/register` with token |
| EMAIL-06 | Invitation link is single-use; subsequent clicks show a clear "already used" error page | TOCTOU-safe `updateMany WHERE usedAt IS NULL` + count check in interactive `$transaction` |
| EMAIL-07 | Admin can see pending (unused, non-expired) invitations in the admin panel | `GET /api/admin/invites` filters `WHERE usedAt IS NULL AND expiresAt > NOW()` |
| EMAIL-08 | Admin can revoke a pending invitation | `DELETE /api/admin/invites/:id` — validates active status before deleting |
</phase_requirements>

---

## Summary

Phase 24 replaces the `InviteCode` system (admin-generated codes, manual sharing) with a proper email-invitation flow: admin enters an email address, the backend generates a cryptographically secure one-time token, stores it in a new `InviteToken` table, and sends an email with the invite link. The invitee opens the link, sees their email pre-filled (read-only), sets a username and password, and completes registration. The old `InviteCode` table and all its routes/components are removed entirely.

The phase has no new npm dependencies. It reuses the `nodemailer` singleton from Phase 23 (`apps/backend/src/lib/mailer.ts`), the existing `prisma.$transaction` pattern for atomic operations, and established React patterns (useParams, react-hook-form, shadcn/ui). The main technical decisions are: (1) token generation strategy (crypto.randomBytes vs cuid), (2) TOCTOU-safe single-use token consumption, and (3) the public-route placement of `/invite/:token` in the Hono backend and React Router frontend.

The SQL migration is the only database-breaking change: drop `InviteCode`, add `InviteToken`. The `User` table is not altered at the SQL level — `inviteCodeUsed` is a Prisma virtual relation field (no physical column), so no `ALTER TABLE` is needed for the User side.

**Primary recommendation:** Use `crypto.randomBytes(32).toString('hex')` for token generation (256-bit entropy, URL-safe hex). Store raw token in DB (7-day TTL limits exposure). Use interactive Prisma transaction for TOCTOU-safe consumption.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Token generation | API / Backend | — | Server-side only; never client-generated |
| Email sending | API / Backend | — | SMTP credentials live in backend env |
| Token validation (GET /api/invites/:token) | API / Backend | — | Database lookup; backend enforces expiry |
| Token consumption (POST /api/auth/register) | API / Backend | — | Atomic mark-used + user-create must be transactional |
| Admin invite management UI | Browser / Client | — | CRUD UI calling admin API endpoints |
| Invite registration page | Browser / Client | — | Public React page, calls public API for token check |
| SQL migration | Database / Storage | — | DDL: DROP InviteCode, CREATE InviteToken |
| Route gating (public vs protected) | Frontend Server (SSR) / Client | — | React Router: /invite/:token outside ProtectedRoute; Hono: invites router before authMiddleware |

---

## Standard Stack

### Core (no new packages — all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:crypto` | built-in (Node 20) | Token generation via `randomBytes(32)` | Node.js CSPRNG, no install needed |
| `nodemailer` | `^9.0.1` (installed) | Send invite emails via SMTP | Phase 23 singleton at `apps/backend/src/lib/mailer.ts` |
| `@prisma/client` | `^7.0.0` (installed) | `InviteToken` model CRUD, `$transaction` | Project ORM |
| `react-hook-form` | `^7.76.1` (installed) | Registration form on InviteRegisterPage | Established pattern (see RegisterPage.tsx) |
| `@hookform/resolvers/zod` | installed | Connect Zod schema to form | Established pattern |
| `react-router-dom` | `^6.28.0` (installed) | `useParams` for token path segment | Established pattern |
| `zod` | `^3.23.8` (installed) | Updated `RegisterSchema` (token replaces inviteCode) | Shared types source of truth |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `crypto.randomBytes(32).toString('hex')` | `cuid()` | cuid() is sequential/predictable — NOT suitable for security tokens; randomBytes gives 256-bit CSPRNG entropy |
| `crypto.randomBytes(32).toString('hex')` | `crypto.randomUUID()` | UUID is 122-bit entropy (acceptable) but hex token is more conventional for URL invite links and slightly more entropy |
| Raw token stored in DB | SHA-256 hash stored in DB | Hashing (OWASP best practice) adds complexity; 7-day TTL and admin-only creation make raw acceptable here; Phase 25 reset tokens WILL use hashing |
| Interactive `$transaction` for consumption | Sequential findUnique + update | Sequential approach has TOCTOU race: two concurrent requests can both pass the `usedAt IS NULL` check before either marks it used |

**Installation:** None required — all dependencies already installed in the project.

---

## Package Legitimacy Audit

> Phase 24 installs **no new packages**. The only external dependency is `nodemailer`, already present at `^9.0.1` since Phase 23.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `nodemailer` | npm | ~13 yrs | 18M/wk | github.com/nodemailer/nodemailer | SUS (too-new latest version) | Approved — established package, already installed; "too-new" flag is for the 2026-06-17 patch release of an 8-year-old package |

**Packages removed due to [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** `nodemailer` — flagged only because a patch was published 2026-06-17; the package itself is 13 years old with 18M weekly downloads. Already installed and in use since Phase 23. No further action required.

---

## Architecture Patterns

### System Architecture Diagram

```
Admin Browser
  │  POST /api/admin/invites { email }
  │                                     ┌─────────────────────────────┐
  ▼                                     │ Backend                     │
Hono (requireAdmin middleware)           │   1. Generate token         │
  │  → admin.ts POST /invites           │      crypto.randomBytes(32) │
  │                                     │   2. Store InviteToken row  │
  │                                     │   3. sendMail() invite link │
  │                                     └─────────────────────────────┘
  │
  │  ← { id, email, expiresAt, createdAt }
  ▼
InviteTokensSection (AdminPage)
  refreshes pending table via GET /api/admin/invites

─────────────────────────────────────────────────────────────────

Invitee Browser
  │  Opens email link: APP_URL/invite/<token>
  ▼
React Router: <Route path="/invite/:token" element={<InviteRegisterPage />} />
  │  (PUBLIC — outside ProtectedRoute)
  │
  │  GET /api/invites/:token  (PUBLIC — before authMiddleware in index.ts)
  │  ← { email } or { error: "ALREADY_USED" | "EXPIRED" | "NOT_FOUND" }
  ▼
InviteRegisterPage
  │  If error → renders inline error message (D-09, D-10)
  │  If OK    → renders form: email(readonly) + username + password + confirmPassword
  │
  │  POST /api/auth/register { token, username, password }
  │  → Interactive $transaction:
  │     updateMany InviteToken WHERE token=X AND usedAt IS NULL → count check
  │     user.create(...)
  │  ← 200 { message } or 400/409
  ▼
redirect to /login with { registered: true }
```

### Recommended Project Structure

New files to create:

```
apps/backend/src/routes/
├── invites.ts            ← GET /api/invites/:token (public validate endpoint)
├── admin.ts              ← modified: remove invite-codes, add invite-tokens endpoints

apps/backend/prisma/migrations/
├── 20260625000000_add_invite_token/
│   └── migration.sql     ← DROP InviteCode, CREATE InviteToken

apps/backend/prisma/
└── schema.prisma         ← remove InviteCode model + User.inviteCodeUsed relation,
                             add InviteToken model

packages/shared/src/schemas/
└── auth.ts               ← RegisterSchema: replace inviteCode with token field

apps/frontend/src/pages/
├── InviteRegisterPage.tsx  ← NEW public registration page
├── RegisterPage.tsx        ← DELETED
└── AdminPage.tsx           ← modified: InviteCodesSection → InviteTokensSection

apps/frontend/src/
└── App.tsx               ← add /invite/:token route (public), remove /register route

apps/frontend/src/locales/
├── en.json               ← add auth.invite* keys, admin.inviteTokens* keys
└── de.json               ← same keys in German
```

### Pattern 1: Public Hono Route Before authMiddleware

The `GET /api/invites/:token` endpoint must be mounted BEFORE step 4 (authMiddleware) in `apps/backend/src/index.ts`. This follows the exact same pattern as `mediaPublicRouter`:

```typescript
// Source: apps/backend/src/index.ts (existing pattern, lines 51-57)

// ─── 3c. Public invite validation route (no auth required) ────────────────
app.route('/api/invites', invitesPublicRouter)

// ─── 4. JWT auth middleware on all remaining /api/* routes ────────────────
app.use('/api/*', authMiddleware)
```

The `invitesPublicRouter` lives in `apps/backend/src/routes/invites.ts` and handles only `GET /:token`.

### Pattern 2: TOCTOU-Safe Token Consumption

The `POST /api/auth/register` endpoint uses an interactive Prisma transaction to atomically consume the invite token and create the user. This prevents two concurrent registrations on the same token from both succeeding:

```typescript
// Source: Prisma 7 interactive transaction pattern (established in Phase 16/23)
await prisma.$transaction(async (tx) => {
  // Mark token used — only one caller wins the WHERE usedAt IS NULL race
  const result = await tx.inviteToken.updateMany({
    where: { token, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  })
  if (result.count === 0) {
    // Token was already consumed or expired — throw to abort transaction
    throw new Error('TOKEN_CONSUMED')
  }

  // Check username uniqueness (inside transaction for consistency)
  const existing = await tx.user.findUnique({ where: { username } })
  if (existing) throw new Error('USERNAME_TAKEN')

  // Create user
  await tx.user.create({ data: { username, passwordHash, email } })
})
```

Catch the thrown errors outside the transaction to map to HTTP responses.

**Note:** `updateMany` returns `{ count: N }`. If count is 0, the token was either already used or the WHERE clause didn't match (expired). Distinguish these with a pre-check `findUnique` BEFORE the transaction (for user-facing error messages) — the transaction's job is just TOCTOU safety.

### Pattern 3: Token Generation

```typescript
// Source: Node.js built-in crypto module (Node 20, CSPRNG)
import { randomBytes } from 'node:crypto'

const token = randomBytes(32).toString('hex') // 64-char hex string, 256-bit entropy
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
```

Store `token` raw in `InviteToken.token`. The link becomes `${process.env.APP_URL}/invite/${token}`.

### Pattern 4: React Router Public Route

The `/invite/:token` route must be OUTSIDE the `ProtectedRoute` wrapper — it is public. Follow the same structure as `/login`:

```typescript
// Source: apps/frontend/src/App.tsx (existing structure, line 57-58)
<Route path="/login" element={<LoginPage />} />
// Remove: <Route path="/register" element={<RegisterPage />} />
<Route path="/invite/:token" element={<InviteRegisterPage />} />

<Route element={<ProtectedRoute />}>
  {/* ... authenticated routes ... */}
</Route>
```

### Pattern 5: Read-Only Email Input

Use a disabled `<Input>` — it renders visually greyed-out and prevents editing. Do NOT use `readOnly` without `disabled` as the value still participates in form submission:

```typescript
// Source: apps/frontend/src/pages/RegisterPage.tsx (existing useForm + zodResolver pattern)
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>{t('auth.emailLabel')}</FormLabel>
      <FormControl>
        <Input type="email" disabled {...field} />
      </FormControl>
    </FormItem>
  )}
/>
```

The `email` field is set via `form.setValue('email', data.email)` after the token validation response.

### Pattern 6: InviteToken Prisma Model

```prisma
// Source: apps/backend/prisma/schema.prisma (new model to add)
model InviteToken {
  id        String    @id @default(cuid())
  email     String
  token     String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
}
```

No FK to `User` — the token is email-based; once consumed, the user row contains the email. This simplifies cascade deletes (no cleanup needed when a user is deleted).

### Pattern 7: SQL Migration

```sql
-- Source: apps/backend/prisma/migrations/20260621000000_add_user_email/migration.sql (format reference)
-- apps/backend/prisma/migrations/20260625000000_add_invite_token/migration.sql

-- Add InviteToken table
CREATE TABLE "InviteToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InviteToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InviteToken_token_key" ON "InviteToken"("token");

-- Drop InviteCode table (FK to User via usedById must be dropped first)
ALTER TABLE "InviteCode" DROP CONSTRAINT IF EXISTS "InviteCode_usedById_fkey";
DROP TABLE IF EXISTS "InviteCode";
```

**Critical:** The `InviteCode.usedById` FK constraint must be dropped before the table can be dropped. In PostgreSQL, `DROP TABLE` with `CASCADE` handles this, but explicit is safer in production.

### Anti-Patterns to Avoid

- **cuid() for security tokens:** cuid values are sequential and predictable. An attacker who knows one token can enumerate adjacent ones. Use `crypto.randomBytes(32).toString('hex')` exclusively for the token value.
- **Sequential findUnique + update for token consumption:** The pattern `if (token.usedAt !== null) return 400; ... update(usedAt)` has a TOCTOU race condition. Use interactive `$transaction` with `updateMany WHERE usedAt IS NULL` and count check.
- **Placing `/invite/:token` inside ProtectedRoute:** The invitee is not authenticated when following the invite link — this would redirect them to `/login`, breaking the flow.
- **Placing `invitesPublicRouter` after `authMiddleware` in index.ts:** Same breakage as above, from the API side.
- **Sending `confirmPassword` to the backend:** Confirm password validation is client-side only. The `RegisterSchema` in shared takes `{ token, username, password }` — no `confirmPassword` field. Frontend validates match before submit.
- **Not removing `inviteCode.deleteMany` from admin user cascade delete:** The current `DELETE /api/admin/users/:id` transaction includes `prisma.inviteCode.deleteMany({ where: { usedById: id } })`. After removing the `InviteCode` model, this line must be removed (it will cause a TypeScript error and runtime failure).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cryptographically secure random bytes | Custom token generator | `crypto.randomBytes(32)` (Node built-in) | Weak PRNG leads to guessable tokens |
| Atomic read-modify-write on token | findUnique → check → update (3 sequential DB calls) | Prisma `$transaction` with `updateMany WHERE usedAt IS NULL` | Sequential approach has TOCTOU race |
| Email sending | Custom SMTP client | `sendMail()` from `apps/backend/src/lib/mailer.ts` | Phase 23 singleton already handles all env var wiring |
| Form validation with readonly fields | Manual DOM events | react-hook-form `disabled` input + `form.setValue()` | Form state management is already handled |
| Email address validation | Regex | Zod `z.string().email()` | Zod already in shared schemas; consistent with project patterns |

**Key insight:** This phase is primarily wiring — token generation (built-in), email (existing singleton), DB (existing ORM). Resist adding new dependencies.

---

## Runtime State Inventory

> This is a migration/removal phase (dropping InviteCode system).

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | `InviteCode` table rows in PostgreSQL | Dropped by migration SQL; any existing active invite codes become inaccessible (acceptable — clean cut per D-01) |
| Live service config | None — InviteCode admin routes are stateless API endpoints | None |
| OS-registered state | None | None |
| Secrets/env vars | No env vars specific to InviteCode system | None |
| Build artifacts | TypeScript types for `InviteCode` in Prisma client; `inviteCode` field in `RegisterSchema` | Handled by removing model from schema.prisma + running `prisma generate` + updating shared schema |

**Nothing found in category:** Live service config, OS-registered state, Secrets/env vars — verified by codebase grep.

**Migration note:** The `prisma.$transaction` in `admin.ts` `DELETE /users/:id` currently includes `prisma.inviteCode.deleteMany(...)`. This line must be removed (model no longer exists after migration). This is a code change, not a data migration.

---

## Common Pitfalls

### Pitfall 1: Forgetting to Mount invitesPublicRouter Before authMiddleware

**What goes wrong:** `GET /api/invites/:token` returns 401 Unauthorized when unauthenticated invitees hit it.

**Why it happens:** `app.use('/api/*', authMiddleware)` at step 4 of index.ts blocks all `/api/*` routes registered after it, including invites. The fix is to register `invitesPublicRouter` at step 3c (between `mediaPublicRouter` and authMiddleware).

**How to avoid:** Look at lines 51–57 of `apps/backend/src/index.ts` and place `app.route('/api/invites', invitesPublicRouter)` in that block.

**Warning signs:** Integration test for invite page fails with 401; or frontend console shows 401 on the token validation call.

### Pitfall 2: Placing /invite/:token Inside ProtectedRoute in React Router

**What goes wrong:** Invitees who aren't logged in are redirected to `/login` before reaching the registration form. The invite flow is broken.

**Why it happens:** `ProtectedRoute` checks `useAuth()` and redirects to `/login` if no user. Public routes must sit outside the `<Route element={<ProtectedRoute />}>` wrapper.

**How to avoid:** In App.tsx, add `<Route path="/invite/:token" element={<InviteRegisterPage />} />` alongside `<Route path="/login" ...>` — before the `<Route element={<ProtectedRoute />}>` block.

**Warning signs:** Browser redirects to `/login` when clicking invite link; AuthContext mock not needed in InviteRegisterPage tests because the page doesn't use `useAuth`.

### Pitfall 3: Not Removing inviteCode.deleteMany From User Cascade Delete

**What goes wrong:** `DELETE /api/admin/users/:id` throws a TypeScript error (Prisma client has no `inviteCode` property after schema change) or a runtime error.

**Why it happens:** `apps/backend/src/routes/admin.ts` line 130 has `prisma.inviteCode.deleteMany({ where: { usedById: id } })` inside the `$transaction` array. After removing `InviteCode` from schema.prisma and running `prisma generate`, this line becomes a type error.

**How to avoid:** Remove this line from the transaction array in admin.ts as part of the `InviteCode` removal work.

**Warning signs:** TypeScript compile error on `prisma.inviteCode`; CI fails on type-check.

### Pitfall 4: Forgetting inviteCodeUsed Relation Cleanup in schema.prisma

**What goes wrong:** `prisma generate` fails with "relation field inviteCodeUsed references model InviteCode which does not exist."

**Why it happens:** The `User` model has `inviteCodeUsed InviteCode?` relation field. Dropping `InviteCode` from the schema without also removing this line causes a Prisma validation error.

**How to avoid:** Remove both the `InviteCode` model AND the `inviteCodeUsed InviteCode?` line from the `User` model in schema.prisma atomically.

**Warning signs:** `prisma generate` emits a "model not found" error.

### Pitfall 5: Sending confirmPassword to Backend

**What goes wrong:** Backend `RegisterSchema` validation fails because the schema does not expect `confirmPassword`.

**Why it happens:** Developers add `confirmPassword` to the Zod schema for convenience, but the backend doesn't need it — password equality is a UI concern.

**How to avoid:** `confirmPassword` lives only in the InviteRegisterPage form (local `useState` or a separate field outside the Zod schema). The `api.post('/api/auth/register', { token, username, password })` call does not include `confirmPassword`.

**Warning signs:** Backend returns 400 with Zod validation error mentioning unexpected field; or test mocking fails.

### Pitfall 6: i18n Key Parity Between en.json and de.json

**What goes wrong:** German locale falls back to the raw key string (e.g., "auth.inviteAlreadyUsed") instead of a German translation.

**Why it happens:** en.json and de.json get out of sync when keys are added to only one file.

**How to avoid:** Add all new i18n keys to BOTH locale files in the same commit (established decision from Phase 10-05).

**Warning signs:** German UI shows raw key strings like `auth.inviteAlreadyUsed`.

### Pitfall 7: Interactive Transaction Confusion — throw vs return

**What goes wrong:** Error handling inside `prisma.$transaction(async (tx) => {...})` uses `return` instead of `throw`, so the transaction commits partially and errors are silently swallowed.

**Why it happens:** In interactive transactions, you must `throw` an error to abort. Returning early just exits the callback normally (commit happens).

**How to avoid:** Always `throw new Error('...')` inside the transaction callback when an invalid state is detected. Catch outside the `$transaction` call to map to HTTP responses.

**Warning signs:** Token is marked used AND an error response is sent; or transaction "succeeds" but user is not created.

---

## Code Examples

### Generate Invite Token and Send Email

```typescript
// Source: Node.js built-in crypto + apps/backend/src/lib/mailer.ts pattern
import { randomBytes } from 'node:crypto'
import { sendMail, isConfigured } from '../lib/mailer.js'

// In POST /api/admin/invites handler:
const token = randomBytes(32).toString('hex')
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

const invite = await prisma.inviteToken.create({
  data: { email, token, expiresAt },
})

if (!isConfigured()) {
  return c.json({ error: 'SMTP not configured.' }, 400)
}

const appUrl = process.env.APP_URL ?? 'http://localhost:3000'
await sendMail({
  to: email,
  subject: 'You've been invited to Kartex',
  text: `You've been invited to Kartex. Complete your registration within 7 days:\n${appUrl}/invite/${token}`,
  html: `<p>You've been invited to Kartex.</p>
<p><a href="${appUrl}/invite/${token}">Complete your registration</a></p>
<p>This link expires in 7 days.</p>`,
})

return c.json({ id: invite.id, email: invite.email, expiresAt: invite.expiresAt, createdAt: invite.createdAt }, 200)
```

### TOCTOU-Safe Register Route

```typescript
// Source: Prisma 7 interactive transaction pattern (Phase 16/23 established)
auth.post('/register', async (c) => {
  const body = RegisterSchema.safeParse(await c.req.json())
  if (!body.success) {
    return c.json({ error: 'Validation failed.', details: body.error.flatten() }, 400)
  }

  const { token, username, password } = body.data

  // Pre-check for user-facing error messages (not TOCTOU-safe — purely informational)
  const invite = await prisma.inviteToken.findUnique({ where: { token } })
  if (!invite) {
    return c.json({ error: 'NOT_FOUND' }, 400)
  }
  if (invite.usedAt !== null) {
    return c.json({ error: 'ALREADY_USED' }, 400)
  }
  if (invite.expiresAt < new Date()) {
    return c.json({ error: 'EXPIRED' }, 400)
  }

  try {
    await prisma.$transaction(async (tx) => {
      // TOCTOU-safe atomic consumption
      const result = await tx.inviteToken.updateMany({
        where: { token, usedAt: null },
        data: { usedAt: new Date() },
      })
      if (result.count === 0) throw new Error('TOKEN_CONSUMED')

      const existing = await tx.user.findUnique({ where: { username } })
      if (existing) throw new Error('USERNAME_TAKEN')

      const passwordHash = await bcrypt.hash(password, 12)
      await tx.user.create({ data: { username, passwordHash, email: invite.email } })
    })
  } catch (err) {
    const msg = (err as Error).message
    if (msg === 'TOKEN_CONSUMED') return c.json({ error: 'ALREADY_USED' }, 400)
    if (msg === 'USERNAME_TAKEN') return c.json({ error: 'USERNAME_TAKEN' }, 409)
    throw err
  }

  return c.json({ message: 'Account created.' }, 200)
})
```

### InviteRegisterPage Token Validation on Mount

```typescript
// Source: apps/frontend/src/pages/RegisterPage.tsx + DeckDetailPage.tsx patterns
export function InviteRegisterPage() {
  const { token } = useParams<{ token: string }>()
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const form = useForm<RegisterInput>({ resolver: zodResolver(RegisterSchema), defaultValues: { token: token ?? '', username: '', password: '' } })

  useEffect(() => {
    if (!token) { setErrorCode('NOT_FOUND'); setStatus('error'); return }
    api.get(`/api/invites/${token}`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json()
          form.setValue('email', data.email) // pre-fill read-only field (display only)
          setStatus('ok')
        } else {
          const body = await res.json().catch(() => ({}))
          setErrorCode((body as { error?: string }).error ?? 'NOT_FOUND')
          setStatus('error')
        }
      })
      .catch(() => { setErrorCode('NOT_FOUND'); setStatus('error') })
  }, [token])
  // ...
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Admin-generated random code string (manual share) | Email invite with one-time token link | Phase 24 | Eliminates manual code distribution; email = identity proof |
| Open `/register` route with invite code | Token-based `/invite/:token` route | Phase 24 | No public registration path exists; invite = only entry |
| `inviteCode` field in RegisterSchema | `token` field in RegisterSchema | Phase 24 | Breaking schema change — update both shared schema and all consumers |

**Deprecated/outdated:**
- `InviteCode` model: removed — replaced by `InviteToken`
- `GET/POST/DELETE /api/admin/invite-codes`: removed — replaced by `/api/admin/invites`
- `InviteCodesSection` component: removed — replaced by `InviteTokensSection`
- `RegisterPage` component: removed — replaced by `InviteRegisterPage`
- `/register` route: removed — replaced by `/invite/:token`
- `inviteCode` field in `RegisterSchema`: removed — replaced by `token`

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `inviteCodeUsed` in schema.prisma is a virtual Prisma relation field — no physical DB column on `User` table | Runtime State Inventory / SQL Migration | If it were a physical column, migration would need `ALTER TABLE User DROP COLUMN` — verify by checking init migration.sql |
| A2 | Storing raw token (not hashed) in `InviteToken.token` is acceptable given 7-day TTL | Standard Stack | If security posture requires hash-only storage, backend `GET /api/invites/:token` lookup must change from `findUnique({ where: { token } })` to SHA-256 hash then lookup |
| A3 | `InviteToken` needs no FK to `User` (email-only link, no usedById) | Architecture Patterns | If audit trail of which user used which token is needed, add `usedById String? @unique` FK — but CONTEXT.md defers audit log to future phases |
| A4 | The confirm password field is client-side only (not sent to backend) | Code Examples | Per CONTEXT.md specifics section, confirmed. Low risk. |

---

## Open Questions

1. **Single migration file vs two separate files for DROP InviteCode + CREATE InviteToken?**
   - What we know: D-02 says "can be a single migration file or two separate ones — planner decides"
   - What's unclear: Production risk of a combined migration that both drops and creates in one transaction
   - Recommendation: Single migration file is cleaner and ensures atomicity (either both changes apply or neither). Use a single file with timestamp `20260625000000_replace_invite_code_with_invite_token`.

2. **Should the raw invite token in the DB be SHA-256 hashed (OWASP pattern)?**
   - What we know: Phase 25 reset tokens WILL be hashed per STATE.md v1.4-research decision. Invite tokens in Phase 24 are simpler.
   - What's unclear: Whether the security team requires consistency across all one-time tokens
   - Recommendation: Store raw for Phase 24 (simpler, 7-day TTL limits exposure). Refactor to hashed in a future security hardening pass if needed. If hashing is chosen, `GET /api/invites/:token` must compute SHA-256 of the URL token before DB lookup.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 20 | crypto.randomBytes | ✓ | v20.20.2 | — |
| Docker | Migration via docker-compose entrypoint | ✓ | 29.6.0 | — |
| PostgreSQL (via Docker) | `InviteToken` DDL | ✓ (Docker) | 16 (container) | — |
| nodemailer | Email sending | ✓ (installed) | 9.0.1 | Return 400 if SMTP not configured (soft-fail pattern) |
| SMTP server | Live email delivery | Not checked locally | — | Mailer singleton soft-fails on missing SMTP env vars |

**Missing dependencies with no fallback:** None — all blocking dependencies available.

**Missing dependencies with fallback:** SMTP server — soft-fail already implemented in Phase 23 mailer singleton. If SMTP not configured, `isConfigured()` returns false and routes return a descriptive 400.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 |
| Config file | `apps/frontend/vitest.config.ts` |
| Quick run command | `yarn workspace @kartex/frontend vitest run` |
| Full suite command | `yarn workspace @kartex/frontend vitest run --reporter=verbose` |

**Baseline:** 15 test files, 123 tests, all passing (verified 2026-06-25).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EMAIL-03 | Admin sends invite: form submit calls POST /api/admin/invites | unit | `vitest run src/pages/__tests__/AdminPage.test.tsx` | ❌ Wave 0 |
| EMAIL-03 | Invite sent success: toast shown, table refreshes | unit | same | ❌ Wave 0 |
| EMAIL-04 | Email contains invite link (backend test) | manual | — | manual-only |
| EMAIL-05 | InviteRegisterPage renders form with pre-filled email on valid token | unit | `vitest run src/pages/__tests__/InviteRegisterPage.test.tsx` | ❌ Wave 0 |
| EMAIL-05 | Register submit calls POST /api/auth/register with { token, username, password } | unit | same | ❌ Wave 0 |
| EMAIL-06 | Already-used token: inline error "already been used" | unit | same | ❌ Wave 0 |
| EMAIL-06 | Expired token: inline error "link has expired" | unit | same | ❌ Wave 0 |
| EMAIL-06 | Invalid token: inline error "link is not valid" | unit | same | ❌ Wave 0 |
| EMAIL-07 | Admin pending invites table renders email/sent/expires columns | unit | `vitest run src/pages/__tests__/AdminPage.test.tsx` | ❌ Wave 0 |
| EMAIL-08 | Revoke button calls DELETE /api/admin/invites/:id | unit | same | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `yarn workspace @kartex/frontend vitest run`
- **Per wave merge:** `yarn workspace @kartex/frontend vitest run --reporter=verbose`
- **Phase gate:** Full suite green (123 existing + new tests passing) before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `apps/frontend/src/pages/__tests__/AdminPage.test.tsx` — covers EMAIL-03, EMAIL-07, EMAIL-08
- [ ] `apps/frontend/src/pages/__tests__/InviteRegisterPage.test.tsx` — covers EMAIL-05, EMAIL-06
- [ ] Mocking pattern for InviteRegisterPage: mock `react-router-dom` useParams (return `{ token: 'abc123' }`), mock `@/lib/api` (api.get for token validation, api.post for register), no AuthContext mock needed (public page)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Invite token = proof of invitation before account creation; must be single-use and time-limited |
| V3 Session Management | no | No new session management; login after registration uses existing JWT flow |
| V4 Access Control | yes | Admin-only routes guarded by `requireAdmin` middleware; public validate endpoint is read-only |
| V5 Input Validation | yes | Zod `z.string().email()` for email in admin invite form; `RegisterSchema` for registration body |
| V6 Cryptography | yes | `crypto.randomBytes(32)` — Node.js CSPRNG; never Math.random() or cuid() for security tokens |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Token brute-force enumeration | Information Disclosure | 256-bit entropy from `randomBytes(32)` — 2^256 space; rate limiting already on `/api/auth` routes |
| Token replay after use | Spoofing | Single-use: `usedAt` set atomically in `$transaction`; subsequent calls return ALREADY_USED |
| Token timing attack on lookup | Information Disclosure | `findUnique({ where: { token } })` is constant-time index scan; distinct error codes (ALREADY_USED vs EXPIRED vs NOT_FOUND) do not reveal token existence to unauthenticated attacker beyond what the link itself implies |
| Admin privilege escalation via invite | Elevation of Privilege | `POST /api/auth/register` always creates USER role — no role parameter accepted from client |
| Email address spoofing | Spoofing | Admin controls which email receives the invite; email is pre-filled read-only on the form — invitee cannot change the email they register with |
| CSRF on admin invite creation | Tampering | SameSite cookie on JWT + CORS restricted to ALLOWED_ORIGIN; existing protection applies |

---

## Project Constraints (from CLAUDE.md)

| Directive | Phase 24 Impact |
|-----------|----------------|
| JWT stored in httpOnly cookie — never localStorage | No change; register endpoint returns 200 without setting cookies (invitee must log in after registration) |
| All Zod schemas live in `packages/shared/src/schemas/` | `RegisterSchema` update (replace inviteCode with token) must go in `packages/shared/src/schemas/auth.ts` |
| Hono routes in `apps/backend/src/routes/` — one file per resource | New `invites.ts` for public validate route; admin invite routes go in `admin.ts` |
| All secrets via `.env` — never hardcoded | `APP_URL` env var for constructing invite links; token is runtime-generated, not from env |
| Hand-written SQL migrations; `prisma migrate deploy` only | Migration SQL manually authored for `InviteToken` table and `InviteCode` drop |
| shadcn/ui components copied into `apps/frontend/src/components/` | No new shadcn components needed — `Input`, `Button`, `Table`, `Card` already installed |

---

## Sources

### Primary (MEDIUM confidence — codebase verified)
- `apps/backend/src/lib/mailer.ts` — nodemailer singleton: `sendMail()`, `isConfigured()`, `verifyConnection()`
- `apps/backend/src/index.ts` — Hono route mounting order; public-before-authMiddleware pattern confirmed
- `apps/backend/src/routes/auth.ts` — existing `RegisterSchema` usage; bcrypt hash pattern; `$transaction` not yet used here (added in Phase 24)
- `apps/backend/src/routes/admin.ts` — `inviteCode.deleteMany` in cascade delete (must remove); `requireAdmin` middleware; existing invite-codes route structure
- `apps/backend/prisma/schema.prisma` — `InviteCode` model structure; `User.inviteCodeUsed` virtual relation; `RefreshToken` FK pattern for reference
- `apps/backend/prisma/migrations/` — Migration SQL format: bare `ALTER TABLE`/`CREATE TABLE` statements, no migration metadata header

### Secondary (MEDIUM confidence — framework documentation)
- React Router v6 `useParams` — confirmed via project usage in DeckDetailPage.tsx (`useParams<{ id: string }>()`)
- Prisma `$transaction` interactive pattern — confirmed via Phase 16/23 decisions in STATE.md
- react-hook-form `disabled` input + `setValue` — confirmed via RegisterPage.tsx form patterns

### Tertiary (LOW confidence — websearch)
- `crypto.randomBytes(32).toString('hex')` for 256-bit one-time tokens — OWASP recommendation, standard Node.js CSPRNG practice [ASSUMED from training + websearch confirmation]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages installed and versions confirmed via package.json
- Architecture: HIGH — patterns confirmed from existing codebase (index.ts mounting order, $transaction usage, useParams pattern)
- Pitfalls: HIGH — pitfalls derived from direct code reading (inviteCode.deleteMany in cascade, ProtectedRoute structure in App.tsx)
- Token security: MEDIUM — websearch confirmed standard practice; not from official Node.js docs query

**Research date:** 2026-06-25
**Valid until:** 2026-07-25 (stable Node.js/Prisma/React Router stack)
