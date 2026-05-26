# Kartex

## What This Is

Kartex is a self-hosted web application for creating, importing, and studying with multimedia flashcards. It supports rich content (LaTeX math, Typst expressions, images, audio, code), a custom `.kartex` import format, and SM-2 spaced repetition. Deployable via Docker Compose for a small group of 2-5 users with invite-based registration.

## Core Value

A user can open their dashboard, see their due cards, and complete a spaced-repetition study session — that loop must always work.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Authentication & Users**
- [ ] User can register via invite code (no open sign-up)
- [ ] Admin can create and manage invite codes
- [ ] User can log in with username + password and stay logged in (JWT, httpOnly cookie)
- [ ] User can log out
- [ ] Admin can manage users (roles: admin / user)

**Deck Management**
- [ ] User can create a deck with title and description
- [ ] User can view all their own decks
- [ ] User can edit or delete their own decks
- [ ] User can set deck visibility: private, shared, or public

**Card Management**
- [ ] User can create a card in a deck with front and back content (Kartex format: Markdown + KaTeX + Typst)
- [ ] User can edit and delete cards
- [ ] User can tag cards
- [ ] Cards render: Markdown, inline math (`$...$`), block math (`$$...$$`), `#typst` blocks (Typst WASM), images, audio (native player), external video (embedded), code blocks

**Study**
- [ ] User can start a spaced repetition session (SM-2, due cards across all decks)
- [ ] User can start a deck session (all cards in one deck, sequentially)
- [ ] User can start an exam session (time limit, progress not saved)
- [ ] After each card, user rates recall (1 = Again, 2 = Hard, 3 = Good, 4 = Easy)
- [ ] Dashboard shows all cards due today and overall statistics

**Import (.kartex)**
- [ ] User can upload a `.kartex` file and preview the parsed deck before importing
- [ ] User can upload a `.kartex.zip` bundle (deck.kartex + media/ folder)
- [ ] Importer creates deck and cards from parsed file, attaches bundled media

**Media**
- [ ] Images and audio files are stored on a local Docker volume
- [ ] File uploads validated by MIME type and magic bytes; max size configurable
- [ ] External videos referenced as links, rendered as embedded players

**Sharing & Collaboration**
- [ ] Deck owner can share a deck with specific users (READ or EDIT permission)
- [ ] Deck owner can make a deck public (discoverable on /explore)
- [ ] User can fork a shared/public deck into their own collection
- [ ] User can browse public decks on the explore page
- [ ] Learning progress is always stored per-user (not shared)

**Infrastructure**
- [ ] Full Docker Compose deployment: proxy (Nginx), backend (Hono), db (PostgreSQL 16), media volume
- [ ] Nginx handles TLS termination, static file serving, and reverse proxy to backend
- [ ] `.env` configuration for secrets (JWT_SECRET, DB_PASSWORD)

### Out of Scope

- **AI integration** — v2 feature; script → Claude API → Kartex deck generation not in v1
- **Offline / PWA** — service worker for offline study deferred to v2
- **OIDC / LDAP** — institutional auth not needed for 2-5 user self-hosted setup
- **Advanced statistics** — learning curves, retention rate charts; dashboard basics are in scope, detailed analytics are v2
- **AI-generated quiz mode** — multiple choice AI generation is v2; manual exam mode (time limit, no SM-2) is in scope
- **Open sign-up** — invite-only by design; prevents abuse on self-hosted instance

## Context

- Design document at `docs/design.md` (v0.4) is the authoritative spec for data model, tech stack, `.kartex` format, and auth approach
- Monorepo structure: `apps/frontend`, `apps/backend`, `packages/shared` (Zod schemas as single source of truth for types)
- Typst WASM (typst.ts) is a required dependency in v1 — some target users will have cards with `#typst` blocks
- Target deployment: personal server or home lab, 2-5 concurrent users, no high-scale requirements
- Primary users are students studying for exams; the `.kartex` import flow is important for getting existing study material into the system quickly

## Constraints

- **Tech stack**: pnpm monorepo, React + Vite + TypeScript + shadcn/ui, Hono backend, Prisma + PostgreSQL 16, Nginx — fixed per design doc
- **Auth**: JWT in httpOnly cookies, invite-code registration only — no open sign-up
- **Spaced repetition**: SM-2 algorithm specifically — interval and ease factor per `docs/design.md § 9`
- **Deployment**: Docker Compose — must run with `docker compose up -d` after `.env` setup
- **Data types**: Shared Zod schemas in `packages/shared` must be the single source of truth — no type drift between frontend and backend

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Hono for backend | Lightweight, TypeScript-native, shares type ecosystem with frontend, easy Anthropic SDK path for future AI | — Pending |
| shadcn/ui components | Copy-paste into project (not npm dep) — full styling control without fighting a library | — Pending |
| Typst WASM in v1 | Users have existing cards with `#typst` math blocks; KaTeX alone is insufficient | — Pending |
| Invite-only registration | Small deployment, no open sign-up — prevents unauthorized access on self-hosted instance | — Pending |
| httpOnly JWT cookies | Protects tokens from XSS; access token 15 min + refresh token 30 days | — Pending |
| Videos as external links only | No self-hosted video storage needed; simplifies Docker volumes; YouTube/Vimeo embeds sufficient | — Pending |
| PostgreSQL 16 | Robust relational storage; Prisma provides type-safe access; arrays for card tags | — Pending |
| Tests per phase (Option A) | Each phase ships tests for its own code — unit tests for pure logic (SM-2, parser), component/integration tests for critical paths. Vitest is the runner (Vite-native). Applied starting Phase 3. | — Active |
| ESLint + Prettier as baseline | Linting (ESLint flat config + typescript-eslint) and formatting (Prettier) installed as cross-cutting baseline before Phase 3. `yarn lint` and `yarn format` run across all workspaces. | — Active |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-25 after initialization*
