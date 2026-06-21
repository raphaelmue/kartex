# Phase 23: Auth Foundation - Research

**Researched:** 2026-06-21
**Domain:** Backend: Prisma schema migration, nodemailer SMTP singleton, Hono DELETE endpoint, cascade user delete. Frontend: shadcn AlertDialog + DropdownMenu delete flow, admin table column addition, i18n keys.
**Confidence:** MEDIUM

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Dialog uses shadcn AlertDialog — single shared instance outside the user row map loop, controlled by `deleteTargetId` state (mirrors DecksPage pattern).
- **D-02:** Trigger is a 3-dot DropdownMenu per row with a "Delete user" option (consistent with DecksPage / Phase 22 DropdownMenu pattern).
- **D-03:** Dialog body shows a static category list — "This will permanently delete their decks, cards, study progress, and review logs." No live count prefetch or extra API call.
- **D-04:** Admin must type the target username to enable the confirm button (ADMIN-02 requirement).
- **D-05:** Use explicit ordered `prisma.$transaction` — no new `onDelete: Cascade` FK constraints added to schema. Delete order: RefreshToken → DeckShare (sharedWithUserId) → CardProgress → Cards in user's Decks → Decks → InviteCode (usedById) → User. (ReviewLog already has `onDelete: Cascade` on both userId and cardId so it auto-deletes.)
- **D-06:** Media files are deleted from disk during the transaction. Query `Media` records owned by the user, delete files from the local volume, then delete `Media` rows inside the transaction.
- **D-07:** Media file deletion is best-effort — if a file delete fails (missing file, permissions error), log the error and continue; do not roll back the transaction.
- **D-08:** Last-admin guard: before executing delete, count `users WHERE role='ADMIN' AND isActive=true`. If count ≤ 1 and the target is the last active admin, return 400 with a clear error message. Also block self-delete (`id === authenticatedUserId`).
- **D-09:** nodemailer singleton configured via env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `APP_URL`.
- **D-10:** Soft fail on startup — if SMTP env vars are missing or incomplete, log a warning but the server starts normally. The mailer returns a descriptive error when called.
- **D-11:** Add an admin "Send test email" button in AdminPage. Posts to `POST /api/admin/mailer/test`. Sends a test email to the logged-in admin's own email address.
- **D-12:** If the admin has no email address set, the test-send endpoint returns an error and the frontend shows a toast: "Set your email address first."
- **D-13:** Add email as an inline table column in the UsersSection user table. Show `—` (em dash) for null emails, consistent with the invite code "Used by" column.
- **D-14:** Email is display-only in Phase 23. No inline edit capability.

### Claude's Discretion

None specified — all implementation decisions are locked.

### Deferred Ideas (OUT OF SCOPE)

- Admin edit user email — viewing only in Phase 23; editing deferred
- Resend invitation — captured in REQUIREMENTS.md future requirements; not in this phase
- Return-to-study after card edit — unrelated to this phase
- "Support deck update via zip file upload" (maps to Phase 27)
- "Add quick-edit / jump-to-card button in study mode" (maps to Phase 28)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EMAIL-01 | User.email field exists on User model, nullable for existing users, unique per user | SQL migration `ALTER TABLE "User" ADD COLUMN "email" TEXT UNIQUE;` — nullable by default in Postgres; zero-downtime because nullable with no default |
| EMAIL-02 | SMTP configured via env vars (SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM, APP_URL) | nodemailer singleton module in `apps/backend/src/lib/mailer.ts`; soft-fail init pattern mirrors `seedAdminIfNeeded` |
| ADMIN-01 | Admin can permanently delete a user account from the admin panel | `DELETE /api/admin/users/:id` in admin.ts; `prisma.$transaction` ordered delete; media file cleanup via `fs.unlink` best-effort |
| ADMIN-02 | Delete requires two-step confirmation (modal + type username to confirm) | AlertDialog with controlled Input; confirm button disabled until `inputValue === targetUsername` |
| ADMIN-03 | Confirmation dialog explicitly lists what will be deleted | Static text in AlertDialogDescription (D-03) |
| ADMIN-04 | Admin cannot delete their own account or the last admin account | Two guards in DELETE handler: self-delete check + count admins where role='ADMIN' AND isActive=true |
| ADMIN-05 | Admin can see each user's email address in the user list | New `email` TableHead + TableCell in UsersSection; `GET /api/admin/users` SELECT extended to include `email` |
</phase_requirements>

---

## Summary

