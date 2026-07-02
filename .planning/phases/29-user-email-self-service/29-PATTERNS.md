# Phase 29: User Email Self-Service - Pattern Map

**Mapped:** 2026-07-02
**Files analyzed:** 6
**Analogs found:** 6 / 6 (all are extensions of existing files — no brand-new files needed)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `apps/backend/src/routes/auth.ts` (`GET /me`, `PATCH /me`) | route/controller | CRUD (request-response) | same file, `admin.ts` `PATCH /users/:id` for optional-field-merge idiom | exact (self) |
| `apps/backend/src/routes/admin.ts` (`PATCH /users/:id`) | route/controller | CRUD (request-response) | same file, `POST /invites` for Zod email validation idiom | exact (self) |
| `packages/shared/src/schemas/user.ts` (new `UpdateEmailSchema`, `UpdateMeSchema`) | model/schema | transform (validation) | `packages/shared/src/schemas/auth.ts` `PasswordResetRequestSchema` | exact |
| `apps/frontend/src/context/AuthContext.tsx` (`User` interface) | provider | request-response (state) | same file | exact (self) |
| `apps/frontend/src/pages/SettingsPage.tsx` (new Email Card + Alert banner) | component/page | request-response (form submit) | `apps/frontend/src/pages/ForgotPasswordPage.tsx` (RHF+Zod form), same file's existing Card sections (layout) | exact |
| `apps/frontend/src/pages/AdminPage.tsx` (Edit Email DropdownMenuItem + Dialog) | component/page | request-response (form submit) | same file's delete-user AlertDialog (single-shared-dialog-instance pattern) + `ForgotPasswordPage.tsx` (RHF+Zod form) | exact |

## Pattern Assignments

### `apps/backend/src/routes/auth.ts` — `GET /me` + `PATCH /me` (route, CRUD)

**Analog:** same file (extend in place) + `apps/backend/src/routes/admin.ts` lines 62-65 (optional-field-merge idiom)

**Current `GET /me`** (lines 234-248) — add `email: true` to select:
```typescript
auth.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, role: true, isActive: true, studyMode: true, createdAt: true, email: true }, // + email: true
  })
  if (!user) return c.json({ error: 'Unauthorized.' }, 401)
  return c.json(user, 200) // email is `null` (not undefined) for users without one
})
```

**Current `PATCH /me`** (lines 252-267) — replace `UpdateStudyModeSchema.safeParse` with combined `UpdateMeSchema`, keep the optional-field-merge idiom and the P2002 catch (mirrors `admin.ts` `PATCH /users/:id`):
```typescript
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

**Error handling pattern:** `Prisma.PrismaClientKnownRequestError` + `code === 'P2002'` → `c.json({ error: 'EMAIL_TAKEN' }, 409)`. Import `Prisma` from `@prisma/client` alongside the existing `prisma` client import (`apps/backend/src/lib/prisma.ts`).

**NO_EMAIL error-code precedent** (`admin.ts` lines 153+, ~166-168) — same opaque-code convention already used for a different check; `EMAIL_TAKEN` should follow the identical shape (bare `{ error: 'CODE' }` body, no message string from backend — frontend owns the localized copy).

---

### `apps/backend/src/routes/admin.ts` — `PATCH /users/:id` (route, CRUD)

**Analog:** same file, extend in place; validation idiom borrowed from `POST /invites` (line ~241, `z.object({ email: z.string().email() }).safeParse(body)`)

**Current handler** (lines 30-79) — body is hand-typed, NOT Zod-validated for `role`/`isActive`. Do NOT extend that hand-cast style to `email` — validate explicitly (Pitfall 4):
```typescript
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

**Mass-assignment discipline:** whitelist exact body keys (`body.role`, `body.isActive`, `body.email`) — never spread raw `...body` into the Prisma `data` object.

---

### `packages/shared/src/schemas/user.ts` (schema, transform/validation)

**Analog:** `packages/shared/src/schemas/auth.ts` `PasswordResetRequestSchema` (existing single-field email Zod schema) — same file's own `StudyModeSchema` for the combined-optional-fields idiom.

**Existing** (line 16): `email: z.string().email().nullable().optional()` on `UserSchema` — already present, no change needed.

**New additions:**
```typescript
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

**Pitfall (chain order):** `.trim().toLowerCase().email(...)` in that exact order — transform before validate, or a padded/mixed-case valid email fails format validation first.

**Keep, don't remove:** `UpdateStudyModeSchema` stays exported (still valid narrower shape); `grep -r "UpdateStudyModeSchema" apps/` before any removal — but plan should just add alongside, not replace.

---

### `apps/frontend/src/context/AuthContext.tsx` (provider)

**Analog:** same file, extend `User` interface (lines 8-15).

```typescript
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

