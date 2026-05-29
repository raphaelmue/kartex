# Phase 6: Sharing, Explore & Production Deploy - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase closes out Kartex v1. It delivers:
1. **Deck sharing** — owners grant READ/EDIT/MANAGE permission to specific users; revoke access; set visibility to PUBLIC
2. **Explore page** — browse all public decks, fork any into your own collection
3. **Fork** — copy a public or shared deck into your own collection (PRIVATE, "Copy of [name]", clean copy)
4. **Production deploy** — finalized `docker-compose.yml`, Dockerfiles (combined backend+frontend image), `.env.example`, deployment README
5. **CI pipeline** — GitHub Actions: typecheck + lint + test + build + Docker build/push to GHCR on `main` / `v*` tags

**In scope:** SHAR-01 through SHAR-06, INFR-01 through INFR-06 (production readiness), CI pipeline (ROADMAP quality policy)

**Out of scope:** TLS termination in the project (user handles externally), Nginx as a project service, dark mode, Prisma 7 migration, tag-based topic filter.

</domain>

<decisions>
## Implementation Decisions

### Permission Model (requires Prisma migration)
- **D-01:** 3-tier permission model — requires adding `MANAGE` to the `Permission` enum and running a migration:
  - `READ` — can study the deck with SM-2 (CardProgress is always per-user), can view cards. Cannot modify anything.
  - `EDIT` — can add/edit/delete cards + study. Cannot manage sharing or delete deck.
  - `MANAGE` — all EDIT capabilities + can grant/revoke access for other users. Cannot delete deck or change visibility (PRIVATE/SHARED/PUBLIC). Owner-only: delete, visibility.
- **D-02:** The Prisma migration adds `MANAGE` to `enum Permission { READ EDIT MANAGE }` in `schema.prisma`.

### Sharing Panel (inside DeckDetailPage)
- **D-03:** Sharing management lives in a **section at the bottom of `DeckDetailPage`** — always visible to the deck owner. Non-owners see a read-only **"Owned by [username]"** attribution note at the top of the page (not the full sharing panel).
- **D-04:** To add a user, the owner types an exact **username** in a text input and submits. The backend validates the user exists and is not already a share recipient. Validation error displayed inline if username not found.
- **D-05:** The sharing section shows a list of current shares (username + permission badge + Revoke button). Permission can be changed inline (READ/EDIT/MANAGE selector per row). MANAGE-tier users also see this section and can manage shares.

### Shared Decks on /decks
- **D-06:** Shared decks (decks shared with you by others) are **mixed into your own `/decks` grid** with a **"Shared by [username]"** badge on the deck tile. The `GET /api/decks` endpoint must return both own decks and decks shared with the current user.
- **D-07:** READ-permission users can study a shared deck using SM-2 (per-user `CardProgress @@unique([userId, cardId])` already enforces isolation — SHAR-06 is free).

### Explore Page
- **D-08:** `/explore` shows all PUBLIC decks across all users in a card grid (same `shadcn Card` grid as `/decks`). Each public deck tile shows: title, description snippet, owner username ("by [user]"), and card count. Fork button on each tile.
- **D-09:** No search or filtering on `/explore` for Phase 6 — small user base makes it unnecessary.

### Fork Behavior
- **D-10:** Forking creates a **clean copy** — no `sourceId` field, no attribution in the database. The fork is independent from the source immediately.
- **D-11:** Forked deck is named **"Copy of [original name]"** and starts with visibility `PRIVATE`. Tags copied from header are preserved.
- **D-12:** `media://` references in forked card content **work as-is** — `GET /api/media/:filename` uses `findFirst({ where: { filename } })` with no ownership check. The same physical file on the Docker volume is served regardless of which deck references it.