Phase 23 is a pure infrastructure phase: no new pages, no routing changes. It adds three capabilities on top of the existing admin foundation — an email column on the User model, a nodemailer SMTP singleton, and a hard-delete user endpoint with a two-step confirmation UI.

The codebase already has every pattern this phase needs. The `deleteTargetId` + AlertDialog + DropdownMenu pattern is live in `DecksPage.tsx` (lines 66, 218–232, 279–302). The `prisma.$transaction` ordered delete is established from Phase 16. The soft-fail startup guard is established from Phase 12 (`seedAdminIfNeeded`). The hand-written SQL migration pattern is established from Phases 10 and 18.

The only new external dependency is `nodemailer` + `@types/nodemailer`, both well-established packages on npm. nodemailer@9.0.1 is the current release. No new shadcn components are needed — AlertDialog, DropdownMenu, Input, Button, Table, Card are all already installed.

**Primary recommendation:** Follow the decision tree exactly as specified in CONTEXT.md. Every implementation detail is locked — the planner's job is to decompose into sequential tasks that match existing codebase patterns, not to make new architectural decisions.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Email column on User model | Database / Storage | API / Backend | Schema change + migration owns the data; backend SELECT exposes it |
| SMTP mailer singleton | API / Backend | — | Singleton lives in backend lib; no frontend involvement |
| `DELETE /api/admin/users/:id` endpoint | API / Backend | Database / Storage | Business logic (guards, transaction) in API; DB executes cascade deletes |
| Two-step delete dialog (AlertDialog + username input) | Browser / Client | — | Pure UI — no SSR; controlled component in React |
| Email column in admin user table | Browser / Client | API / Backend | Frontend renders from API response; backend SELECT must include email |
| Admin "Send test email" button | Browser / Client | API / Backend | Frontend POSTs; backend calls mailer singleton |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `nodemailer` | 9.0.1 [VERIFIED: npm registry] | SMTP email transport — createTransport, sendMail, verify | De-facto Node.js email library; 18M weekly downloads; zero runtime deps; used in v1.4-research decision |
| `@types/nodemailer` | 8.0.1 [VERIFIED: npm registry] | TypeScript types for nodemailer | DefinitelyTyped; 9M weekly downloads |
| `prisma` (existing) | 7.x | ORM — `$transaction` for ordered cascade delete | Already in use; `$transaction` array form is the documented pattern for ordered deletes |
| `fs/promises` (Node built-in) | Node 20 | `unlink()` for best-effort media file deletion | Built-in — no extra dependency |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn `AlertDialog` (existing) | — | Two-step delete confirmation modal | Already installed in `apps/frontend/src/components/ui/alert-dialog.tsx`; live in `DecksPage.tsx` |
| shadcn `DropdownMenu` (existing) | — | 3-dot per-row user action menu | Already installed; established pattern in `DecksPage.tsx` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| nodemailer | `@sendgrid/mail` or AWS SES | External SaaS dependency — requires account + API key; overkill for self-hosted 2-5 users |
| `prisma.$transaction` array form | Interactive `$transaction(async tx => ...)` | Array form is simpler for sequential deletes; interactive form needed only for conditional logic mid-transaction |
| Hand-written SQL migration | `prisma migrate dev` | `prisma migrate dev` unavailable without DATABASE_URL in bash env (10-02 decision); hand-written SQL is the established pattern |

**Installation (new packages only):**
```bash
yarn workspace @kartex/backend add nodemailer
yarn workspace @kartex/backend add -D @types/nodemailer
```

---

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `nodemailer` | npm | ~13 yrs | 18M/wk | github.com/nodemailer/nodemailer | SUS (too-new latest version) | Approved — `too-new` flag is for the v9.0.1 release date (2026-06-17), not the package; established 13-year-old package with 18M weekly downloads |
| `@types/nodemailer` | npm | ~8 yrs | 9M/wk | github.com/DefinitelyTyped/DefinitelyTyped | SUS (too-new latest version) | Approved — same reason; DefinitelyTyped repo is authoritative |

**Packages removed due to SLOP verdict:** none

**Packages flagged as suspicious SUS:** `nodemailer` and `@types/nodemailer` received `SUS` from the legitimacy seam due to a recent version publish date (within 30 days), NOT due to low downloads or missing source repo. With 18M and 9M weekly downloads respectively and well-known GitHub repositories, both packages are legitimate and safe. The seam's `too-new` signal reflects a version update, not a new package.

---

## Architecture Patterns

### System Architecture Diagram

