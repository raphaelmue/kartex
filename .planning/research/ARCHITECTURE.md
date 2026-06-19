# Architecture: v1.4.0 Integration Map

**Project:** Kartex
**Milestone:** v1.4.0 — Auth Overhaul & Study UX
**Researched:** 2026-06-19
**Confidence:** HIGH — based on direct reading of all relevant source files

---

## Existing Architecture Baseline

```
apps/backend/src/
  index.ts               route mounting + middleware ordering
  routes/
    auth.ts              /api/auth/* (register, login, logout, refresh, me, patch/me)
    admin.ts             /api/admin/* (users CRUD, invite-codes CRUD)
    decks.ts             /api/decks/*
    cards.ts             /api/decks/:id/cards/*
    deckUpdate.ts        /api/decks/:id/update/* (preview + apply, .kartex only today)
    import.ts            /api/import (.kartex + .kartex.zip)
    media.ts             /api/media (split: public GET, protected POST)
    study.ts             /api/study/*
    dashboard.ts         /api/dashboard
    stats.ts             /api/stats
    explore.ts           /api/explore
  lib/
    prisma.ts            singleton Prisma client
    jwt.ts               signToken helper
    seed.ts              admin seed on startup
    sm2.ts               SM-2 algorithm

apps/frontend/src/
  pages/
    AdminPage.tsx        InviteCodesSection + UsersSection
    StudySessionPage.tsx SessionRunner + GlobalSRStartScreen + mode selector
    DeckDetailPage.tsx   deck editor + DeckUpdateModal (owner only, .kartex only)
    LoginPage.tsx        login form
    ...
  components/
    KartexRenderer.tsx   preprocessTypstBlocks + kartexComponents (typst, img, audio, link)
    CardEditorModal.tsx  card edit dialog (already exists, reusable in study)
  lib/
    api.ts               fetch wrapper with silent refresh
    typst.ts             Typst WASM singleton

packages/shared/src/schemas/
  auth.ts                LoginSchema, RegisterSchema (has inviteCode field)
  user.ts                UserSchema, UserResponseSchema (no email field currently)
  study.ts               DueCardSchema (no canEdit field currently)
  card.ts, deck.ts, ...
```

**Current User model fields:** `id, username, passwordHash, role, isActive, studyMode, createdAt`
**No email field exists yet** — this is the first dependency for all email flows.

---

## Feature 1: User.email Field

### What Changes

The `User` model gains `email String? @unique` — nullable to allow existing users migrated without email. New registration via invite token requires email at registration time; the existing admin-seeded user remains valid with `email = null`.

### New Migration

```sql
-- apps/backend/prisma/migrations/20260620000000_add_user_email/migration.sql
ALTER TABLE "User" ADD COLUMN "email" TEXT UNIQUE;
```

Nullable (`TEXT`, no `NOT NULL`) — zero-downtime, backward-safe for existing users.

### Modified Files

| File | Change |
|------|--------|
| `apps/backend/prisma/schema.prisma` | `User` model: add `email String? @unique` |
| `apps/backend/prisma/migrations/20260620000000_add_user_email/migration.sql` | New hand-written migration |
| `packages/shared/src/schemas/user.ts` | `UserSchema`: add `email: z.string().email().nullable().optional()`. `UserResponseSchema` must include `email`. |
| `apps/backend/src/routes/auth.ts` | `GET /me`, `POST /login`, `POST /refresh` select clauses: add `email: true` |
| `apps/backend/src/routes/admin.ts` | `GET /users` select: add `email: true` |

### Integration Point

**Every subsequent feature** that touches email (invite tokens, password reset) depends on this column existing. This is Phase 1 — no email feature can be built until this migration lands.

---

## Feature 2: Email Invitations

### Architecture Decision

Keep `InviteCode` model and existing `/api/admin/invite-codes` routes **untouched** alongside the new email invite system. The old invite-code registration path (`POST /api/auth/register` with `inviteCode`) stays functional as a fallback. The new email path adds a parallel registration endpoint. This avoids breaking the existing admin UI while the email invite UI is built.

### New Model: InviteToken

```prisma
model InviteToken {
  id          String    @id @default(cuid())
  email       String
  tokenHash   String    @unique
  expiresAt   DateTime
  usedAt      DateTime?
  usedById    String?   @unique
  usedBy      User?     @relation(fields: [usedById], references: [id])
  createdAt   DateTime  @default(now())
  createdById String
  createdBy   User      @relation("CreatedInvites", fields: [createdById], references: [id])
}
```