### Production Deploy (Plan 06-03)
- **D-13:** **No TLS in the project** — TLS termination is the user's responsibility (Cloudflare, Caddy, Traefik, etc.). The docker-compose.yml does not include an Nginx service or cert mounts.
- **D-14:** **One combined Docker image** — the Hono backend also serves the React SPA's built `/dist` as static files from the root `/`. API routes are at `/api/*`. This means one image: `ghcr.io/[owner]/kartex`.
- **D-15:** The production `docker-compose.yml` has two services: `backend` (the combined image) and `db`. Backend port exposed on host (default 3000, configurable via `BACKEND_PORT`). No frontend service.
- **D-16:** **GitHub Actions CI** — Two jobs in `.github/workflows/ci.yml`:
  - **Job `ci`** (every push/PR): `pnpm install` → build `@kartex/shared` → typecheck all → lint all → test all → build frontend → build backend
  - **Job `docker`** (push to `main` or `v*` tags, depends on `ci`): multi-stage Dockerfile → build + push `ghcr.io/[owner]/kartex` with `latest` (main) or semver tags (releases) via `docker/metadata-action`
- **D-17:** `.env.example` documents all required environment variables: `DATABASE_URL`, `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ALLOWED_ORIGIN`, `BACKEND_PORT`, `STORAGE_PATH`, `MAX_UPLOAD_BYTES`.