```
Admin browser
   │  GET /api/admin/users  (includes email field)
   │  DELETE /api/admin/users/:id
   │  POST /api/admin/mailer/test
   ▼
Hono /api/admin/* (requireAdmin middleware)
   │
   ├── GET /users ─────────────────────────────► prisma.user.findMany({ select: { ..., email: true } })
   │
   ├── DELETE /users/:id
   │   ├── Guard: self-delete check (id === userId) → 400
   │   ├── Guard: last-admin check (count ADMIN + isActive) → 400
   │   ├── Media cleanup: prisma.media.findMany({ownerId}) → fs.unlink (best-effort)
   │   └── prisma.$transaction([
   │         deleteMany RefreshToken(userId)
   │         deleteMany DeckShare(sharedWithUserId)
   │         deleteMany CardProgress(userId)
   │         deleteMany Cards in user's Decks (via deckIds)
   │         deleteMany Decks(ownerId)
   │         deleteMany InviteCode(usedById)   [nullable FK]
   │         delete     User(id)
   │       ])
   │
   └── POST /mailer/test
       ├── lookup admin email from prisma.user.findUnique
       ├── if no email → 400 "Set your email address first"
       └── mailer singleton → transporter.sendMail → 200 / 500
            │
apps/backend/src/lib/mailer.ts (singleton)
   ├── init: createTransport({host, port, secure, auth}) from env vars
   ├── soft-fail: if env vars missing → log warning, transporter = null
   └── export: sendMail(options), isConfigured(): bool
```

### Recommended Project Structure

```
apps/backend/src/
├── lib/
│   ├── mailer.ts           ← NEW: nodemailer singleton
│   ├── prisma.ts           (existing)
│   ├── jwt.ts              (existing)
│   ├── seed.ts             (existing)
│   └── sm2.ts              (existing)
├── routes/
│   └── admin.ts            ← MODIFIED: add DELETE /users/:id, POST /mailer/test, extend GET /users
└── ...

apps/backend/prisma/
├── migrations/
│   └── 20260621000000_add_user_email/
│       └── migration.sql   ← NEW: ALTER TABLE "User" ADD COLUMN "email" TEXT UNIQUE;
└── schema.prisma           ← MODIFIED: add email field to User model

packages/shared/src/schemas/
└── user.ts                 ← MODIFIED: add email to UserSchema

apps/frontend/src/
├── pages/
│   └── AdminPage.tsx       ← MODIFIED: add MailerSection, extend UsersSection (email col + delete dialog)
└── locales/
    ├── en.json             ← MODIFIED: add admin.* keys
    └── de.json             ← MODIFIED: add admin.* keys (same commit)
```

### Pattern 1: nodemailer Singleton (Soft-Fail)

**What:** A module-level singleton that initializes the SMTP transporter from env vars on first import. If env vars are missing, logs a warning and exports a null-transporter that returns descriptive errors.

**When to use:** Any server-side email sending. Import `mailer` from `lib/mailer.ts` and call `mailer.sendMail(options)`.

**Example:**
```typescript
// apps/backend/src/lib/mailer.ts
// [ASSUMED] — pattern synthesized from nodemailer docs + seedAdminIfNeeded soft-fail model
import nodemailer from 'nodemailer'
import type { SendMailOptions } from 'nodemailer'

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null

const {
  SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM,
} = process.env

if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && SMTP_FROM) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
  console.log('[mailer] SMTP configured.')
} else {
  console.warn('[mailer] SMTP env vars missing — email disabled.')
}

export async function sendMail(options: SendMailOptions): Promise<void> {
  if (!transporter) {
    throw new Error('SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.')
  }
  await transporter.sendMail(options)
}

export function isConfigured(): boolean {
  return transporter !== null
}
```

### Pattern 2: Ordered Cascade Delete via `prisma.$transaction`

**What:** Sequential array transaction that deletes all user-owned/user-linked records in FK-safe order before deleting the User row.

**When to use:** `DELETE /api/admin/users/:id` — the only hard-delete operation in Phase 23.