**Hash algorithm:** SHA-256 via `crypto.createHash('sha256')` (not bcrypt). Token is a random UUID-pair string — SHA-256 is safe and allows exact-match DB lookup (`WHERE tokenHash = $hash`). Bcrypt's intentional slowness is for password guessing protection; it is the wrong tool for random-token lookup.

### New Migration

```sql
-- apps/backend/prisma/migrations/20260620000001_add_invite_token/migration.sql
CREATE TABLE "InviteToken" (
  "id"          TEXT NOT NULL,
  "email"       TEXT NOT NULL,
  "tokenHash"   TEXT NOT NULL UNIQUE,
  "expiresAt"   TIMESTAMPTZ NOT NULL,
  "usedAt"      TIMESTAMPTZ,
  "usedById"    TEXT UNIQUE,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdById" TEXT NOT NULL,
  CONSTRAINT "InviteToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InviteToken_usedById_fkey"
    FOREIGN KEY ("usedById") REFERENCES "User"("id"),
  CONSTRAINT "InviteToken_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")
);
```

### New Backend Service: Mailer

```
apps/backend/src/lib/mailer.ts   NEW singleton SMTP mailer
```

Install `nodemailer` + `@types/nodemailer` in `apps/backend`. Reads `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `APP_URL` from environment. Exports `sendInviteEmail(to, rawToken)` and `sendPasswordResetEmail(to, rawToken)`. Both functions are also used by Feature 3.

**New env vars** (add to `.env` template and Docker Compose docs):
```
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=kartex@example.com
APP_URL=https://your-domain.com
```

### New Routes

| Method | Path | File | Auth | Description |
|--------|------|------|------|-------------|
| `POST` | `/api/admin/invite-tokens` | `admin.ts` | Admin | Create InviteToken + send email |
| `GET` | `/api/admin/invite-tokens` | `admin.ts` | Admin | List tokens (email, status, createdAt) |
| `DELETE` | `/api/admin/invite-tokens/:id` | `admin.ts` | Admin | Revoke unused token |
| `GET` | `/api/auth/invite-token?token=` | `auth.ts` | None | Validate token; returns `{ email }` for pre-fill |
| `POST` | `/api/auth/register-by-token` | `auth.ts` | None | Register with token: validate, create user with email, mark token used |

### Modified Files (Backend)

| File | Change |
|------|--------|
| `apps/backend/src/routes/admin.ts` | Add POST/GET/DELETE /invite-tokens handlers |
| `apps/backend/src/routes/auth.ts` | Add GET /invite-token + POST /register-by-token |
| `packages/shared/src/schemas/auth.ts` | Add `RegisterByTokenSchema` (`{ username, password, token }`) |

No changes to `index.ts` — admin routes already mount under `requireAdmin`; auth routes mount before the global JWT middleware.

### New Frontend Files

| File | Route | Auth | Purpose |
|------|-------|------|---------|
| `apps/frontend/src/pages/RegisterPage.tsx` | `/register?token=` | None | Validate token on mount, pre-fill email (read-only), choose username + password, call POST /register-by-token |

### Modified Frontend Files

| File | Change |
|------|--------|
| `apps/frontend/src/pages/AdminPage.tsx` | Add `EmailInviteSection` sub-component (email input, expiry days, send button, token list table) alongside existing `InviteCodesSection` |
| Router (`App.tsx` or `main.tsx`) | Add `/register` as a public route (no auth guard, same as `/login`) |

### Dependency

Requires Feature 1 (User.email) — `register-by-token` sets `email` on the new user, and `InviteToken.email` is the target address.

---

## Feature 3: Password Reset Tokens

### New Model: PasswordResetToken

```prisma
model PasswordResetToken {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
}
```

No `@@unique([userId])` — a user can request multiple resets; all expire in 1 hour. The `usedAt` guard prevents reuse after the first click.

### New Migration

```sql
-- apps/backend/prisma/migrations/20260620000002_add_password_reset_token/migration.sql
CREATE TABLE "PasswordResetToken" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "usedAt"    TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PasswordResetToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
```

### New Routes

| Method | Path | File | Auth | Description |
|--------|------|------|------|-------------|
| `POST` | `/api/auth/forgot-password` | `auth.ts` | None | Accept `{ email }`, lookup user by email, create PasswordResetToken, send email. Always return 200. |
| `POST` | `/api/auth/reset-password` | `auth.ts` | None | Accept `{ token, newPassword }`, validate token, hash new password, update user, mark token used, delete all refresh tokens for user |
| `POST` | `/api/admin/users/:id/reset-password` | `admin.ts` | Admin | Create PasswordResetToken for target user, send reset email. Return 409 if user has no email. |

### Modified Files (Backend)

| File | Change |
|------|--------|
| `apps/backend/src/routes/auth.ts` | Add POST /forgot-password, POST /reset-password |
| `apps/backend/src/routes/admin.ts` | Add POST /users/:id/reset-password |
| `packages/shared/src/schemas/auth.ts` | Add `ForgotPasswordSchema` (`{ email }`), `ResetPasswordSchema` (`{ token, newPassword }`) |
| `apps/backend/src/lib/mailer.ts` | `sendPasswordResetEmail` (shared with Feature 2 mailer) |

### New Frontend Files

| File | Route | Auth | Purpose |
|------|-------|------|---------|
| `apps/frontend/src/pages/ForgotPasswordPage.tsx` | `/forgot-password` | None | Email input form → POST /forgot-password. Shows "check your email" message on success. |
| `apps/frontend/src/pages/ResetPasswordPage.tsx` | `/reset-password?token=` | None | New-password form → POST /reset-password. Redirects to /login on success. |

### Modified Frontend Files

| File | Change |
|------|--------|
| `apps/frontend/src/pages/LoginPage.tsx` | Add "Forgot password?" link below the login form |
| `apps/frontend/src/pages/AdminPage.tsx` UsersSection | Add "Send Password Reset" button per user row; disabled when user has no email |
| Router | Add `/forgot-password` and `/reset-password` as public routes |

### Security Notes

- `POST /forgot-password` must always return 200 with the same body regardless of whether the email exists — prevents email enumeration.
- `rateLimitMiddleware(10, 60_000)` is already applied to all auth routes via `auth.use('*', ...)` — covers forgot-password automatically.
- `POST /reset-password` must call `prisma.refreshToken.deleteMany({ where: { userId } })` after the password update — forces re-login on all sessions.
- Raw token: `crypto.randomUUID() + crypto.randomUUID()` (64 hex chars); SHA-256-hashed before storage.
- Token expiry: 1 hour (`expiresAt = new Date(Date.now() + 60 * 60 * 1000)`).

### Dependency

Requires Feature 1 (User.email) — `POST /forgot-password` looks up `prisma.user.findUnique({ where: { email } })`.
Requires Feature 2 (`lib/mailer.ts`) — password reset email uses the same SMTP singleton.

---

## Feature 4: Admin User Deletion

### New Route

| Method | Path | File | Auth | Description |
|--------|------|------|------|-------------|
| `DELETE` | `/api/admin/users/:id` | `admin.ts` | Admin | Delete user with guards; Postgres cascade handles related rows |

### Cascade Analysis (Current Schema)

| Related model | Current onDelete | Action needed |
|---------------|-----------------|---------------|
| `RefreshToken.userId` | No cascade | Add `onDelete: Cascade` |
| `Deck.ownerId` | No cascade | Add `onDelete: Cascade` (Deck already cascades to Card, DeckShare, CardProgress) |
| `DeckShare.sharedWithUserId` | No cascade | Add `onDelete: Cascade` |
| `CardProgress.userId` | No cascade | Add `onDelete: Cascade` |
| `ReviewLog.userId` | Has `onDelete: Cascade` | Already correct |
| `InviteCode.usedById` | Nullable FK | NULL-out via FK constraint; no cascade needed |
| `InviteToken.usedById` (new) | Nullable FK | NULL-out via FK constraint; no cascade needed |
| `PasswordResetToken.userId` (new) | Will have Cascade | Covered in Feature 3 migration |

### New Migration

```sql
-- apps/backend/prisma/migrations/20260620000003_add_user_cascade_deletes/migration.sql

