# Phase 1 — Walking Skeleton

**Skeleton goal:** Thinnest end-to-end slice proving the stack works before Phase 2 builds on it.

## What the Skeleton Proves
- [ ] Monorepo resolves cross-workspace TypeScript imports (packages/shared → backend + frontend)
- [ ] Prisma connects to PostgreSQL and runs migrations
- [ ] Hono backend serves a health endpoint and static React build
- [ ] React Router renders /login with JWT cookie auth
- [ ] Docker Compose starts the full stack from a single command

## Architectural Decisions (locked for all subsequent phases)

| Decision | Value | Rationale |
|----------|-------|-----------|
| Package manager | Yarn (classic, 1.x) | Docker-friendly; PnP avoided (D-04) |
| Workspace protocol | `workspace:*` | Cross-package deps via yarn workspaces |
| Backend framework | Hono + @hono/node-server | TypeScript-native, lightweight, Edge-compatible |
| JWT library | jose 5.x | Pure ESM, no native deps; Docker Alpine safe |
| Password hashing | bcryptjs | No native bindings; Docker Alpine safe |
| Static file serving | Hono serveStatic (from ./public) | Single container (D-06); no Nginx in Docker (D-05) |
| Proxy in production | External Nginx Proxy Manager | Not in docker-compose.yml (D-05) |
| Frontend builder | Vite 5.x + @vitejs/plugin-react | Standard; Vite output copied to backend public/ |
| UI components | shadcn/ui (neutral, CSS vars, Tailwind v3) | Per D-15; installed via npx shadcn@latest |
| ORM | Prisma 5.x + @prisma/client | Schema at apps/backend/prisma/schema.prisma |
| Database | postgres:16-alpine (Docker) | Healthcheck gated backend startup |
| Auth storage | httpOnly cookies (access_token + refresh_token) | XSS-safe; SameSite=Strict in prod, Lax in dev |
| Admin bootstrap | Env vars ADMIN_USERNAME + ADMIN_PASSWORD (D-01) | Idempotent seed on startup (D-03) |
| First invite code | Printed once to stdout on fresh install (D-02) | Admin reads via docker compose logs backend |
| Route guards | React Context (AuthProvider) + ProtectedRoute + AdminRoute | GET /api/auth/me on mount to hydrate |
| Docker Compose | Production-only; backend + db; no proxy service (D-05, D-07) | External NPM provides TLS |
| Backend port | Configurable via BACKEND_PORT env var (default 3000) | Direct exposure for NPM proxy |

## Directory Layout (established in Phase 1)

```
kartex/
├── package.json                    # Yarn workspace root (workspaces: ["apps/*", "packages/*"])
├── yarn.lock
├── .yarnrc.yml                     # nodeLinker: node-modules (Yarn Berry compatibility)
├── .env.example
├── docker-compose.yml
├── .gitignore
│
├── apps/
│   ├── backend/
│   │   ├── package.json            # name: @kartex/backend
│   │   ├── tsconfig.json
│   │   ├── Dockerfile              # Multi-stage: build frontend → build backend → production
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # All models (User, InviteCode, RefreshToken, Deck, Card, ...)
│   │   │   └── migrations/         # Created by: prisma migrate dev --name init
│   │   └── src/
│   │       ├── index.ts            # Entrypoint: CORS + rate limit + routes + serveStatic + seed
│   │       ├── lib/
│   │       │   ├── prisma.ts       # Singleton PrismaClient
│   │       │   ├── jwt.ts          # signToken / verifyToken (jose)
│   │       │   └── seed.ts         # seedAdminIfNeeded() — D-01, D-02, D-03
│   │       ├── middleware/
│   │       │   ├── auth.ts         # JWT verification middleware
│   │       │   └── rateLimit.ts    # In-memory rate limiter
│   │       └── routes/
│   │           ├── auth.ts         # POST /register /login /logout /refresh + GET /me
│   │           └── admin.ts        # GET /users PATCH /users/:id POST /invite-codes DELETE /invite-codes/:id
│   │
│   └── frontend/
│       ├── package.json            # name: @kartex/frontend
│       ├── tsconfig.json
│       ├── vite.config.ts          # path alias @/ + @kartex/shared resolver + /api proxy
│       ├── tailwind.config.ts      # darkMode: 'class'; content: src/**
│       ├── postcss.config.js
│       ├── components.json         # shadcn/ui config (neutral, CSS variables)
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx             # React Router v6 route tree
│           ├── index.css           # Tailwind base + shadcn CSS variables
│           ├── components/
│           │   ├── ui/             # shadcn/ui copies (button, input, form, label, card, table, sonner)
│           │   ├── AppShell.tsx    # 240px sidebar + Outlet
│           │   ├── ProtectedRoute.tsx
│           │   └── AdminRoute.tsx
│           ├── context/
│           │   └── AuthContext.tsx  # AuthProvider + useAuth()
│           ├── lib/
│           │   └── api.ts           # fetch wrapper with silent refresh + concurrent queue
│           └── pages/
│               ├── LoginPage.tsx
│               ├── RegisterPage.tsx
│               └── AdminPage.tsx
│
└── packages/
    └── shared/
        ├── package.json            # name: @kartex/shared; exports: ./src/index.ts
        ├── tsconfig.json
        └── src/
            ├── index.ts
            └── schemas/
                ├── user.ts         # UserSchema, UserRole enum (ADMIN | USER)
                ├── auth.ts         # LoginSchema, RegisterSchema
                └── inviteCode.ts   # InviteCodeSchema
```

## Skeleton Deliverables

| Deliverable | Plan | Evidence |
|-------------|------|---------|
| yarn install succeeds (no errors) | 01-01 | `yarn install` exit 0 |
| `yarn typecheck` passes all workspaces | 01-01 | `yarn typecheck` exit 0 |
| Vite build and tsc build succeed | 01-01 | build artifacts in dist/ |
| `docker compose up -d` starts healthy | 01-01 | `docker compose ps` shows "Up" |
| POST /api/auth/register + login works | 01-02 | curl returns 200 + Set-Cookie with HttpOnly |
| React /login page renders and submits | 01-03 | Browser: login redirects to /dashboard |

## Not Skeleton (deferred to feature plans)

- Admin page UI details (in 01-03, not a stretch goal)
- Invite code UI table (in 01-03)
- Refresh token race condition handling (documented risk in RESEARCH.md — concurrent refresh debounce handled in api.ts but not integration-tested here)
- Dark mode toggle (OS preference via Tailwind `class` strategy; no toggle in Phase 1)
- TLS / Nginx (external NPM; deferred to Phase 6 for Docker Compose finalization)
