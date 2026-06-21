# Project Research Summary — Kartex v1.4.0

**Project:** Kartex v1.4.0 — Auth Overhaul & Study UX
**Domain:** Self-hosted spaced-repetition flashcard app — email auth, admin management, content rendering
**Researched:** 2026-06-19
**Confidence:** HIGH (all findings verified by direct codebase inspection)

---

## Executive Summary

Kartex v1.4.0 delivers three independent tracks: (A) email-based auth flows (invitations, password reset, admin user management), (B) ABC notation rendering in cards, and (C) two UX improvements (zip-based deck update, quick-edit in study mode).

**Net-new packages: 3** — `nodemailer@^9.0.1` + `@types/nodemailer@^8.0.1` (backend), `abcjs@^6.6.3` (frontend). Everything else uses existing stack.

**Database migrations: 4 hand-written SQL files** — add `User.email`, add `InviteToken` model, add `PasswordResetToken` model, add cascade deletes on FK constraints.

The critical dependency is `User.email`: all email features (invitations, forgot-password, admin-triggered reset) require this column to exist first. ABC notation, zip update, and quick-edit are fully independent of the auth track and can be built in parallel.

---

## Key Findings

### Stack Additions

| Package | Workspace | Purpose |
|---------|-----------|---------|
| `nodemailer@^9.0.1` | `@kartex/backend` | SMTP email delivery (invite + password reset) |
| `@types/nodemailer@^8.0.1` | `@kartex/backend` (dev) | TypeScript types |
| `abcjs@^6.6.3` | `@kartex/frontend` | ABC music notation → SVG rendering |

### Schema Changes

| Change | Migration | Notes |
|--------|-----------|-------|
| `User.email String? @unique` | `add_user_email` | Nullable for existing users; required for new invite-based registration |
| `InviteToken` model | `add_invite_token` | email, tokenHash, expiresAt, usedAt — replaces invite-code flow |
| `PasswordResetToken` model | `add_password_reset_token` | tokenHash @unique, expiresAt, usedAt (single-use) |
| Cascade deletes: RefreshToken, Deck, DeckShare, CardProgress | `add_user_cascade_deletes` | Required before admin user deletion can work |

### Feature Groups

**Group A — Auth & Email (share migration + SMTP):**
1. `User.email` + SMTP mailer singleton (`nodemailer`)
2. Email invitations (`InviteToken` model, admin panel, `/register?token=` page)
3. Self-service password reset (`PasswordResetToken`, `/forgot-password`, `/reset-password`)
4. Admin-triggered password reset (one button in admin panel, reuses token machinery)
5. Admin user deletion (cascade-safe `DELETE /api/admin/users/:id`)

**Group B — Admin (adjacent to Group A):**
- Covered by items 4 and 5 above — ships with Group A

**Group C — Content & Study (independent, no auth dependency):**
6. ABC notation rendering (`abcjs`, `KartexRenderer.tsx` preprocessing, `AbcBlock` component)
7. Deck update via `.kartex.zip` (extend `deckUpdate.ts`, extract shared `importMedia.ts` helper)
8. Quick-edit in study mode (`canEdit` on `DueCard`, `StudyCardMenu` component, inline card edit)

### Build Order (recommended)

```
Phase A — Foundation:
  User.email migration + cascade FK migration
  mailer.ts singleton (nodemailer)
  DELETE /api/admin/users/:id
  Admin delete UI

Phase B — Email Invitations:
  InviteToken migration
  POST/GET/DELETE /api/admin/invite-tokens
  GET /api/auth/invite-token + POST /api/auth/register-by-token
  RegisterPage.tsx (public route /register?token=)
  EmailInviteSection in AdminPage.tsx

Phase C — Password Reset:
  PasswordResetToken migration
  POST /api/auth/forgot-password + POST /api/auth/reset-password
  POST /api/admin/users/:id/reset-password
  ForgotPasswordPage.tsx + ResetPasswordPage.tsx
  "Forgot password?" link in LoginPage.tsx
  "Send Password Reset" button in AdminPage.tsx

Phase D — ABC Notation:
  yarn workspace @kartex/frontend add abcjs
  preprocessAbcBlocks + AbcBlock component in KartexRenderer.tsx

Phase E — Zip Update:
  importMedia.ts shared helper (extracted from import.ts)
  deckUpdate.ts zip support + body limit fix
  DeckUpdateModal.tsx accept=".kartex,.kartex.zip"

Phase F — Quick-Edit:
  canEdit field in DueCardSchema + study.ts computation
  StudyCardMenu.tsx component
  SessionRunner integration + CardEditorModal callback
```