ALTER TABLE "RefreshToken"
  DROP CONSTRAINT "RefreshToken_userId_fkey",
  ADD CONSTRAINT "RefreshToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

ALTER TABLE "Deck"
  DROP CONSTRAINT "Deck_ownerId_fkey",
  ADD CONSTRAINT "Deck_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE;

ALTER TABLE "DeckShare"
  DROP CONSTRAINT "DeckShare_sharedWithUserId_fkey",
  ADD CONSTRAINT "DeckShare_sharedWithUserId_fkey"
    FOREIGN KEY ("sharedWithUserId") REFERENCES "User"("id") ON DELETE CASCADE;

ALTER TABLE "CardProgress"
  DROP CONSTRAINT "CardProgress_userId_fkey",
  ADD CONSTRAINT "CardProgress_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
```

Check exact constraint names against `\d "RefreshToken"` etc. in the live DB before writing the final migration — generated constraint names may differ from the assumed pattern.

### Handler Guards

- Cannot delete own account (`id === authenticatedUserId`)
- Cannot delete the last admin: `prisma.user.count({ where: { role: 'ADMIN', id: { not: id } } }) === 0` → reject with 409

### Modified Files

| File | Change |
|------|--------|
| `apps/backend/prisma/schema.prisma` | Add `onDelete: Cascade` to RefreshToken.user, Deck.owner, DeckShare.sharedWithUser, CardProgress.user relations |
| `apps/backend/prisma/migrations/20260620000003_add_user_cascade_deletes/migration.sql` | Hand-written migration |
| `apps/backend/src/routes/admin.ts` | Add `DELETE /users/:id` with guards |
| `apps/frontend/src/pages/AdminPage.tsx` | Add Delete button + confirmation dialog in UsersSection rows (same inline confirm pattern as existing deactivate button) |

### Dependency

No hard dependency on Features 1–3. Can be built independently. The cascade migration is easiest to land in the same deployment as other schema migrations.

---

## Feature 5: ABC Notation Rendering

### Architecture: mirrors the #typst pattern exactly

`#abc` fenced blocks are preprocessed into ` ```abc ``` ` code blocks by a new `preprocessAbcBlocks` function, then the `code` component handler in `kartexComponents` intercepts `language-abc` and renders via a new `AbcBlock` component.

