# Phase 6: Sharing, Explore & Production Deploy - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 06-sharing-explore-deploy
**Areas discussed:** Sharing panel, Shared decks on /decks, Fork behavior, Production Nginx / TLS

---

## Folded Todo: GitHub Actions CI pipeline

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — fold it in | CI pipeline becomes part of Phase 6 plan 06-03 | ✓ |
| No — keep as backlog | Leave as standalone todo | |

**Notes:** ROADMAP quality policy explicitly places CI in Phase 6. The todo (`pending/2026-05-28-github-actions-ci-docker-ghcr.md`) defines the two-job structure and GHCR push strategy.

---

## Sharing panel

### Where does the sharing management UI live?

| Option | Description | Selected |
|--------|-------------|----------|
| Section at the bottom of DeckDetailPage | Collapsible or always-visible below card list | ✓ |
| Modal triggered by a "Share" button | Dialog from a button in the deck header | |
| Separate /decks/:id/share route | Dedicated sharing management page | |

**User's choice:** Section at the bottom of DeckDetailPage

---

### How does the owner find a user to share with?

| Option | Description | Selected |
|--------|-------------|----------|
| Username text input — type and submit | Type exact username, backend validates | ✓ |
| Dropdown of all users | Load all users in a dropdown | |

**User's choice:** Username text input

---

### What do non-owners see in the sharing section?

| Option | Description | Selected |
|--------|-------------|----------|
| Nothing — sharing section is owner-only | Non-owners see no sharing UI | |
| Read-only "Owned by [username]" note | Attribution shown to non-owners | ✓ |

**User's choice:** "Owned by [username]" note at the top of the page for non-owners

---

## Shared decks on /decks

### Where do shared decks appear?

| Option | Description | Selected |
|--------|-------------|----------|
| Separate "Shared with me" section | Below own decks, clearly separated | |
| Mixed into own decks grid with "Shared by [user]" badge | All decks in one grid with attribution | ✓ |
| Only accessible via /explore or direct link | Not shown on /decks | |

**User's choice:** Mixed into /decks grid with "Shared by [user]" badge

---

### Can READ-permission users study with SM-2?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — SM-2 progress tracked per user | SHAR-06 already guarantees isolation | ✓ |
| No — READ means view-only | | |

**User's choice:** Yes

---

### Permission tiers

| Option | Description | Selected |
|--------|-------------|----------|
| Keep READ ❱ EDIT (2 tiers, no migration) | Standard approach matching existing schema | |
| Add 3rd tier: READ ❱ EDIT ❱ MANAGE (migration needed) | MANAGE adds ability to grant/revoke shares | ✓ |

**User's choice:** 3-tier model with migration

**Notes:** User initially described 3 tiers: "read/learn, edit, manage all (including sharing)". After clarification, MANAGE = EDIT + grant/revoke access for others. Cannot change deck visibility or delete deck (owner-only).

---

### What can a MANAGE user do that an EDIT user cannot?

| Option | Description | Selected |
|--------|-------------|----------|
| Grant/revoke access for others only | MANAGE = EDIT + share management | ✓ |
| Full sharing management including visibility | MANAGE = EDIT + shares + visibility changes | |

**User's choice:** Grant/revoke access for others only. Deck owner exclusively controls visibility (PRIVATE/SHARED/PUBLIC) and deletion.

---

## Fork behavior

### How is the forked deck named?

| Option | Description | Selected |
|--------|-------------|----------|
| "Copy of [original name]" | Makes fork obvious, no schema change | ✓ |
| Same name as original | Identical title, user renames later | |

**User's choice:** "Copy of [original name]"

---

### Is attribution tracked in the database?

| Option | Description | Selected |
|--------|-------------|----------|
| No — clean copy, no source tracking | No sourceId field, standalone deck immediately | ✓ |
| Yes — add sourceId field to Deck model | Attribution visible on deck detail, requires migration | |

**User's choice:** Clean copy, no sourceId

---

### What visibility does the fork start with?

| Option | Description | Selected |
|--------|-------------|----------|
| Always PRIVATE | Safe default, user changes if desired | ✓ |
| Inherit source visibility | If source is PUBLIC, fork is PUBLIC | |

**User's choice:** Always PRIVATE

---

### Do media files work in forked decks?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — media:// refs work as-is | GET /api/media/:filename has no ownership check | ✓ |
| No — refs may break | | |

**Notes:** Verified by checking `apps/backend/src/routes/media.ts` — GET handler uses `findFirst({ where: { filename } })` without ownerId constraint. Forked card content referencing `media://file.png` resolves correctly.

---

## Production Nginx / TLS

### TLS approach

| Option | Description | Selected |
|--------|-------------|----------|
| User-provided certs | Mount via volume + .env.example | |
| Self-signed certs | Included in Dockerfile + guide | |
| HTTP-only Nginx | No TLS in compose, docs explain how to add | |
| No Nginx in project | TLS handled externally by user | ✓ |

**User's choice:** Nginx setup is not part of the project. TLS is the user's responsibility externally.

---

### Frontend service in production

| Option | Description | Selected |
|--------|-------------|----------|
| Nginx service serving built React SPA on port 80 | Separate nginx:alpine container + /api/* proxy | (initially selected) |
| One combined image: backend serves frontend /dist | Single ghcr.io image, backend is static file server too | ✓ (final) |

**Notes:** User initially picked Nginx frontend service, then chose "one combined image" for CI. Final decision: backend Hono app also serves React SPA's `/dist` as static files. docker-compose.yml has backend + db (no Nginx service). No TLS in compose.

---

### Plan 06-03 scope

| Option | Description | Selected |
|--------|-------------|----------|
| Dockerfiles + compose + .env.example + README + CI | Full production package | ✓ |
| Just CI pipeline + Dockerfiles | Minimal production | |

**User's choice:** Full production package — Dockerfiles (combined image), finalized docker-compose.yml, .env.example, deployment README, GitHub Actions CI.

---

### CI Docker push: one image or two?

| Option | Description | Selected |
|--------|-------------|----------|
| Two images: backend + frontend-nginx | Separate GHCR images per service | |
| One combined image: backend serves frontend /dist | Single ghcr.io/[owner]/kartex image | ✓ |

**User's choice:** One combined image

---

## Claude's Discretion

- Explore page layout beyond the card grid basics
- Explore empty state
- Fork button placement
- Sharing section exact styling (dividers, heading, form layout)
- Combined Dockerfile structure (multi-stage builder/runner)
- How Hono serves static files from /dist

## Deferred Ideas

- TLS / Nginx in the project (user handles externally)
- Dark mode (remains in pending todos)
- Search/filter on /explore (v2)
- Deck preview before forking (v2)
- /settings page (remains ComingSoon)
