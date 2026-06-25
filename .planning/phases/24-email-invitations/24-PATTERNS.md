# Phase 24: Email Invitations - Pattern Map

**Mapped:** 2026-06-25
**Files analyzed:** 10 new/modified files
**Analogs found:** 10 / 10

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/backend/src/routes/invites.ts` | route | request-response | `apps/backend/src/routes/auth.ts` (public endpoint pattern) | role-match |
| `apps/backend/src/routes/admin.ts` | route | CRUD | `apps/backend/src/routes/admin.ts` (self — modify) | exact |
| `apps/backend/src/routes/auth.ts` | route | request-response | `apps/backend/src/routes/auth.ts` (self — modify register) | exact |
| `apps/backend/src/index.ts` | config | request-response | `apps/backend/src/index.ts` (self — add public route mount) | exact |
| `apps/backend/prisma/schema.prisma` | model | — | `apps/backend/prisma/schema.prisma` (self — replace InviteCode with InviteToken) | exact |
| `apps/backend/prisma/migrations/20260625000000_replace_invite_code_with_invite_token/migration.sql` | migration | — | `apps/backend/prisma/migrations/20260621000000_add_user_email/migration.sql` | exact |
| `packages/shared/src/schemas/auth.ts` | schema | — | `packages/shared/src/schemas/auth.ts` (self — replace inviteCode with token) | exact |
| `apps/frontend/src/pages/InviteRegisterPage.tsx` | component | request-response | `apps/frontend/src/pages/RegisterPage.tsx` | exact |
| `apps/frontend/src/pages/AdminPage.tsx` | component | CRUD | `apps/frontend/src/pages/AdminPage.tsx` (self — InviteCodesSection → InviteTokensSection) | exact |
| `apps/frontend/src/App.tsx` | config | — | `apps/frontend/src/App.tsx` (self — swap routes) | exact |

---

## Pattern Assignments

### `apps/backend/src/routes/invites.ts` (route, request-response — NEW PUBLIC ROUTE)

**Analog:** `apps/backend/src/routes/auth.ts` (public Hono router without authMiddleware)

**Imports pattern** (modeled on `auth.ts` lines 1-10):
```typescript
import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'

const invites = new Hono()
```

**Core GET handler pattern** — inline error states per D-09/D-10:
```typescript
invites.get('/:token', async (c) => {
  const { token } = c.req.param()

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

  return c.json({ email: invite.email }, 200)
})

export { invites as invitesPublicRouter }
```

**Public mount point** — `apps/backend/src/index.ts` lines 51-57 pattern:
```typescript
// ─── 3c. Public invite validation route (no auth required) ────────────────
app.route('/api/invites', invitesPublicRouter)