**Example (delete order follows FK graph):**
```typescript
// [CITED: prisma.io/docs/orm/prisma-client/queries/transactions]
// Pattern: sequential $transaction ensures FK constraint order
const userDecks = await prisma.deck.findMany({
  where: { ownerId: id },
  select: { id: true },
})
const deckIds = userDecks.map((d) => d.id)

await prisma.$transaction([
  prisma.refreshToken.deleteMany({ where: { userId: id } }),
  prisma.deckShare.deleteMany({ where: { sharedWithUserId: id } }),
  prisma.cardProgress.deleteMany({ where: { userId: id } }),
  prisma.card.deleteMany({ where: { deckId: { in: deckIds } } }),
  prisma.deck.deleteMany({ where: { ownerId: id } }),
  prisma.inviteCode.deleteMany({ where: { usedById: id } }),
  prisma.media.deleteMany({ where: { ownerId: id } }),
  prisma.user.delete({ where: { id } }),
])
// Note: ReviewLog auto-deleted by existing onDelete: Cascade on userId FK
// Note: DeckShare where deckId IN deckIds auto-deleted by existing onDelete: Cascade on Deck
```

**Media file cleanup (before transaction):**
```typescript
// [ASSUMED] — pattern derived from D-06/D-07 decisions and Node fs/promises
import { unlink } from 'node:fs/promises'
import path from 'node:path'

const mediaRecords = await prisma.media.findMany({ where: { ownerId: id } })
const storagePath = process.env.STORAGE_PATH ?? '/app/media'
for (const m of mediaRecords) {
  try {
    await unlink(path.join(storagePath, m.filename))
  } catch (err) {
    console.warn(`[admin] Could not delete media file ${m.filename}:`, (err as Error).message)
    // D-07: best-effort — continue, do not abort
  }
}
```

### Pattern 3: deleteTargetId + AlertDialog + DropdownMenu (established in DecksPage.tsx)

**What:** Single AlertDialog outside the `.map()` loop, controlled by `deleteTargetId: string | null`. DropdownMenuTrigger per row opens the menu; "Delete user" item sets `deleteTargetId`. Phase 23 adds a controlled Input inside the AlertDialog for username confirmation.

**When to use:** Any table row deletion that requires confirmation.

**Key points from live DecksPage.tsx code:**
```tsx
// [VERIFIED: codebase — apps/frontend/src/pages/DecksPage.tsx]
const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

// Outside .map() loop:
<AlertDialog
  open={deleteTargetId !== null}
  onOpenChange={(open) => { if (!open) setDeleteTargetId(null) }}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>...</AlertDialogTitle>
      <AlertDialogDescription>...</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
      {/* Use Button not AlertDialogAction — controls dismiss timing */}
      <Button
        variant="destructive"
        onClick={() => { if (deleteTargetId) void handleDelete(deleteTargetId) }}
      >
        {t('decks.deleteButton')}
      </Button>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

// Inside .map():
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button size="sm" variant="ghost" aria-label={t('...')}>
      <MoreVertical className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem
      className="text-destructive focus:text-destructive"
      onClick={() => setDeleteTargetId(deck.id)}
    >
      {t('decks.deleteDeck')}
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Phase 23 addition — username Input inside AlertDialog:**
```tsx
// [ASSUMED] — extends established AlertDialog pattern with controlled Input
const [usernameInput, setUsernameInput] = useState('')
const deleteTarget = users.find((u) => u.id === deleteTargetId)

// Inside AlertDialogContent, before AlertDialogFooter:
<Input
  value={usernameInput}
  onChange={(e) => setUsernameInput(e.target.value)}
  placeholder={deleteTarget?.username ?? ''}
  aria-label={t('admin.deleteUserTypePlaceholder')}
/>
// Confirm button disabled until input matches:
<Button
  variant="destructive"
  disabled={usernameInput !== (deleteTarget?.username ?? '')}
  onClick={() => { if (deleteTargetId) void handleDeleteUser(deleteTargetId) }}
>
  {t('admin.deleteUser')}