### Claude's Discretion
- Exact layout and styling of the sharing section on DeckDetailPage (divider, heading "Shared with", inline form).
- Explore page empty state (no public decks yet).
- Fork button placement on explore deck tile (bottom of card, labeled "Fork").
- Exact Dockerfile structure for the combined image (builder stage builds shared + frontend + backend; runner stage copies backend dist + frontend dist into backend's static serving path).
- How Hono serves static files (e.g. `serveStatic` from `hono/node` or equivalent).
- Deck tile on `/decks` for shared-by-me vs owned-by-me distinction (the VisibilityBadge already exists; add "Shared by [user]" below it for non-owned decks).

### Folded Todos
- **GitHub Actions CI pipeline with Docker build and GHCR push** — folded into Phase 6 Plan 06-03. The ROADMAP quality policy explicitly places CI in Phase 6. The todo defines two jobs (`ci` + `docker`) and the image tagging strategy (`latest` + semver).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Sharing & Data Model
- `docs/design.md` §6 — Prisma schema including `DeckShare`, `Visibility`, `Permission` enums (note: live schema in `apps/backend/prisma/schema.prisma` is the source of truth for current state)
- `docs/design.md` §10 — Sharing & Multi-User: visibility, per-user progress, fork behavior
- `apps/backend/prisma/schema.prisma` — Live schema: `Deck.visibility`, `DeckShare (deckId, sharedWithUserId, permission)`, `Permission { READ EDIT }` (MANAGE must be added), `CardProgress @@unique([userId, cardId])`

### Requirements
- `.planning/REQUIREMENTS.md` §SHAR-01 to SHAR-06 — All 6 sharing requirements
- `.planning/REQUIREMENTS.md` §INFR-01 to INFR-06 — Infrastructure requirements
- `.planning/todos/pending/2026-05-28-github-actions-ci-docker-ghcr.md` — CI pipeline spec (job 1 + job 2 details, tag strategy)

### Frontend Pages & Routes
- `docs/design.md` §11 — Frontend pages: `/decks` (own + shared), `/explore` (public decks), `/settings`
- `apps/frontend/src/App.tsx` — `/explore` wired as `ComingSoon`, `/settings` as `ComingSoon` — both need replacement
- `apps/frontend/src/components/AppShell.tsx` — Nav items already include Explore (Compass icon)

### Existing Code to Extend
- `apps/backend/src/routes/decks.ts` — `GET /api/decks` currently returns only `where: { ownerId: userId }` — must include shared decks
- `apps/backend/src/routes/media.ts` — `GET /api/media/:filename` uses `findFirst({ where: { filename } })` — no ownership check → forked media works as-is
- `apps/frontend/src/pages/DecksPage.tsx` — `VisibilityBadge` component already exists; deck grid pattern established
- `apps/frontend/src/components/AppShell.tsx` — Nav already has Explore link

### Production Deploy
- `docker-compose.yml` — Current compose (backend + db) — finalize with frontend build step and env vars
- `docs/design.md` §12 — Docker Compose template (reference, may differ from current state)
- `apps/backend/Dockerfile` — Does NOT exist yet — must be created in Plan 06-03

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `VisibilityBadge` component (`apps/frontend/src/pages/DecksPage.tsx`): Private/muted · Shared/blue · Public/green — reuse on explore tiles and sharing panel
- `api` wrapper (`apps/frontend/src/lib/api.ts`): all fetch calls must go through this
- shadcn `Card`, `Button`, `Badge`, `Dialog`, `Input`, `Select`, `Table` — all available
- `authMiddleware` (`apps/backend/src/middleware/auth.ts`): apply to all new sharing/explore/fork routes
- `KartexRenderer` — reuse for card preview in explore deck detail (if a preview view is needed)

### Established Patterns
- Backend: `new Hono()` + Zod body validation from `@kartex/shared` + `authMiddleware` + `c.json()` — follow exactly as in `decks.ts`, `import.ts`
- Frontend: page component in `apps/frontend/src/pages/`, hooks in `apps/frontend/src/hooks/`
- Zod schemas in `packages/shared/src/schemas/` — new sharing schemas go here
- `DeckShare @@unique([deckId, sharedWithUserId])` already in schema — use Prisma `upsert` when updating permission for existing share

### Integration Points
- `GET /api/decks` — extend to include decks shared with the user via `DeckShare`
- New sharing routes on `decks.ts`: `POST /api/decks/:id/shares`, `PATCH /api/decks/:id/shares/:userId`, `DELETE /api/decks/:id/shares/:userId`
- New fork endpoint: `POST /api/decks/:id/fork` — creates a new deck (and all cards) owned by the requesting user
- New explore endpoint: `GET /api/explore` — returns all `Visibility.PUBLIC` decks with owner username
- `/explore` route in `App.tsx` — replace `<ComingSoon>` with `<ExplorePage />`
- `/decks` page — adapt to render shared decks mixed in with own decks

</code_context>

<specifics>
## Specific Ideas

- Sharing section heading: "Share this deck" with a separator line above it. Form: `[username input] [Permission select: Read/Edit/Manage] [Add button]`. Below the form: list of current shares as a simple table (Username | Permission | Revoke button).
- "Shared by [username]" on deck tiles: small muted text below the deck title/description, not a badge. The VisibilityBadge still shows (SHARED or PUBLIC).
- Fork toast: "Deck forked — 'Copy of [name]' added to your decks." with a "View deck" link.
- CI job names: `ci` and `docker` matching the todo spec exactly. Use `pnpm` not `yarn` (PROJECT.md says "pnpm workspaces" — but CLAUDE.md scripts use `npm run`. Check actual workspace scripts before coding).

</specifics>

<deferred>
## Deferred Ideas

- **TLS / Nginx in the project** — user handles TLS termination externally (Caddy, Cloudflare, Traefik). Not in scope.
- **Dark mode** (`pending/2026-05-28-add-dark-mode.md`) — UI feature, not Phase 6 scope. Remains in pending todos.
- **Tag-based topic filter** — decided as Option B (future work) in Phase 5 UAT. Remains in pending todos.
- **Prisma 7 migration** — infrastructure upgrade, separate todo, not Phase 6 scope.
- **Search/filter on /explore** — small user base makes it unnecessary in v1. Deferred to v2.
- **Deck preview before forking** — browse the cards in a public deck before deciding to fork. Deferred to v2.
- **/settings page** — currently ComingSoon. Account settings, theme, etc. Out of Phase 6 scope; remains ComingSoon.

### Reviewed Todos (not folded)
- `pending/2026-05-28-add-dark-mode.md` — UI improvement, not Phase 6 sharing/deploy scope. Kept as pending.
- `pending/2026-05-28-migrate-to-prisma-7.md` — infrastructure upgrade, standalone todo.
- `pending/2026-05-28-add-kartex-format-documentation.md` — documentation task, standalone.
- `pending/2026-05-28-evaluate-topic-layer-between-deck-and-cards.md` — decided as Option B in Phase 5 UAT, remains as future work.

</deferred>

---

*Phase: 06-sharing-explore-deploy*
*Context gathered: 2026-05-29*
