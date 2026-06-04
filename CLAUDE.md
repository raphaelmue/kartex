<!-- GSD:project-start source:PROJECT.md -->
## Project

**Kartex** — self-hosted flashcard web application for creating, importing, and studying with multimedia flashcards. Supports rich content (LaTeX/KaTeX math, Typst WASM expressions, images, audio, code), a custom `.kartex` import format, and SM-2 spaced repetition. Deployed via Docker Compose for a small group of 2-5 users with invite-based registration.

**Core value:** A user can open their dashboard, see their due cards, and complete a spaced-repetition study session — that loop must always work.

See `.planning/PROJECT.md` for full context, requirements, and key decisions.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->
## Technology Stack

| Layer | Technology |
|-------|------------|
| Monorepo | yarn workspaces (yarn@4.15.0) |
| Frontend | React + Vite + TypeScript |
| UI Library | shadcn/ui (Radix UI + Tailwind CSS — copy-paste components) |
| Backend | Hono (Node.js, TypeScript) |
| ORM | Prisma |
| Database | PostgreSQL 16 |
| Shared Types | `packages/shared` — Zod schemas (single source of truth) |
| Proxy | Nginx |
| Deployment | Docker Compose |

**Key rendering dependencies:**
- `react-markdown` — Markdown rendering
- `katex` — Inline (`$...$`) and block (`$$...$$`) math
- `typst.ts` — Typst WASM for `#typst` blocks
- `highlight.js` — Code block syntax highlighting

**Monorepo structure:**
```
kartex/
├── apps/frontend/     ← React + Vite + shadcn/ui
├── apps/backend/      ← Hono API + Prisma
│   └── prisma/schema.prisma
└── packages/shared/   ← Zod schemas + derived TypeScript types
```

`packages/shared` is the single source of truth for all data types. Frontend and backend import the same Zod schemas — no type drift possible.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.

**Starting points from design doc:**
- All Zod schemas live in `packages/shared/src/schemas/` — never duplicate type definitions
- Hono routes live in `apps/backend/src/routes/` — one file per resource
- shadcn/ui components are copied into `apps/frontend/src/components/` and customized freely
- JWT stored in `httpOnly` cookie — never in localStorage
- All secrets via `.env` — never hardcoded
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

```
Browser (React SPA)
      │ HTTPS
Nginx (reverse proxy + TLS + static files)
      │ /api/*
Hono Backend (Node.js)
      │ Prisma
PostgreSQL 16
      │
Local Docker Volume (images + audio)
```

**Auth flow:** `POST /api/auth/login` → JWT access token (15 min) + refresh token (30 days) in httpOnly cookies. All endpoints except login/refresh require valid JWT.

**Data model highlights:**
- `User` → owns `Deck[]`, has `CardProgress[]`
- `Deck` → contains `Card[]`, can have `DeckShare[]`
- `CardProgress` → SM-2 state per (user, card) pair — `@@unique([userId, cardId])`
- `Media` → stored on local volume, referenced from card content

**Frontend pages:** `/login`, `/dashboard`, `/decks`, `/decks/:id`, `/decks/:id/learn`, `/explore`, `/import`, `/settings`, `/admin`

See `docs/design.md` for full Prisma schema and architecture diagrams.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found yet. Add skills to `.claude/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:discuss-phase N` — gather context and clarify approach for phase N
- `/gsd:plan-phase N` — create a detailed plan for phase N
- `/gsd:execute-phase N` — execute all plans in phase N
- `/gsd:quick` — for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` — for investigation and bug fixing

**Current status:** See `.planning/STATE.md` and `.planning/ROADMAP.md`

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` — do not edit manually.
<!-- GSD:profile-end -->