</Button>
// Reset input when dialog closes:
onOpenChange={(open) => {
  if (!open) { setDeleteTargetId(null); setUsernameInput('') }
}}
```

### Pattern 4: Hand-Written SQL Migration (established pattern)

**What:** Manually create a migration directory and `.sql` file; apply via `prisma migrate deploy` or Docker Compose entrypoint. No `prisma migrate dev` (10-02 decision).

**Migration for EMAIL-01:**
```sql
-- Migration: add_user_email
-- [ASSUMED] — follows existing migration format; ALTER TABLE nullable column = zero-downtime
-- Nullable by default in Postgres when no NOT NULL constraint specified.
-- UNIQUE allows multiple NULLs (Postgres NULL ≠ NULL).
ALTER TABLE "User" ADD COLUMN "email" TEXT UNIQUE;
```

**Migration directory name:** `20260621000000_add_user_email` (follow existing naming: YYYYMMDDHHMMSS_description)

### Pattern 5: Extending `UserSchema` in shared package

**What:** Add `email` field to `UserSchema` in `packages/shared/src/schemas/user.ts`. This propagates type safety to both frontend (`AdminPage.tsx` `UserRecord` interface) and backend (`GET /api/admin/users` SELECT shape).

**Change:**
```typescript
// [ASSUMED] — extends existing UserSchema; matches CONTEXT.md §Integration Points
export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  role: UserRole,
  isActive: z.boolean(),
  studyMode: StudyModeSchema.default('normal'),
  createdAt: z.coerce.date(),
  email: z.string().email().nullable().optional(),  // ← ADD
})
```

**Frontend `UserRecord` interface update:**
```typescript
// AdminPage.tsx — add email field
interface UserRecord {
  id: string
  username: string
  role: 'ADMIN' | 'USER'
  isActive: boolean
  createdAt: string
  email?: string | null  // ← ADD
}
```

### Anti-Patterns to Avoid

- **Using `AlertDialogAction` instead of `Button` for the confirm action:** `AlertDialogAction` auto-closes the dialog before the async handler completes; use `Button` inside `AlertDialogFooter` instead (established pattern from DecksPage.tsx line 293 comment).
- **Adding `onDelete: Cascade` to User FK relations in schema:** D-05 locks this as explicit ordered `$transaction` instead — no schema FK changes.
- **Creating multiple mailer instances:** nodemailer's `createTransport` should be called once at module load; never per-request. The singleton module ensures this.
- **Calling `transporter.verify()` in the singleton init:** `verify()` opens a connection and can delay server startup; call it only in the test-send endpoint handler, not at initialization.
- **Calling `prisma.user.findUnique` inside the `$transaction` for the last-admin check:** Do the guard queries BEFORE the transaction to keep the transaction short and avoid unnecessary rollback.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SMTP transport | Custom TCP/TLS email sender | `nodemailer.createTransport` | SMTP protocol complexity: AUTH, STARTTLS, connection pooling, DKIM, retry — all handled |
| Email rendering | String template concatenation | nodemailer `html` + `text` fields | Phase 23 sends only a test email — simple strings; Phase 24 will need templates |
| Transaction rollback logic | Manual compensating transactions | `prisma.$transaction` array form | Prisma wraps all operations; database guarantees atomicity on failure |
| Dialog confirmation state | Multiple boolean flags per row | Single `deleteTargetId: string \| null` pattern | Established in DecksPage; one state drives open/closed + which item |

**Key insight:** nodemailer handles every SMTP edge case (AUTH mechanisms, STARTTLS negotiation, connection pooling, TLS certificate validation). The `verify()` method is purpose-built for testing SMTP connectivity without sending a message — use it in the test-send endpoint.

---

## Common Pitfalls

### Pitfall 1: UNIQUE constraint on nullable `email` column in Postgres

**What goes wrong:** Attempting to apply a UNIQUE constraint that rejects multiple NULL values — some databases enforce UNIQUE on NULLs.

**Why it happens:** SQL standard says NULL ≠ NULL, but some ORMs or databases behave differently.

**How to avoid:** Postgres correctly allows multiple NULL values in a UNIQUE column (NULL ≠ NULL per SQL standard). The migration `ALTER TABLE "User" ADD COLUMN "email" TEXT UNIQUE;` is correct. No partial index needed. [ASSUMED — standard Postgres behavior]

**Warning signs:** Migration fails with constraint violation on existing users if column is added as NOT NULL without a default.

---

### Pitfall 2: `prisma.$transaction` array form requires pre-computed `deckIds`

**What goes wrong:** Attempting to reference `prisma.deck.findMany` result inside the same transaction array — the array is evaluated eagerly before the transaction opens.

**Why it happens:** The array form of `$transaction` takes pre-built query promises; there is no sequential awareness within the array itself.

**How to avoid:** Query `deckIds` BEFORE building the `$transaction` array:
```typescript
const deckIds = (await prisma.deck.findMany({
  where: { ownerId: id },
  select: { id: true },
})).map((d) => d.id)