### New Dependency

```bash
yarn workspace @kartex/frontend add abcjs
```

`abcjs` renders SVG inline into a DOM element: `ABCJS.renderAbc(element, source, options)`. Use a `useRef + useEffect` pattern — synchronous render, no loading state needed (unlike Typst WASM).

### Modified Files

| File | Change |
|------|--------|
| `apps/frontend/src/components/KartexRenderer.tsx` | Add `preprocessAbcBlocks` function (mirrors `preprocessTypstBlocks`). Add `AbcBlock` component (useRef + useEffect + ABCJS.renderAbc). Add `language-abc` branch inside the `code` handler in `kartexComponents`. |
| `apps/frontend/package.json` | Add `abcjs` dependency |

### Preprocessing Pattern

Block delimited by `#abc` start and a blank line or end-of-content — identical rule to `#typst`:

```
Input:               Output:
  #abc                 ```abc
  X:1                  X:1
  T:Title        →     T:Title
  K:C                  K:C
  CDEF|                CDEF|
                       ```
```

### AbcBlock Component Sketch

```tsx
function AbcBlock({ source }: { source: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) {
      ABCJS.renderAbc(ref.current, source)
    }
  }, [source])
  return <div ref={ref} />
}
```

### Preprocessing Pipeline

Both preprocessors run sequentially before passing content to ReactMarkdown:

```tsx
{preprocessAbcBlocks(preprocessTypstBlocks(content))}
```

Order between the two does not matter (distinct block markers), but both must run before ReactMarkdown.

### No Backend Changes

ABC notation is pure frontend rendering. No new routes, no schema changes, no shared schemas.

---

## Feature 6: Deck Update via .kartex.zip

### Current State

`deckUpdate.ts` lines 134–135 (preview) and 195–196 (apply) explicitly reject `.kartex.zip`:
```ts
if (normalizedName.endsWith('.kartex.zip')) {
  return c.json({ error: 'File must be a .kartex file (not .kartex.zip).' }, 400)
}
```

Both guards must be replaced.

### Shared Utility Extraction

`import.ts` already contains all the zip extraction, media validation, and media storage logic. Rather than duplicating it, extract shared code into a new utility module:

```
apps/backend/src/lib/importMedia.ts   NEW
```

