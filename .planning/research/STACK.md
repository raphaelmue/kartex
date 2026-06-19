# Technology Stack — v1.4.0 Additions

**Project:** Kartex v1.4.0 Auth Overhaul & Study UX
**Researched:** 2026-06-19
**Mode:** Milestone supplement — existing stack is fixed; this covers NEW capabilities only.

---

## Scope

Eight feature areas. The existing stack (React 18 + Vite 5 + TypeScript + shadcn/ui + Hono +
Prisma 7 + PostgreSQL 16 + react-i18next v26 + unzipper + jose) is validated and not
re-researched. This file covers only net-new packages.

---

## Feature Group 1: Email Delivery (SMTP)

### Recommended: nodemailer 9.0.1

| Package | Version | Install In | Purpose | Why chosen |
|---------|---------|------------|---------|------------|
| `nodemailer` | `^9.0.1` | `@kartex/backend` | SMTP email delivery | De-facto standard, zero runtime dependencies, self-hosted SMTP compatible, MIT-0 license |
| `@types/nodemailer` | `^8.0.1` | `@kartex/backend` (devDep) | TypeScript types | Nodemailer does not bundle types; DefinitelyTyped package is current and actively maintained |

**Key facts (verified):**

- v9.0.1 released 2026-06-17 — actively maintained, bug fixes still flowing (9.0.0 on 2026-06-14).
- License changed to **MIT-0** (no-attribution MIT variant) — permissive, no risk.
- CJS package (`main: lib/nodemailer.js`, no `"type": "module"`). Node.js ESM hosts can default-import CJS packages. The backend already does this with `bcryptjs` and `unzipper` — confirmed pattern: `import bcrypt from 'bcryptjs'` in `apps/backend/src/lib/seed.ts`. Same pattern works for nodemailer.
- Zero runtime dependencies — no transitive dep bloat.
- Breaking change in v9: TLS certificate validation now enforced by default for remote content fetches. Self-hosted SMTP with a valid cert (Let's Encrypt) is unaffected. If users configure SMTP to a server with a self-signed cert, they must set `tls: { rejectUnauthorized: false }` in the transport config — expose this in the admin SMTP settings UI.
- `@types/nodemailer` 8.0.1 is current (released 2026-06-10).

**Why not alternatives:**

| Alternative | Reason rejected |
|-------------|-----------------|
| `@sendgrid/mail` | Cloud-API dependency — Kartex is self-hosted; users configure their own SMTP server |
| `resend` | Same issue — third-party API, not SMTP |
| `emailjs` | Lighter but far less adoption and documentation; nodemailer has no meaningful overhead |

### Email Templating: No library — inline template literals

Kartex v1.4.0 sends exactly **3 email types**: invite link, self-service password reset, admin-triggered password reset. The content is simple transactional HTML: heading, one paragraph, one button/link.

**Decision: write HTML as tagged template literals in a dedicated `src/lib/emailTemplates.ts` file on the backend.** No templating library needed.

- `react-email` requires React installed on the backend — significant overhead (React is a frontend dependency). Overkill for 3 static templates. Not added.
- `handlebars` / `ejs` add a dependency for what amounts to 3 string interpolations. No added value.
- Inline template literals give full TypeScript type safety, zero dependencies, and are testable with a string assertion.

**Pattern:** Each template function accepts `{ appUrl, token, username }` and returns `{ subject: string, html: string, text: string }`. The `text` fallback is a plain-text version of the same content.

---

## Feature Group 2: Password Reset & Invite Tokens

### No new packages — use `node:crypto` (built-in)

| Package | Version | Purpose |
|---------|---------|---------|
| *(none)* | — | Token generation uses `crypto.randomBytes(32).toString('hex')` from Node.js built-in |

**Rationale:**

- `crypto.randomBytes(32).toString('hex')` produces 64-character hex strings — 256 bits of entropy. Cryptographically strong (CSPRNG). No external dependency.
- The existing backend already imports from `node:crypto` (`randomUUID` in `import.ts`). Pattern established.
- `nanoid` would be a valid alternative (URL-safe alphabet, compact output) but adds a dependency for no functional gain. The token only appears in an email link, never displayed to users — hex is fine.
- `uuid` is explicitly worse for security tokens (RFC 4122 v4 is only 122 bits; `randomBytes` gives 256 bits).

**Schema additions needed (no new packages):**

Two new Prisma models via hand-written SQL migrations (established pattern):

```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String   @unique          // SHA-256 of raw token; raw token only in email
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
}

model InviteEmail {
  id        String    @id @default(cuid())
  email     String    @unique
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
}
```

Token lifecycle:
1. Generate: `crypto.randomBytes(32).toString('hex')` → raw token
2. Hash for storage: `crypto.createHash('sha256').update(rawToken).digest('hex')` → `tokenHash`
3. Email: link contains raw token (`?token=<raw>`)
4. Verify: hash incoming token, compare to `tokenHash` in DB
5. Invalidate: set `usedAt`, check `expiresAt` — single-use enforced at DB level

`User` model also needs `email String? @unique` field (nullable for existing users during migration).

---

## Feature Group 3: ABC Music Notation (abcjs)

### Recommended: abcjs 6.6.3 (frontend only)

| Package | Version | Install In | Purpose | Why chosen |
|---------|---------|------------|---------|------------|
| `abcjs` | `^6.6.3` | `@kartex/frontend` | Render `#abc` fenced blocks as SVG sheet music | Only mature, actively-maintained ABC notation renderer for the browser; MIT license; includes TypeScript types |

**Key facts (verified):**

- v6.6.3 released 2026-04-24. Active maintenance: v6.6.0 (Jan 2026), v6.6.1 (Feb), v6.6.2 (Feb), v6.6.3 (Apr). v6.5.x released mid-2025.
- **TypeScript types included**: `types: "types/index.d.ts"` in package.json. No `@types/abcjs` needed.
- **CJS package** (`module.exports = abcjs`). Vite automatically handles CJS→ESM conversion at build time — this is the standard pattern (same as how the project uses other CJS packages on the frontend).
- **DOM-required, client-side only.** `abcjs.renderAbc()` writes SVG into a provided DOM element. It cannot run server-side (no SSR/Node rendering support). This is correct — Kartex is a pure SPA with no SSR.
- **Package size**: 5.9 MB unpacked. The dist folder contains `abcjs-basic-min.js` (the UMD bundle) and `abcjs-basic.js`. Vite tree-shakes from the module exports, so the actual bundle contribution is the rendering core only — audio synthesis (WebAudio/MIDI) is only included if imported explicitly.
- No CDN approach needed — npm + Vite is the correct integration path for this project.

**React integration pattern (verified via docs.abcjs.net):**

```typescript
// AbcRenderer.tsx — imperative, DOM-ref-based
import { useEffect, useRef } from 'react'
import abcjs from 'abcjs'

interface Props { notation: string }

export function AbcRenderer({ notation }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      abcjs.renderAbc(ref.current, notation, { responsive: 'resize' })
    }
  }, [notation])

  return <div ref={ref} />
}
```

This is the canonical pattern confirmed by abcjs GitHub issues and docs. `useEffect` (not `useLayoutEffect`) is correct because the SVG render is not layout-critical and this avoids SSR-warning noise.

**`renderAbc` signature:**
```typescript
abcjs.renderAbc(element: HTMLElement | string, abcString: string, options?: AbcVisualParams): TuneObject[]
```

First argument accepts an `HTMLElement` directly (the `ref.current`) or a DOM ID string.

**Where it plugs in:**

The existing `CardRenderer` component processes fenced code blocks via `react-markdown` + `rehype-highlight`. A `#abc` block is a fenced block with language `abc`. The existing pattern for `#typst` blocks (detected in `rehype` pipeline, rendered via `TypstRenderer`) is the model to follow: detect `language === 'abc'`, render via `AbcRenderer` component instead of `highlight.js`.

**Why not react-abcjs or @abc-editor/react:**

Both wrapper packages are effectively dead. `react-abcjs` last published 6 years ago. `@abc-editor/react` last published 2 years ago. Direct use of `abcjs` with a `useRef`/`useEffect` component is 10 lines of code and avoids a stale wrapper.

---

## Feature Group 4: ZIP Deck Update Extension

### No new packages — extend existing unzipper usage

The milestone requirement is: "extend the update/apply path to accept `.kartex.zip` bundles with a `media/` folder." The `.kartex.zip` import path already exists in `apps/backend/src/routes/import.ts` using `unzipper` (already installed). The deck update route (`deckUpdate.ts`) currently only handles `.kartex` text files.

**Change needed:** Extract the ZIP extraction logic from `import.ts` into a shared helper (`src/lib/kartexZip.ts`), then call it from both `import.ts` and `deckUpdate.ts`.

No new npm packages.

---

## Feature Group 5: Quick-Edit 3-Dot Menu in Study Mode

### No new packages — existing shadcn/ui DropdownMenu

The quick-edit menu is a 3-dot (`MoreVertical`) icon button with a `DropdownMenu` (edit card / jump to deck). The `@radix-ui/react-dropdown-menu` component is already installed (used on the deck list page in v1.3.1). The `MoreVertical` icon is from `lucide-react` (already installed).

No new npm packages.

---

## Feature Group 6: Admin User Deletion

### No new packages — Prisma cascade deletes

User deletion cascades to `Deck`, `DeckShare`, `CardProgress`, `ReviewLog` via Prisma `onDelete: Cascade`. The cascade is already set on `ReviewLog` and `CardProgress`. Confirm `Deck` has cascade to `Card` (yes — in current schema). Admin route addition only.

No new npm packages.

---

## Summary of New Dependencies

| Package | Version | Workspace | Type | Feature |
|---------|---------|-----------|------|---------|
| `nodemailer` | `^9.0.1` | `@kartex/backend` | dependency | Email delivery (invite, password reset) |
| `@types/nodemailer` | `^8.0.1` | `@kartex/backend` | devDependency | TypeScript types for nodemailer |
| `abcjs` | `^6.6.3` | `@kartex/frontend` | dependency | ABC music notation rendering |

**Total net-new packages: 3** (2 backend, 1 frontend)

Everything else (token generation, email templating, zip handling, UI components, admin ops) is covered by existing packages or Node.js built-ins.

---

## Schema Changes Required (no new packages)

All schema changes use the established hand-written SQL migration pattern.

| Change | Type | Notes |
|--------|------|-------|
| `User.email String? @unique` | Field addition | Nullable to preserve existing users; migration sets NULL for all current rows |
| `PasswordResetToken` model | New table | `tokenHash @unique`, `expiresAt`, `usedAt?` — single-use enforced |
| `InviteEmail` model | New table (replaces invite code flow) | `email @unique`, `tokenHash @unique`, `expiresAt` |
| `InviteCode` model | Keep or deprecate | Keep for backward compat; new flow uses `InviteEmail` |

---

## Installation

```bash
# Backend
yarn workspace @kartex/backend add nodemailer
yarn workspace @kartex/backend add -D @types/nodemailer

# Frontend
yarn workspace @kartex/frontend add abcjs
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| SMTP library | `nodemailer@9` | `@sendgrid/mail`, `resend` | Cloud API services, not SMTP; incompatible with self-hosted deployment model |
| SMTP library | `nodemailer@8` | `nodemailer@9` | v9 is current, actively maintained, no migration cost |
| Email templating | Inline template literals | `react-email`, `mjml`, `handlebars` | 3 simple transactional emails; any framework is overkill; react-email would require React on backend |
| Secure token generation | `node:crypto randomBytes` | `nanoid`, `uuid` | Built-in, zero dependencies, 256-bit entropy, established pattern in this codebase |
| ABC notation | `abcjs@6.6.3` (direct) | `react-abcjs` (wrapper) | Wrapper dead (6 years); 10-line React component replaces it |
| ABC notation | npm install | CDN `<script>` tag | CDN requires global variable access, conflicts with TypeScript imports, CSP issues |

---

## Sources

- `apps/backend/package.json` — confirmed existing deps (bcryptjs, unzipper, jose, file-type) and ESM CJS interop pattern (HIGH confidence)
- `apps/frontend/package.json` — confirmed existing deps (@radix-ui/react-dropdown-menu, lucide-react, react-markdown) (HIGH confidence)
- `apps/backend/prisma/schema.prisma` — confirmed existing models; identified fields to add (HIGH confidence)
- `npm show nodemailer --json` — version 9.0.1, license MIT-0, CJS, zero deps (HIGH confidence)
- `npm show @types/nodemailer version` — 8.0.1 current (HIGH confidence)
- GitHub: nodemailer/nodemailer — TypeScript types via `@types/nodemailer`; v9 TLS validation change (HIGH confidence)
- `npm show abcjs --json` — version 6.6.3, MIT, types bundled at `types/index.d.ts`, CJS (HIGH confidence)
- abcjs release history (npm) — 6.6.3 April 2026; actively maintained with 4 releases since Jan 2026 (HIGH confidence)
- https://docs.abcjs.net/overview/getting-started — npm install path, `import abcjs from 'abcjs'`, React useRef/useEffect pattern confirmed (HIGH confidence)
- https://docs.abcjs.net/visual/overview — `renderAbc(element, abcString, options)` signature; element accepts HTMLElement directly (HIGH confidence)