---

## Implications for Roadmap

### Recommended Phase Grouping

**Phase 23: Auth Foundation** (User.email + cascade FKs + SMTP mailer + admin user delete)
- Smallest shippable unit that unblocks everything else
- No visible auth features yet — foundation layer

**Phase 24: Email Invitations** (requires Phase 23)
- Full invite flow: admin → email → /register?token= → user sets username/password
- Replaces invite-code flow (old flow stays as fallback)

**Phase 25: Password Reset** (requires Phases 23–24 for mailer)
- Self-service forgot-password + admin-triggered reset
- Completes the auth overhaul

**Phase 26: ABC Notation** (independent — can start any time)
- Pure frontend, no backend changes, abcjs follows Typst pattern exactly

**Phase 27: Zip Deck Update** (independent)
- Backend refactor: shared importMedia.ts + deckUpdate.ts zip handling
- Small frontend change (accept attribute)

**Phase 28: Quick-Edit in Study** (independent)
- Backend: canEdit on DueCard schema + study.ts
- Frontend: StudyCardMenu + SessionRunner integration

### Research Flags

**NOT blocking planning — all confirmed by direct codebase reads:**
- Cascade constraint names in existing DB require `SELECT conname FROM pg_constraint` before writing the migration — handle at plan time
- `abcjs` COEP compatibility (no external fetches expected) — verify during test phase
- `CardEditorModal.tsx` exists and is reusable for quick-edit (confirmed by reading DeckDetailPage)

---

## Top Pitfalls to Avoid

| Risk | Phase | Mitigation |
|------|-------|------------|
| Email enumeration via distinct error messages | 25 | Always return 200 for forgot-password regardless of email existence |
| Plaintext reset token in DB | 25 | Store SHA-256 hash only; raw token only in email link |
| TOCTOU race on invite/reset token single-use | 24, 25 | Atomic `updateMany WHERE usedAt IS NULL` + check count === 1 |
| FK constraint violation on user delete | 23 | Cascade migration OR manual ordered delete in `prisma.$transaction` |
| abcjs DOM-mutation in React render phase | 26 | `useRef + useEffect([source])` pattern (same as TypstBlock) |
| abcjs lazy load (bundle size) | 26 | Dynamic `import('abcjs')` inside `useEffect` |
| Path traversal in zip media filenames | 27 | `basename()` + `startsWith(storagePath)` check (copy from `import.ts`) |
| Zip update accepts client diff on apply | 27 | Re-parse and re-run `computeDiff` server-side on every apply |
| Quick-edit permission check client-only | 28 | Server-side EDIT/MANAGE check on `PATCH /api/cards/:id` |
| 3-dot menu click triggers card flip | 28 | `e.stopPropagation()` on DropdownMenuTrigger |

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| Stack | HIGH | `package.json` files and schema.prisma read directly |
| Features | HIGH | Codebase inspection + OWASP + abcjs docs |
| Architecture | HIGH | All route files and components read; integration points mapped |
| Pitfalls | HIGH | Concrete and codebase-specific; each traced to a file or CVE |

---

## Sources

### Primary (direct codebase inspection)
- `apps/backend/prisma/schema.prisma` — FK constraints, existing models
- `apps/backend/src/routes/auth.ts`, `admin.ts`, `import.ts`, `deckUpdate.ts`, `study.ts`
- `apps/frontend/src/components/KartexRenderer.tsx` — TypstBlock pattern
- `apps/frontend/src/pages/AdminPage.tsx`, `StudySessionPage.tsx`

### Secondary (official docs)
- OWASP Forgot Password Cheat Sheet
- abcjs docs.abcjs.net — renderAbc API, React integration pattern
- Nodemailer v9 release notes
- Homarr GHSA-vfw3-53q9-2hp8 (invite TOCTOU)
- Parse Server CVE-2026-32943 (reset token race)

---
*Research completed: 2026-06-19*
*Ready for roadmap: yes*