Extracts from `import.ts`:
- `ALLOWED_MIMES` set
- `rewriteMediaRefs(text, storedFilenames)` function
- `validateAndStoreMedia(directory, userId, storagePath, maxBytes)` — returns `{ storedFilenames: Map<string, string>, mediaWarnings: Warning[] }` or throws validation errors

Both `import.ts` and `deckUpdate.ts` import from this utility.

### Preview Endpoint with Zip

`POST /api/decks/:id/update/preview`:

1. Detect `.kartex.zip` vs `.kartex` by filename
2. For zip: open with `unzipper.Open.buffer`, find `deck.kartex`, parse it
3. Diff computation is identical to the current flow — no media involvement in preview
4. Response shape unchanged: `{ added, updated, unchanged, removed }`

Media is NOT extracted or validated during preview — consistent with the stateless read-only preview pattern.

### Apply Endpoint with Zip

`POST /api/decks/:id/update/apply`:

1. For zip: validate + store media via `importMedia.ts` helper
2. Rewrite media refs in card content before create/update
3. Existing "updated" cards get their content replaced including new media refs

The apply endpoint is already stateless (re-parses the file). The zip path follows the same stateless pattern.

### Body Limit Fix

`deckUpdate.ts` hardcodes `5 * 1024 * 1024`. Change to read `MAX_UPLOAD_BYTES` from env (same env var as `import.ts`, default 10 MB). A deck with even a few images in `media/` will exceed 5 MB.

### Modified Files

| File | Change |
|------|--------|
| `apps/backend/src/lib/importMedia.ts` | NEW — shared media extraction, validation, storage logic |
| `apps/backend/src/routes/import.ts` | Refactor zip section to use `importMedia.ts` helpers |
| `apps/backend/src/routes/deckUpdate.ts` | Replace zip rejection guards with full zip handling; use `importMedia.ts`; fix body limit |

### Modified Frontend

| File | Change |
|------|--------|
| `apps/frontend/src/components/DeckUpdateModal.tsx` | Change file input `accept` attribute from `.kartex` to `.kartex,.kartex.zip`. No logic changes — the backend now handles both. |

---

## Feature 7: Quick-Edit in Study Mode

### Permission Model

A study session can contain cards from multiple decks (global SR mode). The `DueCard` type must carry a `canEdit` flag computed by the server — avoids per-card permission lookups on the frontend.

**Add `canEdit: boolean` to `DueCardSchema`.** The study endpoint already joins deck info to fetch `deckTitle`. Adding `canEdit` is a small addition: user is owner of `card.deck` OR has EDIT/MANAGE share on `card.deck`.

### Modified Files (Backend)

| File | Change |
|------|--------|
| `apps/backend/src/routes/study.ts` | For each card in `GET /api/study/due` and `GET /api/study/deck/:id`, compute `canEdit` (owner OR EDIT/MANAGE share). Include in response. |
| `packages/shared/src/schemas/study.ts` | Add `canEdit: z.boolean()` to `DueCardSchema` |

**Performance note:** The study endpoint already fetches all due cards for a user. `canEdit` can be computed with a single batch lookup: fetch all `DeckShare` rows for the current user with EDIT/MANAGE permission, build a `Set<deckId>`, then for each card: `canEdit = card.deckOwnerId === userId || editableDeckIds.has(card.deckId)`. One extra query, O(1) per card.

### New Component

```
apps/frontend/src/components/StudyCardMenu.tsx   NEW
```

A small `DropdownMenu` component:
- Props: `card: DueCard`, `onEdit: () => void`
- Only rendered when `currentCard.canEdit === true`
- Items: "Edit card" → calls `onEdit()`; "Go to deck" → `navigate('/decks/' + card.deckId)`

### Modified Files (Frontend)

| File | Change |
|------|--------|
| `apps/frontend/src/pages/StudySessionPage.tsx` (SessionRunner) | Add `StudyCardMenu` overlay per card when `currentCard.canEdit`. Handle `onEdit`: open `CardEditorModal`, on save update the `cards` array in local state. |
| `apps/frontend/src/components/CardFlip.tsx` | Possibly modified: add a slot or overlay area for the menu without interfering with the flip click target. |

### Event Propagation Guard

The 3-dot menu trigger must call `e.stopPropagation()` — clicking the menu must not trigger the CardFlip click handler (which flips the card).