await prisma.$transaction([
  prisma.card.deleteMany({ where: { deckId: { in: deckIds } } }),
  ...
])
```

**Warning signs:** TypeScript error on `await` inside `$transaction([...])` array literal.

---

### Pitfall 3: `nodemailer` import in ESM/TypeScript context

**What goes wrong:** `import nodemailer from 'nodemailer'` fails at runtime with "does not provide an export named 'default'" in some ESM configurations.

**Why it happens:** nodemailer ships as CommonJS. The backend uses `tsx` for development and compiles to CJS (check `tsconfig.json`). Most configurations work with default import, but ESM-only setups may need `import * as nodemailer from 'nodemailer'`.

**How to avoid:** Check the backend `tsconfig.json` `module` setting. The existing codebase imports other CJS packages (bcryptjs) without issue — the same approach applies to nodemailer. [ASSUMED]

**Warning signs:** Runtime error at mailer module import.

---

### Pitfall 4: Last-admin guard race condition

**What goes wrong:** Two concurrent DELETE requests for the last two admin users both pass the count check, then both delete.

**Why it happens:** Count check and delete are not atomic without a DB-level lock.

**How to avoid:** For a 2–5 user self-hosted app this risk is negligible. The count check before transaction is the correct approach per D-08. A database-level serializable transaction would over-engineer this. [ASSUMED — acceptable for app scale]

**Warning signs:** Not a practical concern given target user count.

---

### Pitfall 5: AlertDialog username input state not reset on close

**What goes wrong:** Admin opens delete dialog for User A, types "alice", cancels, opens dialog for User B — input still shows "alice". User B's confirm button is disabled (correct) but input shows wrong value.

**Why it happens:** React state persists across dialog open/close cycles when the same component instance is reused.

**How to avoid:** Reset `usernameInput` to `''` in the `onOpenChange` handler when `open === false`:
```tsx
onOpenChange={(open) => {
  if (!open) { setDeleteTargetId(null); setUsernameInput('') }
}}
```

---

### Pitfall 6: i18n keys in both locale files in the same commit

**What goes wrong:** Adding keys to `en.json` but forgetting `de.json` — missing de.json keys fall back to the raw key string (not English value), causing visible broken UI for German users.

**Why it happens:** `i18next` does not fall back to the default language when a key exists but is undefined in another language file — it falls back to the key string (Pitfall 5, 10-05 decision).

**How to avoid:** Update `en.json` and `de.json` atomically in one commit. The 14 new admin keys must be added to both files.

---

### Pitfall 7: `GET /api/admin/users` SELECT must include `email`

**What goes wrong:** Email column added to DB and schema but `GET /api/admin/users` Prisma `select` object not updated — API returns users without `email`, frontend renders all `—`.

**Why it happens:** Prisma requires explicit `select` field enumeration; new fields are not auto-included.

**How to avoid:** Add `email: true` to the `select` object in the existing `admin.get('/users', ...)` handler.

---

## Code Examples

Verified patterns from official sources and codebase:

### nodemailer createTransport (SMTP)
```typescript
// Source: nodemailer.com (WebSearch confirmed); nodemailer@9.0.1
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.example.com',
  port: 587,
  secure: false,           // true only for port 465
  auth: {
    user: 'user@example.com',
    pass: 'secret',
  },
})
```

### nodemailer verify()
```typescript
// Source: nodemailer.com (WebSearch confirmed)
// verify() tests SMTP connection without sending; resolves on success, rejects on failure
try {
  await transporter.verify()
  console.log('[mailer] SMTP connection verified.')
} catch (err) {
  console.error('[mailer] SMTP verification failed:', (err as Error).message)
}
```

### nodemailer sendMail
```typescript
// Source: nodemailer.com (WebSearch confirmed)
const info = await transporter.sendMail({
  from: '"Kartex" <noreply@example.com>',
  to: 'admin@example.com',
  subject: 'Kartex — SMTP test email',
  text: 'This is a test email from your Kartex instance.',
  html: '<p>This is a test email from your Kartex instance.</p>',
})
```

### Prisma $transaction ordered delete
```typescript
// Source: prisma.io/docs/orm/prisma-client/queries/transactions [CITED]
await prisma.$transaction([
  prisma.refreshToken.deleteMany({ where: { userId: id } }),
  prisma.deckShare.deleteMany({ where: { sharedWithUserId: id } }),
  prisma.cardProgress.deleteMany({ where: { userId: id } }),
  prisma.card.deleteMany({ where: { deckId: { in: deckIds } } }),
  prisma.deck.deleteMany({ where: { ownerId: id } }),
  prisma.inviteCode.deleteMany({ where: { usedById: id } }),
  prisma.media.deleteMany({ where: { ownerId: id } }),
  prisma.user.delete({ where: { id } }),
])
```

### Hono DELETE handler guard pattern (from existing admin.ts)
```typescript
// Source: apps/backend/src/routes/admin.ts [VERIFIED: codebase]
admin.delete('/users/:id', async (c) => {
  const { id } = c.req.param()
  const authenticatedUserId = c.get('userId')

  // Guard 1: self-delete
  if (id === authenticatedUserId) {
    return c.json({ error: 'Cannot delete your own account.' }, 400)
  }

  // Guard 2: last admin
  const adminCount = await prisma.user.count({
    where: { role: 'ADMIN', isActive: true },
  })
  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) return c.json({ error: 'User not found.' }, 404)
  if (adminCount <= 1 && target.role === 'ADMIN') {
    return c.json({ error: 'Cannot delete the last admin account.' }, 400)
  }

  // ... media cleanup, then $transaction
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline confirm buttons in table row | AlertDialog outside map loop (deleteTargetId pattern) | Phase 17/18 in this project | Single dialog instance; no N portal instances |
| `onDelete: Cascade` FK for all relations | Mix: Cascade where appropriate, explicit $transaction for complex cases | Existing schema (see schema.prisma) | ReviewLog has Cascade; user-delete requires explicit ordering |
| `prisma migrate dev` | Hand-written SQL + `prisma migrate deploy` | Phase 10 (10-02 decision) | No DATABASE_URL required in dev shell |

**Deprecated/outdated:**
- `confirmDeleteId` boolean flag pattern (from older AdminPage inline confirm): replaced by `deleteTargetId: string | null` per D-01 and established DecksPage pattern. Do not use the old AdminPage inline confirm approach for the new user delete.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Postgres UNIQUE allows multiple NULL values (existing users with email = NULL do not violate constraint) | Common Pitfalls #1, SQL migration | Migration would fail or require partial index workaround |
| A2 | `import nodemailer from 'nodemailer'` works in the existing backend TypeScript/tsx context without ESM workarounds | Common Pitfalls #3, Code Examples | Import fails at runtime; would need `import * as nodemailer` or `createRequire` workaround |
| A3 | nodemailer `secure: SMTP_SECURE === 'true'` (string-to-boolean env var conversion) is the correct pattern | Pattern 1 | SMTP connection uses wrong TLS mode if env var parsing logic differs |
| A4 | `transporter.verify()` in the test-send endpoint (not at singleton init) is the correct approach | Architecture Patterns, Anti-Patterns | If verify() is called at init, it would block server startup or log noise if SMTP is down |
| A5 | The `inviteCode.deleteMany({ where: { usedById: id } })` step is correct — `usedById` is a nullable FK with no `onDelete` action, so it must be explicitly set to null or deleted before user delete | Pattern 2 (cascade delete order) | FK violation on `prisma.user.delete` if InviteCode row still references the user |

**If this table is empty:** N/A — assumptions are logged.

---

## Open Questions

1. **Should `DELETE /api/admin/users/:id` set `inviteCode.usedById = null` or `deleteMany({ where: { usedById: id } })`?**
   - What we know: `InviteCode.usedById` is nullable and unique (`@unique`). The invite code tracks which user registered with it.
   - What's unclear: D-05 says `deleteMany InviteCode (usedById)` — but this deletes the invite code record entirely. Setting it to NULL would preserve the invite code audit trail.
   - Recommendation: Follow D-05 literally — `deleteMany`. The user deletion context already destroys audit trail; deleting the invite code is consistent. [Planner: no action needed — decision is locked per D-05]

2. **Do `DeckShare` rows where the deleted user is the *deck owner* (not sharedWithUserId) get cleaned up automatically?**
   - What we know: `DeckShare.deckId` has `onDelete: Cascade` on `Deck`. When `Deck.deleteMany({ ownerId: id })` runs, Postgres cascades to `DeckShare` rows. This is separate from `deckShare.deleteMany({ sharedWithUserId: id })` which handles the "user is the recipient" case.
   - What's unclear: Ordering — DeckShare (sharedWithUserId) must be deleted before Deck.deleteMany if both are in the same $transaction (Postgres cascade is synchronous within a transaction).
   - Recommendation: The D-05 delete order is correct. The explicit `deckShare.deleteMany({ sharedWithUserId: id })` handles recipient-side. The owner-side DeckShare rows are cleaned up automatically via the existing `onDelete: Cascade` on `Deck`. No additional step needed.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend runtime | ✓ | v20.20.2 | — |
| PostgreSQL (via Docker) | Migration deployment | ✓ (Docker Compose) | 16-alpine | — |
| nodemailer (to install) | EMAIL-02 mailer singleton | — (not yet installed) | 9.0.1 | — (must install) |
| SMTP server | EMAIL-02 test-send | Unknown (env var config) | — | Soft-fail: if no SMTP vars, mailer disabled; test button shows error |

**Missing dependencies with no fallback:**
- `nodemailer` must be installed via `yarn workspace @kartex/backend add nodemailer && yarn workspace @kartex/backend add -D @types/nodemailer`

**Missing dependencies with fallback:**
- SMTP server: soft-fail design means server starts normally without SMTP config; test-send returns descriptive error.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 (backend) |
| Config file | `apps/backend/vitest.config.ts` |
| Quick run command | `yarn workspace @kartex/backend test --run` |
| Full suite command | `yarn workspace @kartex/backend test --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADMIN-01 | DELETE /api/admin/users/:id returns 200 and user is gone | unit | `yarn workspace @kartex/backend test --run src/routes/__tests__/admin-delete.test.ts` | ❌ Wave 0 |
| ADMIN-04 | Self-delete returns 400; last-admin delete returns 400 | unit | same file | ❌ Wave 0 |
| EMAIL-02 | POST /api/admin/mailer/test returns 200 when SMTP configured; 400 when no email | unit | `yarn workspace @kartex/backend test --run src/routes/__tests__/admin-mailer.test.ts` | ❌ Wave 0 |
| EMAIL-01 | Migration runs without error; existing users have email = NULL | manual | `docker compose up db && prisma migrate deploy` | ❌ (migration file is Wave 0) |
| ADMIN-02 | Confirm button disabled until username typed correctly | e2e / manual | manual browser test | manual-only |
| ADMIN-03 | Dialog shows correct category list | manual | manual browser test | manual-only |
| ADMIN-05 | Email column shows in users table | manual | manual browser test | manual-only |

### Sampling Rate

- **Per task commit:** `yarn workspace @kartex/backend test --run`
- **Per wave merge:** `yarn workspace @kartex/backend test --run`
- **Phase gate:** Full backend test suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `apps/backend/src/routes/__tests__/admin-delete.test.ts` — covers ADMIN-01, ADMIN-04 (self-delete guard, last-admin guard, successful delete)
- [ ] `apps/backend/src/routes/__tests__/admin-mailer.test.ts` — covers EMAIL-02 (test-send success, no-email error, SMTP-not-configured error)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Admin routes already protected by `requireAdmin` middleware |
| V3 Session Management | no | DELETE endpoint invalidates target user's RefreshTokens as part of cascade — correct |
| V4 Access Control | yes | Self-delete guard + last-admin guard in DELETE handler; `requireAdmin` enforces ADMIN role |
| V5 Input Validation | yes | Username input validation: string comparison only, no SQL injection risk via Prisma ORM |
| V6 Cryptography | no | No new crypto in Phase 23; SMTP credentials via env vars (not hardcoded) |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR — admin deletes arbitrary user by guessing ID | Tampering | `requireAdmin` middleware + user existence check before delete |
| Self-delete via direct API call | Elevation of privilege | `id === authenticatedUserId` guard returns 400 |
| Last-admin lock-out | Denial of service | `adminCount <= 1 && target.role === 'ADMIN'` guard returns 400 |
| SMTP credential exposure | Information disclosure | Credentials via env vars only; never logged or returned in API responses |
| Partial delete (transaction fails mid-way) | Integrity | `prisma.$transaction` is atomic — all or nothing |

---

## Sources

### Primary (MEDIUM confidence)
- [prisma.io/docs/orm/prisma-client/queries/transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) — interactive transaction, sequential operations, ordered delete pattern
- Codebase: `apps/frontend/src/pages/DecksPage.tsx` — deleteTargetId + AlertDialog + DropdownMenu live pattern
- Codebase: `apps/backend/src/routes/admin.ts` — existing guard pattern (self-deactivation), Hono handler structure
- Codebase: `apps/backend/src/lib/seed.ts` — soft-fail startup initialization pattern

### Secondary (LOW confidence)
- [nodemailer.com](https://nodemailer.com) (WebSearch) — createTransport, verify(), sendMail API reference
- [github.com/nodemailer/nodemailer](https://github.com/nodemailer/nodemailer) — SMTP config fields, TLS options

---

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM — nodemailer API confirmed via WebSearch and npm registry; Prisma transaction confirmed via official docs
- Architecture: HIGH — every pattern derived from existing codebase (no speculation)
- Pitfalls: MEDIUM — most derived from established project decisions; A1-A5 are assumptions

**Research date:** 2026-06-21
**Valid until:** 2026-07-21 (stable libraries; 30-day window)
