# Phase 1: Foundation & Auth - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers: monorepo scaffold (yarn workspaces), Docker Compose production stack (backend + db, no Nginx service), JWT auth with invite-code registration, admin user management, and the frontend auth pages + app shell with left sidebar navigation.

A new user can register via invite code, log in, and an admin can manage users — the app is deployable via `docker compose up -d`.

**Out of scope for this phase:** TLS/Nginx proxy (handled externally by Nginx Proxy Manager), rich content rendering, deck/card management, spaced repetition, import pipeline, sharing.

</domain>

<decisions>
## Implementation Decisions

### Admin Bootstrap (D-01 through D-03)
- **D-01:** First admin user seeded from env vars on first startup — backend checks if any user exists; if not, creates admin from `ADMIN_USERNAME` + `ADMIN_PASSWORD` in `.env`. No separate seed script, no setup page.
- **D-02:** First invite code auto-generated on first run (alongside admin seed), printed once to stdout (visible via `docker compose logs backend`). No `INITIAL_INVITE_CODE` env var needed.
- **D-03:** If admin already exists (non-fresh install), skip seeding entirely — idempotent startup behavior.

### Docker Compose & Infrastructure (D-04 through D-07)
- **D-04:** **Yarn workspaces** instead of pnpm (overrides design doc). All scripts, lockfile, and workspace config use Yarn.
- **D-05:** No Nginx service in Docker Compose — the user runs Nginx Proxy Manager on their VPS externally. Docker Compose exposes the backend port directly for NPM to proxy.
- **D-06:** Hono backend serves the built React SPA as static files (Vite build output mounted/copied to `public/` or similar). Single container, single exposed port.
- **D-07:** Production-only Docker Compose (`docker-compose.yml`). Dev workflow runs outside Docker (`yarn workspace frontend dev` / `yarn workspace backend dev`).

### Invite Code System (D-08 through D-11)
- **D-08:** Each invite code is **single-use** — once a user registers with it, the code is invalidated and cannot be reused.
- **D-09:** Invite codes have a **configurable expiry** — default 7 days. Admin can set a custom expiry when generating a code.
- **D-10:** Admin invite code UI table shows: code string, status (active/used/expired), used-by username (if used), and expiry date.
- **D-11:** Admin can generate new codes and delete unused codes from the admin panel.

### Frontend Scaffold (D-12 through D-15)
- **D-12:** Phase 1 delivers: auth pages (`/login`, `/register`) + admin page (`/admin`) + **app shell** with left sidebar navigation + route guards.
- **D-13:** Left sidebar nav with icons + labels: Dashboard, Decks, Import, Explore, Settings. Admin link visible to admins only. Phase 2+ routes show a "Coming soon" placeholder.
- **D-14:** Auth pages are shown unauthenticated (no sidebar). After login, the app shell (sidebar) wraps all protected routes.
- **D-15:** shadcn/ui components installed in Phase 1: **Button, Input, Form, Label, Card, Table, Toast (Sonner)**. These cover login/register forms, admin tables, and notifications.

### Claude's Discretion
- Error message wording for invalid invite codes, wrong password, expired codes — Claude picks sensible, non-leaking messages.
- Exact Tailwind color theme / shadcn/ui theme config — Claude picks a clean neutral theme (can be changed later).
- Token refresh silent retry logic implementation details.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & Tech Stack
- `docs/design.md` §2 — Tech stack decisions (note: yarn replaces pnpm per D-04)
- `docs/design.md` §3 — Monorepo structure (apps/frontend, apps/backend, packages/shared)
- `docs/design.md` §4 — Architecture overview (note: no Nginx in Docker Compose per D-05)
- `docs/design.md` §12 — Docker Compose reference (adapt: remove proxy service, expose backend port directly)

### Authentication
- `docs/design.md` §5 — Auth approach: invite codes, JWT httpOnly cookies, bcrypt, roles
- `docs/design.md` §13 — Security requirements (rate limiting, CORS, no hardcoded secrets)

### Data Model
- `docs/design.md` §6 — Full Prisma schema (User, Deck, Card, CardProgress, Media, InviteCode models)

### Requirements (Phase 1 scope)
- `.planning/REQUIREMENTS.md` — AUTH-01 through AUTH-05, ADMN-01 through ADMN-03, INFR-01 through INFR-06

### Frontend Pages
- `docs/design.md` §11 — Full frontend page list (Phase 1 delivers: /login, /register, /admin)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None yet — this is the first phase, starting from an empty monorepo.

### Established Patterns
- None yet — patterns established in this phase become the baseline for all subsequent phases.

### Integration Points
- `packages/shared/src/schemas/` — Zod schemas for User, InviteCode (created here, used by backend routes + frontend forms)
- `apps/backend/prisma/schema.prisma` — Full Prisma schema initialized here (all models, even those used in later phases)
- `apps/backend/src/routes/auth.ts` — Auth routes created here, middleware pattern established for all future routes
- `apps/frontend/src/components/` — shadcn/ui components copied here, reused across all future phases

</code_context>

<specifics>
## Specific Ideas

- Admin seeds via `ADMIN_USERNAME` + `ADMIN_PASSWORD` env vars — exact variable names to use in `.env.example`
- First invite code printed to `stdout` once on first run (not on subsequent starts) — deployer reads it with `docker compose logs backend`
- Nginx Proxy Manager is the external TLS/proxy layer — Docker Compose only needs to expose the backend port (e.g., `3000`) for NPM to forward to
- Invite code table includes expiry date column so admin can see which codes are about to expire

</specifics>

<deferred>
## Deferred Ideas

- **Multi-use invite codes** (configurable max uses per code) — suggested but deferred; single-use is sufficient for v1's 2-5 user scale
- **TLS / Nginx service in Docker Compose** — handled by external Nginx Proxy Manager; deferred from Phase 6 scope as well (not needed)
- **Email-based invite delivery** — sending invite codes by email; not in scope for v1 (self-hosted, small group)

</deferred>

---

*Phase: 1-Foundation & Auth*
*Context gathered: 2026-05-25*