### Card Update in Session

After "Edit card" saves via `CardEditorModal`:
- Add `onCardUpdated: (updatedCard: Card) => void` prop to `CardEditorModal` (or use an existing callback mechanism)
- `SessionRunner` maps the `cards` array to replace the updated card by `id`, so the session continues with updated content without restarting

`CardEditorModal` already exists in `apps/frontend/src/components/` and is used in `DeckDetailPage`. No new editor component needed.

### Dependency

Requires adding `canEdit` to the shared schema before the frontend can use it. Backend study route change must land first.

---

## New Backend Routes Summary

| Method | Path | File | Auth | Feature |
|--------|------|------|------|---------|
| `GET` | `/api/auth/invite-token?token=` | `auth.ts` | None | F2: validate invite token |
| `POST` | `/api/auth/register-by-token` | `auth.ts` | None | F2: register via email invite |
| `POST` | `/api/auth/forgot-password` | `auth.ts` | None | F3: request password reset |
| `POST` | `/api/auth/reset-password` | `auth.ts` | None | F3: complete password reset |
| `POST` | `/api/admin/invite-tokens` | `admin.ts` | Admin | F2: send email invite |
| `GET` | `/api/admin/invite-tokens` | `admin.ts` | Admin | F2: list invite tokens |
| `DELETE` | `/api/admin/invite-tokens/:id` | `admin.ts` | Admin | F2: revoke token |
| `POST` | `/api/admin/users/:id/reset-password` | `admin.ts` | Admin | F3: admin-triggered reset |
| `DELETE` | `/api/admin/users/:id` | `admin.ts` | Admin | F4: delete user |

## Modified Routes Summary

| Method | Path | File | Change |
|--------|------|------|--------|
| `GET` | `/api/auth/me` | `auth.ts` | Add `email` to select + response |
| `POST` | `/api/auth/login` | `auth.ts` | Add `email` to response |
| `POST` | `/api/auth/refresh` | `auth.ts` | Add `email` to response |
| `GET` | `/api/admin/users` | `admin.ts` | Add `email` to select + response |
| `POST` | `/api/decks/:id/update/preview` | `deckUpdate.ts` | Accept .kartex.zip |
| `POST` | `/api/decks/:id/update/apply` | `deckUpdate.ts` | Accept .kartex.zip + store media |
| `GET` | `/api/study/due` | `study.ts` | Add `canEdit` per card |
| `GET` | `/api/study/deck/:id` | `study.ts` | Add `canEdit` per card |

---

## Schema Changes Summary

### New Models

| Model | Migration | Purpose |
|-------|-----------|---------|
| `InviteToken` | `20260620000001_add_invite_token` | Email-based invite links |
| `PasswordResetToken` | `20260620000002_add_password_reset_token` | Self-service + admin-triggered password reset |

### Modified Models

| Model | Change | Migration |
|-------|--------|-----------|
| `User` | `email String? @unique` added | `20260620000000_add_user_email` |
| `RefreshToken` | `onDelete: Cascade` on `userId` FK | `20260620000003_add_user_cascade_deletes` |
| `Deck` | `onDelete: Cascade` on `ownerId` FK | `20260620000003_add_user_cascade_deletes` |
| `DeckShare` | `onDelete: Cascade` on `sharedWithUserId` FK | `20260620000003_add_user_cascade_deletes` |
| `CardProgress` | `onDelete: Cascade` on `userId` FK | `20260620000003_add_user_cascade_deletes` |

**4 hand-written SQL migrations total.** Can be batched into fewer files per deployment if done in the same phase.

---

## Frontend New Pages / Components

### New Pages

| File | Route | Auth | Purpose |
|------|-------|------|---------|
| `RegisterPage.tsx` | `/register?token=` | None | Email invite registration |
| `ForgotPasswordPage.tsx` | `/forgot-password` | None | Request password reset |
| `ResetPasswordPage.tsx` | `/reset-password?token=` | None | Complete password reset |

### New Components

| File | Purpose |
|------|---------|
| `StudyCardMenu.tsx` | 3-dot DropdownMenu for quick-edit in study session |

### Modified Pages/Components

