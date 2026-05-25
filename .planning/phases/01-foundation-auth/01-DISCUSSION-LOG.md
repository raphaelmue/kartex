# Phase 1: Foundation & Auth - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 1-Foundation & Auth
**Areas discussed:** Initial admin bootstrap, Docker Compose dev vs prod, Invite code management, Frontend scaffold depth

---

## Initial Admin Bootstrap

| Option | Description | Selected |
|--------|-------------|----------|
| Env-var seed (ADMIN_USERNAME + ADMIN_PASSWORD) | Backend seeds admin on first startup if no users exist | ✓ |
| Seed script (npm run seed) | Separate CLI command the deployer runs once | |
| First-run setup page | /setup page if no users exist | |

**User's choice:** Env-var seed

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — seed 1 invite code too | Auto-generate first invite code on first run | ✓ |
| No — admin logs in first, then creates codes via /admin | Minimal bootstrap, exercises UI | |

**User's choice:** Yes — seed 1 invite code, print to logs

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-generated on first run, printed to logs | Backend generates random code, logs to stdout | ✓ |
| Set via INITIAL_INVITE_CODE env var | Deployer sets explicitly in .env | |

**User's choice:** Auto-generated, printed to logs

---

## Docker Compose dev vs prod

| Option | Description | Selected |
|--------|-------------|----------|
| Production config only | docker-compose.yml deploys full built app; dev runs outside Docker | ✓ (with modification) |
| Dev config only first | Hot-reload volume mounts, defer production config | |
| Both: docker-compose.yml + docker-compose.dev.yml | Production + dev override | |

**User's choice:** Production config only — but with **yarn workspaces** instead of pnpm (overrides design doc constraint)

| Option | Description | Selected |
|--------|-------------|----------|
| HTTP only in Phase 1 | Phase 6 scoped for TLS | — (N/A) |
| TLS from the start | Self-signed cert or Let's Encrypt | — (N/A) |

**Notes:** User has **Nginx Proxy Manager** on their VPS — Nginx is outside Docker Compose scope entirely. No proxy service needed.

| Option | Description | Selected |
|--------|-------------|----------|
| Hono backend serves built SPA | Single container, one exposed port | ✓ |
| Separate lightweight static container | nginx:alpine/caddy for static files | |
| Vite preview or serve in production container | Simple but non-standard | |

**User's choice:** Hono serves the built SPA

---

## Invite Code Management

| Option | Description | Selected |
|--------|-------------|----------|
| No expiry | Codes valid until used or deleted | |
| Configurable expiry (7 days default) | Admin sets expiry per code or uses default | ✓ |

**User's choice:** Configurable expiry, 7-day default

| Option | Description | Selected |
|--------|-------------|----------|
| Code + status (active/used) + created date | Minimal table | |
| Code + status + used-by user + expiry date | Richer table | ✓ |
| Just a 'Generate Code' button | No persistent list | |

**User's choice:** Code + status + used-by user + expiry date

| Option | Description | Selected |
|--------|-------------|----------|
| Single-use only | Each code registers exactly one user | ✓ |
| Configurable max uses per code | Admin sets uses=1 or higher | |

**User's choice:** Single-use only

---

## Frontend Scaffold Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Auth pages + app shell | Login/register/admin + layout shell with nav sidebar + route guards + placeholders | ✓ |
| Auth pages only | Strictly /login, /register, /admin — no nav shell | |
| Full navigation + dashboard skeleton | Full nav + skeleton pages for all phases | |

**User's choice:** Auth pages + app shell

| Option | Description | Selected |
|--------|-------------|----------|
| Left sidebar with icons + labels | Dashboard, Decks, Import, Explore, Settings, Admin | ✓ |
| Top navigation bar | Horizontal nav | |
| You decide | Claude picks nav layout | |

**User's choice:** Left sidebar with icons + labels

**shadcn/ui components (multiselect):**
- ✓ Button, Input, Form, Label
- ✓ Card
- ✓ Table
- ✓ Toast / Sonner

---

## Claude's Discretion

- Error message wording for invalid invite codes / wrong password / expired codes
- Tailwind color theme / shadcn/ui theme configuration
- Token refresh silent retry logic implementation details

## Deferred Ideas

- **Multi-use invite codes** — configurable max uses per code; deferred as single-use suffices for v1 scale
- **TLS/Nginx in Docker Compose** — not needed; external Nginx Proxy Manager handles this
- **Email-based invite delivery** — out of scope for v1