// ─── 4. JWT auth middleware on all remaining /api/* routes ────────────────
app.use('/api/*', authMiddleware)
```
Insert at line 55 of `index.ts`, between `app.route('/api/media', mediaPublicRouter)` (line 54) and `app.use('/api/*', authMiddleware)` (line 57).

---

### `apps/backend/src/routes/admin.ts` (route, CRUD — MODIFIED)

**Analog:** `apps/backend/src/routes/admin.ts` (self)

**Remove entirely** (lines 130, 140-201):
- Line 130: `prisma.inviteCode.deleteMany({ where: { usedById: id } })` inside `$transaction` array in DELETE /users/:id
- Lines 138-201: `GET /invite-codes`, `POST /invite-codes`, `DELETE /invite-codes/:id` handlers

**Imports pattern** — add `randomBytes` and `sendMail`/`isConfigured` (already imported at line 4):
```typescript
import { randomBytes } from 'node:crypto'
import { unlink } from 'node:fs/promises'
import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'
import { sendMail, isConfigured } from '../lib/mailer.js'
```

**New GET /invites handler** — active-only filter (D-08):
```typescript
admin.get('/invites', async (c) => {
  const invites = await prisma.inviteToken.findMany({
    where: { usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, expiresAt: true, createdAt: true },
  })
  return c.json(invites, 200)
})
```

**New POST /invites handler** — token generation + sendMail pattern (modeled on `admin.ts` lines 207-238 mailer test + `admin.ts` lines 153-182 invite-code create):
```typescript
admin.post('/invites', async (c) => {
  let body: { email?: unknown } = {}
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid request body.' }, 400)
  }

  const parsed = z.object({ email: z.string().email() }).safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Valid email address required.' }, 400)
  }
  const { email } = parsed.data

  if (!isConfigured()) {
    return c.json({ error: 'SMTP not configured.' }, 400)
  }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const invite = await prisma.inviteToken.create({
    data: { email, token, expiresAt },
    select: { id: true, email: true, expiresAt: true, createdAt: true },
  })

  const appUrl = process.env.APP_URL ?? 'http://localhost:3000'
  try {
    await sendMail({
      to: email,
      subject: 'You\'ve been invited to Kartex',
      text: `You've been invited to Kartex. Complete your registration within 7 days:\n${appUrl}/invite/${token}`,
      html: `<p>You've been invited to Kartex.</p><p><a href="${appUrl}/invite/${token}">Complete your registration</a></p><p>This link expires in 7 days.</p>`,
    })
  } catch (err) {
    // Roll back the created token if email fails
    await prisma.inviteToken.delete({ where: { id: invite.id } })
    return c.json({ error: (err as Error).message }, 500)
  }

  return c.json(invite, 200)
})
```

**New DELETE /invites/:id handler** — active-only guard (modeled on `admin.ts` lines 186-201):
```typescript
admin.delete('/invites/:id', async (c) => {
  const { id } = c.req.param()

  const invite = await prisma.inviteToken.findUnique({ where: { id } })
  if (!invite) {
    return c.json({ error: 'Invite not found.' }, 404)
  }
  if (invite.usedAt !== null) {
    return c.json({ error: 'Cannot revoke a used invite.' }, 400)
  }

  await prisma.inviteToken.delete({ where: { id } })
  return c.json({ message: 'Invite revoked.' }, 200)
})
```

---

### `apps/backend/src/routes/auth.ts` (route, request-response — MODIFIED)

**Analog:** `apps/backend/src/routes/auth.ts` (self)

**Change `POST /register`** (lines 49-82): replace `inviteCode` lookup pattern with `token` + TOCTOU-safe `$transaction`. Keep bcrypt hash pattern (line 70), `user.create` pattern (lines 71-73), and response (line 81) unchanged.

**Replace lines 55-80 with:**
```typescript
const { username, password, token } = body.data

// Pre-check for informational error messages (not TOCTOU-safe)
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
    await tx.user.create({
      data: { username, passwordHash, role: 'USER', email: invite.email },
    })
  })
} catch (err) {
  const msg = (err as Error).message
  if (msg === 'TOKEN_CONSUMED') return c.json({ error: 'ALREADY_USED' }, 400)
  if (msg === 'USERNAME_TAKEN') return c.json({ error: 'USERNAME_TAKEN' }, 409)
  throw err
}

return c.json({ message: 'Account created.' }, 200)
```

---

### `apps/backend/prisma/schema.prisma` (model — MODIFIED)

**Analog:** `apps/backend/prisma/schema.prisma` (self)

**Remove from `User` model** (line 46):
```prisma
inviteCodeUsed InviteCode?
```

**Remove entire `InviteCode` model** (lines 53-60):
```prisma
model InviteCode {
  id        String    @id @default(cuid())
  code      String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  usedById  String?   @unique
  usedBy    User?     @relation(fields: [usedById], references: [id])
  createdAt DateTime  @default(now())
}
```

**Add new model** (after `RefreshToken` model):
```prisma
model InviteToken {
  id        String    @id @default(cuid())
  email     String
  token     String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
}
```
No FK to `User` — email-only link, no cascade concern.

---

### `apps/backend/prisma/migrations/20260625000000_replace_invite_code_with_invite_token/migration.sql` (migration — NEW)

**Analog:** `apps/backend/prisma/migrations/20260621000000_add_user_email/migration.sql`

**Format pattern** (bare SQL, comment header, no migration metadata):
```sql
-- Replace InviteCode with InviteToken — implements EMAIL-03 through EMAIL-08
-- DROP InviteCode table (FK constraint must be removed first in Postgres).
-- CREATE InviteToken table.
-- Applied via `prisma migrate deploy` in Docker Compose entrypoint (entrypoint.sh).

-- Drop FK constraint before table drop
ALTER TABLE "InviteCode" DROP CONSTRAINT IF EXISTS "InviteCode_usedById_fkey";
DROP TABLE IF EXISTS "InviteCode";