| File | Change |
|------|--------|
| `AdminPage.tsx` | Add `EmailInviteSection`; add Reset Password + Delete buttons to UsersSection |
| `LoginPage.tsx` | Add "Forgot password?" link |
| `StudySessionPage.tsx` (SessionRunner) | Integrate `StudyCardMenu` per card; handle card-update callback |
| `DeckUpdateModal.tsx` | Accept `.kartex.zip` in file input `accept` attribute |
| `KartexRenderer.tsx` | Add `preprocessAbcBlocks` + `AbcBlock` component; wire `language-abc` in `kartexComponents` |

### Modified Shared Schemas

| File | Change |
|------|--------|
| `packages/shared/src/schemas/user.ts` | Add `email: z.string().email().nullable().optional()` to `UserSchema` |
| `packages/shared/src/schemas/auth.ts` | Add `RegisterByTokenSchema`, `ForgotPasswordSchema`, `ResetPasswordSchema` |
| `packages/shared/src/schemas/study.ts` | Add `canEdit: z.boolean()` to `DueCardSchema` |

---

## New Backend Libraries

| Package | Install location | Purpose |
|---------|-----------------|---------|
| `nodemailer` | `apps/backend` | SMTP email sending |
| `@types/nodemailer` | `apps/backend` (devDependencies) | TypeScript types |

`abcjs` goes in `apps/frontend` only.

---

## Integration Points Needing Special Care

### 1. User.email nullable in all API responses

Existing seeded admin user has no email. Every API response that includes `email` must type it as `string | null`. The `POST /forgot-password` endpoint must gracefully skip when `user.email === null`. The admin reset-password endpoint should return a clear error (409 or 422) when targeting a user with no email.

### 2. New public auth routes registered before authMiddleware