---

### `apps/frontend/src/pages/SettingsPage.tsx` — Email Card + Alert banner (component, request-response form)

**Analog for the new RHF+Zod form:** `apps/frontend/src/pages/ForgotPasswordPage.tsx` (full pattern — imports, `useForm`+`zodResolver`, `Form`/`FormField`/`FormItem`/`FormLabel`/`FormControl`/`FormMessage`, submit handler)

**Imports pattern** (`ForgotPasswordPage.tsx` lines 1-28):
```typescript
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { PasswordResetRequestInput, PasswordResetRequestSchema } from '@kartex/shared'
// → swap for UpdateEmailInput, UpdateEmailSchema

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
```

**Form wiring pattern** (`ForgotPasswordPage.tsx` lines 38-43, 83-116):
```typescript
const form = useForm<UpdateEmailInput>({
  resolver: zodResolver(UpdateEmailSchema),
  defaultValues: { email: user?.email ?? '' },
})
const { isSubmitting } = form.formState

// ...
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
    <FormField
      control={form.control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('settings.email')}</FormLabel>
          <FormControl>
            <Input type="email" autoComplete="email" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
      {t('settings.save')}
    </Button>
  </form>
</Form>
```

**Card layout pattern** (`SettingsPage.tsx` lines 65-104 — existing Study Mode/Language Cards): follow the same `<Card className="mt-6">` / `<CardHeader><CardTitle>/<CardDescription></CardHeader><CardContent>` rhythm; new Email Card goes FIRST (above Study Mode) per D-01/D-02, Alert banner above that.

**Non-optimistic submit pattern (deviates from `handleModeChange`):** Do NOT copy the optimistic-update-then-revert style at `SettingsPage.tsx` lines 45-63 (`handleModeChange`) — email save must wait for server response before calling `setUser`, since a 409 conflict is expected/common (unlike studyMode changes):
```typescript
const onSubmit = async (values: UpdateEmailInput) => {
  try {
    const res = await api.patch('/api/auth/me', values)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const errorCode = (body as { error?: string }).error
      if (errorCode === 'EMAIL_TAKEN') {
        form.setError('email', { message: t('settings.emailTaken') })
      } else {
        toast.error(t('settings.saveFailed'))
      }
      return
    }
    const updated = await res.json()
    setUser({ ...user, email: updated.email })
    toast.success(t('settings.saved'))
  } catch {
    toast.error(t('settings.saveFailed'))
  }
}
```

**Alert banner pattern (new — first consumer of `alert.tsx`):**
```typescript
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
// ...
{user?.email == null && (
  <Alert className="mb-6 border-amber-500 text-amber-900 [&>svg]:text-amber-600">
    <AlertTitle>{t('settings.noEmailTitle')}</AlertTitle>
    <AlertDescription>{t('settings.noEmailDesc')}</AlertDescription>
  </Alert>
)}
```
Note: use custom amber classes, NOT the shadcn `destructive` variant — `destructive` is reserved project-wide for the fatal app-crash boundary in `App.tsx` (confirmed convention at `ImportPage.tsx` line 347 for a similar amber warning).

---

### `apps/frontend/src/pages/AdminPage.tsx` — Edit Email DropdownMenuItem + Dialog (component, request-response form)

**Analog for single-shared-dialog-instance state pattern:** same file's `deleteTargetId`/AlertDialog pattern (lines 450-530).

**DropdownMenuItem pattern** (lines 450-477) — add "Edit email" FIRST, above "Send password reset email":
```typescript
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button size="icon" variant="ghost" aria-label={t('admin.userActionsLabel', { username: u.username })}>
      <MoreVertical className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => setEditEmailTargetId(u.id)}>
      {t('admin.editEmail')}
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={() => void handleSendPasswordReset(u.id)}>
      {t('admin.sendPasswordReset')}
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem
      className="text-destructive focus:text-destructive"
      onClick={() => setDeleteTargetId(u.id)}
    >
      {t('admin.deleteUser')}
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Single-shared-Dialog pattern** (mirrors the `AlertDialog` at lines 486-530, but using `Dialog` — first real consumer of `dialog.tsx`), placed once OUTSIDE the row `.map()`, controlled by `editEmailTargetId` state:
```typescript
<Dialog
  open={editEmailTargetId !== null}
  onOpenChange={(open) => { if (!open) setEditEmailTargetId(null) }}