-- Create InviteToken table
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
```

---

### `packages/shared/src/schemas/auth.ts` (schema — MODIFIED)

**Analog:** `packages/shared/src/schemas/auth.ts` (self, lines 10-23)

**Replace `RegisterSchema`** — swap `inviteCode` field for `token`:
```typescript
export const RegisterSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters.')
    .max(20, 'Username must be at most 20 characters.')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Username can only contain letters, numbers, and underscores.',
    ),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  token: z.string().min(1, 'Invite token is required.'),
})

export type RegisterInput = z.infer<typeof RegisterSchema>
```
`confirmPassword` is NOT included — frontend-only concern (see RESEARCH.md Pitfall 5).

---

### `apps/frontend/src/pages/InviteRegisterPage.tsx` (component — NEW)

**Analog:** `apps/frontend/src/pages/RegisterPage.tsx` (lines 1-167)

**Imports pattern** (modeled on `RegisterPage.tsx` lines 1-30, minus `useAuth`):
```typescript
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { RegisterInput, RegisterSchema } from '@kartex/shared'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
```

**Token validation on mount** (modeled on `DeckDetailPage.tsx` useEffect fetch pattern):
```typescript
export function InviteRegisterPage() {
  const { t, i18n } = useTranslation()
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [email, setEmail] = useState('')

  const form = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { token: token ?? '', username: '', password: '' },
  })
  const { isSubmitting } = form.formState

  useEffect(() => {
    document.title = t('auth.completeRegistration') + ' — Kartex'
  }, [t, i18n.language])

  useEffect(() => {
    if (!token) { setErrorCode('NOT_FOUND'); setStatus('error'); return }
    api.get(`/api/invites/${token}`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json() as { email: string }
          setEmail(data.email)
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

**Error state rendering** — D-09/D-10, inline (no redirect):
```typescript
if (status === 'error') {
  const message =
    errorCode === 'ALREADY_USED' ? t('auth.inviteAlreadyUsed') :
    errorCode === 'EXPIRED'      ? t('auth.inviteExpired') :
                                   t('auth.inviteInvalid')
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-[400px] max-w-[calc(100vw-32px)]">
        <CardHeader>
          <CardTitle>{t('auth.inviteErrorTitle')}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
```

**Disabled email field pattern** (D-05 — read-only, cannot be edited):
```typescript
// email is display-only — NOT a form field in RegisterSchema
// Render as a disabled Input outside the form schema:
<FormItem>
  <FormLabel>{t('auth.emailLabel')}</FormLabel>
  <FormControl>
    <Input type="email" disabled value={email} readOnly />
  </FormControl>
</FormItem>
```

**Submit handler** — modeled on `RegisterPage.tsx` lines 55-71, mapping new error codes:
```typescript
const onSubmit = async (values: RegisterInput) => {
  try {
    const res = await api.post('/api/auth/register', values)
    if (res.ok) {
      navigate('/login', { state: { registered: true } })
    } else if (res.status === 409) {
      form.setError('username', { message: t('auth.usernameTaken') })
    } else {
      const body = await res.json().catch(() => ({}))
      const err = (body as { error?: string }).error
      if (err === 'ALREADY_USED') {
        toast.error(t('auth.inviteAlreadyUsed'))
      } else {
        toast.error(t('common.somethingWrong'))
      }
    }
  } catch {
    toast.error(t('common.somethingWrong'))
  }
}
```

**Loading skeleton** — consistent with `status === 'loading'` guard:
```typescript
if (status === 'loading') {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label={t('common.loading')} />
    </div>
  )
}
```

---

### `apps/frontend/src/pages/AdminPage.tsx` (component — MODIFIED)

**Analog:** `apps/frontend/src/pages/AdminPage.tsx` (self)

**Remove** (lines 43-68, 119-288):
- `InviteCode` interface
- `InviteCodeStatus` type alias
- `getInviteCodeStatus()` function
- `InviteCodesSection` component (lines 119-288)

**Add `InviteToken` interface** (replaces `InviteCode`):
```typescript
interface InviteToken {
  id: string
  email: string
  expiresAt: string
  createdAt: string
}
```

**New `InviteTokensSection` component** — modeled on `InviteCodesSection` pattern (lines 119-288) with email input instead of expiry-days input, and simplified single-action revoke button:

State + fetch pattern (copy from `InviteCodesSection` lines 120-141):
```typescript
function InviteTokensSection() {
  const { t } = useTranslation()
  const [tokens, setTokens] = useState<InviteToken[]>([])
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null)

  const fetchTokens = async () => {
    try {
      const res = await api.get('/api/admin/invites')
      if (res.ok) {
        const data = await res.json()
        setTokens(data)
      }
    } catch {
      // silently ignore fetch errors on load
    }
  }

  useEffect(() => {
    void fetchTokens()
  }, [])
```

Send invite handler (modeled on `InviteCodesSection` handleGenerate + `MailerSection` handleTestEmail patterns):
```typescript
  const handleSendInvite = async () => {
    if (!email.trim()) return
    setSending(true)
    try {
      const res = await api.post('/api/admin/invites', { email })
      if (res.ok) {
        toast.success(t('admin.inviteSent'))
        setEmail('')
        await fetchTokens()
      } else {
        const body = await res.json().catch(() => ({}))
        const errCode = (body as { error?: string }).error
        if (errCode === 'SMTP not configured.') {
          toast.error(t('admin.smtpNotConfigured'))
        } else {
          toast.error(t('common.somethingWrong'))
        }
      }
    } catch {
      toast.error(t('common.somethingWrong'))
    } finally {
      setSending(false)
    }
  }
```

Revoke handler (modeled on `InviteCodesSection` handleDelete lines 160-173):
```typescript
  const handleRevoke = async (id: string) => {
    try {
      const res = await api.delete(`/api/admin/invites/${id}`)
      if (res.ok) {
        toast.success(t('admin.inviteRevoked'))
        setTokens((prev) => prev.filter((t) => t.id !== id))
        setRevokeTargetId(null)
      } else {
        toast.error(t('common.somethingWrong'))
      }
    } catch {
      toast.error(t('common.somethingWrong'))
    }
  }
```

Table structure (modeled on `InviteCodesSection` Table lines 216-284 — D-07 columns: Email, Sent, Expires, Revoke):
```typescript
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.inviteTokensTitle')}</CardTitle>
        <CardDescription>{t('admin.inviteTokensDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label htmlFor="invite-email" className="text-sm font-medium leading-none">
              {t('auth.emailLabel')}
            </label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <Button onClick={() => void handleSendInvite()} disabled={sending || !email.trim()}>
            {sending ? t('common.loading') : t('admin.sendInvite')}
          </Button>
        </div>
        <Table aria-label={t('admin.inviteTokensTitle')}>
          <TableHeader>
            <TableRow>
              <TableHead>{t('table.emailColumn')}</TableHead>
              <TableHead>{t('table.sentColumn')}</TableHead>
              <TableHead>{t('table.expiresColumn')}</TableHead>
              <TableHead>{t('table.actionsColumn')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {t('admin.noPendingInvites')}
                </TableCell>
              </TableRow>
            )}
            {tokens.map((token) => (
              <TableRow key={token.id}>
                <TableCell>{token.email}</TableCell>
                <TableCell>{formatDate(token.createdAt)}</TableCell>
                <TableCell>{formatDate(token.expiresAt)}</TableCell>
                <TableCell>
                  {revokeTargetId !== token.id ? (
                    <Button variant="destructive" size="sm" onClick={() => setRevokeTargetId(token.id)}>
                      {t('common.revoke')}
                    </Button>
                  ) : (
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm">{t('common.confirm')}</span>
                      <Button size="sm" variant="destructive" onClick={() => void handleRevoke(token.id)}>
                        {t('common.yesRevoke')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRevokeTargetId(null)}>
                        {t('common.cancel')}
                      </Button>
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
```

**Replace `<InviteCodesSection />` with `<InviteTokensSection />`** in the `AdminPage` render.

---

### `apps/frontend/src/App.tsx` (config — MODIFIED)

**Analog:** `apps/frontend/src/App.tsx` (self, lines 52-80)

**Remove import** (line 14): `import { RegisterPage } from '@/pages/RegisterPage'`

**Add import**: `import { InviteRegisterPage } from '@/pages/InviteRegisterPage'`

**Replace route** (line 58):
```typescript
// REMOVE:
<Route path="/register" element={<RegisterPage />} />

// ADD (alongside /login, outside ProtectedRoute):
<Route path="/invite/:token" element={<InviteRegisterPage />} />
```

**Final public routes block** (lines 57-59 after change):
```typescript
<Route path="/login" element={<LoginPage />} />
<Route path="/invite/:token" element={<InviteRegisterPage />} />

<Route element={<ProtectedRoute />}>
```

---

## Shared Patterns

### Hono Route Handler Structure
**Source:** `apps/backend/src/routes/admin.ts` lines 10-24, 208-238
**Apply to:** All new/modified Hono route handlers
```typescript
admin.get('/resource', async (c) => {
  const data = await prisma.model.findMany({ ... })
  return c.json(data, 200)
})
```

### sendMail + isConfigured Guard
**Source:** `apps/backend/src/routes/admin.ts` lines 219-237
**Apply to:** `POST /api/admin/invites` handler
```typescript
if (!isConfigured()) {
  return c.json({ error: 'SMTP not configured.' }, 400)
}
try {
  await sendMail({ to, subject, text, html })
} catch (err) {
  return c.json({ error: (err as Error).message }, 500)
}
```

### prisma.$transaction (interactive, throw-to-abort)
**Source:** RESEARCH.md Pattern 2 / `apps/backend/src/routes/admin.ts` lines 124-133 (sequential array variant)
**Apply to:** `POST /api/auth/register` token consumption
```typescript
await prisma.$transaction(async (tx) => {
  // throw inside callback aborts the transaction
  // return exits normally (commit)
})
```

### Toast Feedback Pattern
**Source:** `apps/frontend/src/pages/AdminPage.tsx` lines 83-99
**Apply to:** All new frontend action handlers
```typescript
toast.success(t('admin.someSuccessKey'))
toast.error(t('common.somethingWrong'))
```

### react-hook-form + zodResolver Form
**Source:** `apps/frontend/src/pages/RegisterPage.tsx` lines 48-71
**Apply to:** `InviteRegisterPage.tsx` form
```typescript
const form = useForm<RegisterInput>({
  resolver: zodResolver(RegisterSchema),
  defaultValues: { token: token ?? '', username: '', password: '' },
})
const { isSubmitting } = form.formState
```

### Inline Error State (no redirect)
**Source:** D-09/D-10 decisions; modeled on `DeckDetailPage` null-deck render pattern
**Apply to:** `InviteRegisterPage` error branch
```typescript
if (status === 'error') {
  // render error Card inline — no navigate() call
}
```

### SQL Migration Format
**Source:** `apps/backend/prisma/migrations/20260621000000_add_user_email/migration.sql`
**Apply to:** New migration file
- Comment header explaining purpose + applied-via note
- Bare SQL statements only (no Prisma migration metadata)
- Idempotent guards (`IF EXISTS`, `IF NOT EXISTS`) where safe

---

## i18n Keys Required

Both `apps/frontend/src/locales/en.json` and `apps/frontend/src/locales/de.json` must receive parity additions:

| Key | English value |
|-----|--------------|
| `auth.completeRegistration` | "Complete Registration" |
| `auth.inviteErrorTitle` | "Invitation Error" |
| `auth.inviteAlreadyUsed` | "This invite has already been used." |
| `auth.inviteExpired` | "This invite link has expired. Contact an admin for a new invitation." |
| `auth.inviteInvalid` | "This invite link is not valid." |
| `admin.inviteTokensTitle` | "Email Invitations" |
| `admin.inviteTokensDesc` | "Send invite links to new users." |
| `admin.sendInvite` | "Send Invite" |
| `admin.inviteSent` | "Invitation sent." |
| `admin.inviteRevoked` | "Invitation revoked." |
| `admin.noPendingInvites` | "No pending invitations." |
| `admin.smtpNotConfigured` | "SMTP is not configured." |
| `table.emailColumn` | "Email" |
| `table.sentColumn` | "Sent" |
| `common.revoke` | "Revoke" |
| `common.yesRevoke` | "Yes, Revoke" |

---

## No Analog Found

All files have close analogs in the codebase. No entries.

---

## Files to DELETE

| File | Reason |
|------|--------|
| `apps/frontend/src/pages/RegisterPage.tsx` | D-04: Replaced by InviteRegisterPage; no public registration path |

---

## Metadata

**Analog search scope:** `apps/backend/src/routes/`, `apps/backend/prisma/`, `apps/frontend/src/pages/`, `packages/shared/src/schemas/`, `apps/frontend/src/`
**Files scanned:** 8 source files read directly
**Pattern extraction date:** 2026-06-25