`GET /api/auth/invite-token`, `POST /api/auth/register-by-token`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` — all must be in `authRouter` (mounted at step 3 in `index.ts`, before the global `authMiddleware` at step 4). They already live in the right file. Guard: these handlers must never call `c.get('userId')` — they have no JWT.

### 3. Rate limiting on new auth routes is automatic

`auth.ts` applies `rateLimitMiddleware(10, 60_000)` via `auth.use('*', ...)`. All new routes in `auth.ts` — including `forgot-password` — inherit this rate limit automatically.

### 4. abcjs + Cross-Origin Embedder Policy

`index.ts` sets `crossOriginEmbedderPolicy: 'require-corp'`. If `abcjs` loads any external resources at render time, COEP will block them. `abcjs` is expected to render entirely from the inline ABC string with no external fetches — must be verified in testing.

### 5. DeckUpdate zip body limit

`deckUpdate.ts` has a hardcoded `5 * 1024 * 1024` limit. Must be replaced with `parseInt(process.env.MAX_UPLOAD_BYTES ?? '10485760', 10)` — same pattern as `import.ts`. A deck with a few audio files easily exceeds 5 MB.

### 6. Media orphans on user delete

When a user is deleted, `Deck` → `Card` cascade removes card records from DB. Media files referenced in those cards remain on disk. The `Media` table rows owned by the user also delete via cascade (if `Media.ownerId` FK has cascade — check current schema; `Media` model has no relation defined yet). This is a pre-existing known issue ("T-5-07 accepted" in `import.ts`). User deletion does not introduce a new problem, but admins should know media files accumulate on the volume.

### 7. StudyCardMenu click vs CardFlip click

`CardFlip` uses `onClick` on the whole card face to flip. The `StudyCardMenu` trigger must call `e.stopPropagation()` to prevent the menu click from triggering a flip.

### 8. RegisterPage, ForgotPasswordPage, ResetPasswordPage as public routes

These three pages must be added to the public (unauthenticated) route group in the React Router config alongside `/login`. If the existing `PrivateRoute` guard wraps everything else, ensure these paths are excluded.

### 9. Cascade constraint name discovery

The hand-written migration for cascade deletes requires knowing the exact FK constraint names currently in the DB. These were auto-generated by Prisma at `prisma migrate dev` time. The safe approach is to run `SELECT conname FROM pg_constraint WHERE conrelid = '"RefreshToken"'::regclass AND contype = 'f'` against the dev DB to get exact names before writing the migration. Alternatively, use `DROP CONSTRAINT IF EXISTS` with the assumed Prisma-generated name pattern.

---

## Build Order

### Phase A: Foundation (User.email + cascade deletes + admin delete)

**Rationale:** User.email is a hard prerequisite for all email flows. Cascade migrations are schema-level and should be batched with other schema changes to minimize deployment events. Admin DELETE can ship here since it has no email dependency.

Deliverables:
- Migration: `add_user_email`
- Migration: `add_user_cascade_deletes` (also covers cascade-safe delete)
- Schema: `User.email` in Prisma schema + shared schema
- Backend: `DELETE /api/admin/users/:id` with guards
- Frontend: Delete button + confirmation in `AdminPage.tsx` UsersSection
- Backend: `GET /api/admin/users` + auth `/me` / login / refresh responses include `email`

### Phase B: Email Invitations

**Rationale:** Requires User.email (Phase A). Mailer service must exist before password reset (Phase C) can use it.

Deliverables:
- Migration: `add_invite_token`
- `apps/backend/src/lib/mailer.ts` (SMTP singleton + sendInviteEmail)
- Backend: `POST/GET/DELETE /api/admin/invite-tokens` in `admin.ts`
- Backend: `GET /api/auth/invite-token` + `POST /api/auth/register-by-token` in `auth.ts`
- Shared schema: `RegisterByTokenSchema`
- Frontend: `EmailInviteSection` in `AdminPage.tsx`
- Frontend: new `RegisterPage.tsx` + public router entry

### Phase C: Password Reset

**Rationale:** Requires User.email (Phase A) and `lib/mailer.ts` (Phase B).

Deliverables:
- Migration: `add_password_reset_token`
- Backend: `POST /api/auth/forgot-password` + `POST /api/auth/reset-password`
- Backend: `POST /api/admin/users/:id/reset-password`
- Shared schema: `ForgotPasswordSchema`, `ResetPasswordSchema`
- `mailer.ts`: add `sendPasswordResetEmail`
- Frontend: new `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`
- Frontend: "Forgot password?" link in `LoginPage.tsx`
- Frontend: "Send Password Reset" button in `AdminPage.tsx` UsersSection

### Phase D: ABC Notation Rendering

**Rationale:** No backend dependencies. Pure frontend. Can be done at any point — placed after auth features so rendering work doesn't block the critical auth path.

Deliverables:
- Install `abcjs` in `apps/frontend`
- Modify `KartexRenderer.tsx`: add `preprocessAbcBlocks`, `AbcBlock`, wire `language-abc`

### Phase E: Deck Update via .kartex.zip

**Rationale:** No schema or auth dependencies. Placed here to isolate the backend refactor into its own phase.

Deliverables:
- New `apps/backend/src/lib/importMedia.ts`
- Refactor `import.ts` to use shared utility
- Modify `deckUpdate.ts`: replace zip rejection, add zip handling, fix body limit
- Modify `DeckUpdateModal.tsx`: update `accept` attribute

### Phase F: Quick-Edit in Study Mode

**Rationale:** Most surgical change to the active study session. Build after auth and rendering features are stable. Shared schema change (`canEdit`) has frontend and backend touch points that must land together.

Deliverables:
- Shared schema: `canEdit: z.boolean()` in `DueCardSchema`
- Backend: compute `canEdit` in `GET /api/study/due` and `GET /api/study/deck/:id`
- Frontend: new `StudyCardMenu.tsx`
- Frontend: integrate `StudyCardMenu` into `SessionRunner` in `StudySessionPage.tsx`
- Frontend: `onCardUpdated` callback wiring for `CardEditorModal`

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| Schema changes | HIGH | Read `schema.prisma` directly; all FK constraints verified against migration history |
| Route placement | HIGH | Read `index.ts` and all route files |
| Migration pattern | HIGH | Read all 6 existing hand-written migrations; confirmed SQL-only pattern |
| InviteToken SHA-256 vs bcrypt | HIGH | Well-established engineering principle |
| abcjs rendering pattern | HIGH | Follows existing Typst WASM pattern; synchronous API |
| ZIP update shared utility | HIGH | Read both `import.ts` and `deckUpdate.ts` in full |
| nodemailer ESM compatibility | MEDIUM | Standard choice; exact ESM/CJS interop with Hono/Node should be verified during install |
| canEdit batch query cost | MEDIUM | study.ts not read in full; assumes current query structure allows a single batch lookup per request |
| Cascade constraint names | MEDIUM | Prisma auto-generates FK constraint names; exact names require DB inspection before migration authoring |