>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{t('admin.editEmailTitle')}</DialogTitle>
      <DialogDescription>{t('admin.editEmailDesc')}</DialogDescription>
    </DialogHeader>
    <Form {...editEmailForm}>
      <form onSubmit={editEmailForm.handleSubmit(onEditEmailSubmit)} className="space-y-4">
        <FormField
          control={editEmailForm.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('admin.email')}</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setEditEmailTargetId(null)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={editEmailForm.formState.isSubmitting}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  </DialogContent>
</Dialog>
```

**Submit handler pattern** — reuse `PATCH /api/admin/users/:id`, same `EMAIL_TAKEN` → `form.setError('email', ...)` mapping as Settings, success → `toast.success()` + `fetchUsers()` refresh (mirrors existing `handleSendPasswordReset` code-to-toast mapping at lines 328-340, except error case is inline per D-07):
```typescript
const errorCode = (body as { error?: string }).error
if (errorCode === 'EMAIL_TAKEN') {
  editEmailForm.setError('email', { message: t('admin.emailTaken') })
} else {
  toast.error(t('admin.saveFailed'))
}
```

## Shared Patterns

### RHF + Zod + shadcn Form (single source for all inline errors)
**Source:** `apps/frontend/src/pages/ForgotPasswordPage.tsx` (full file) + `apps/frontend/src/components/ui/form.tsx`
**Apply to:** `SettingsPage.tsx` Email Card form, `AdminPage.tsx` Edit Email Dialog form
`FormMessage` auto-wires `error.message` from RHF field state (including `form.setError(...)` calls) with `aria-describedby`/`aria-invalid` — this IS the D-07 inline-error mechanism, no bespoke `<p>` needed.

### Error-code-to-UI mapping convention
**Source:** `apps/frontend/src/pages/AdminPage.tsx` lines 328-340 (`handleSendPasswordReset`) — established opaque-code pattern
**Apply to:** both new submit handlers (Settings form, Admin Dialog form)
```typescript
const body = await res.json().catch(() => ({}))
const errorCode = (body as { error?: string }).error
if (errorCode === 'EMAIL_TAKEN') {
  form.setError('email', { message: t('settings.emailTaken') }) // inline, per D-07 (differs from toast-only precedent)
} else {
  toast.error(t('settings.saveFailed'))
}
```

### Prisma P2002 unique-constraint catch
**Source:** established convention documented in RESEARCH.md Pattern 1/2; not yet present verbatim elsewhere in `auth.ts`/`admin.ts` (new for this phase, but follows Prisma's documented, stable API)
**Apply to:** `auth.ts` `PATCH /me`, `admin.ts` `PATCH /users/:id`
```typescript
} catch (err) {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return c.json({ error: 'EMAIL_TAKEN' }, 409)
  }
  throw err
}
```

### Optional-field-merge idiom (backend)
**Source:** `apps/backend/src/routes/admin.ts` lines 62-65 (existing `role`/`isActive` conditional `data` object build)
**Apply to:** `auth.ts` `PATCH /me` (email + studyMode), `admin.ts` `PATCH /users/:id` (email + role + isActive)
```typescript
const data: { /* ...typed... */ } = {}
if (body.field !== undefined) data.field = body.field
```

### Zod email normalization chain
**Source:** new convention introduced by this phase, applied consistently across both write paths
**Apply to:** `UpdateEmailSchema`, `UpdateMeSchema` (shared package), inline admin route validation
```typescript
z.string().trim().toLowerCase().email('Valid email address required.')
```
Order matters: transform (`trim`, `toLowerCase`) before validate (`email`).

### Single-shared-dialog-instance state pattern
**Source:** `apps/frontend/src/pages/AdminPage.tsx` lines 486-530 (`deleteTargetId`-controlled `AlertDialog`, one instance outside the row `.map()`)
**Apply to:** new `editEmailTargetId`-controlled `Dialog` in the same file

## No Analog Found

None — every file touched by this phase is an extension of an existing file with a directly applicable in-repo analog. No brand-new files/directories are created.

## Metadata

**Analog search scope:** `apps/backend/src/routes/`, `apps/frontend/src/pages/`, `apps/frontend/src/context/`, `apps/frontend/src/components/ui/`, `packages/shared/src/schemas/`
**Files scanned:** `auth.ts`, `admin.ts`, `SettingsPage.tsx`, `AdminPage.tsx`, `ForgotPasswordPage.tsx`, `AuthContext.tsx`, `user.ts`, `dialog.tsx`, `alert.tsx`, `form.tsx`
**Pattern extraction date:** 2026-07-02
</content>
