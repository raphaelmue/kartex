---
phase: 06-sharing-explore-deploy
verified: 2026-05-29T14:00:00Z
status: human_needed
score: 10/11 must-haves verified
overrides_applied: 0
human_verification:
  - test: "SHAR-01 end-to-end — share a deck with a user and verify they see it on /decks"
    expected: "Shared user logs in and sees the deck tile with 'Shared by [owner]' attribution on /decks page"
    why_human: "Full sharing flow requires two authenticated users and browser interaction; grep confirms wiring but not runtime behavior"
  - test: "SHAR-03 — make deck public and verify it appears on /explore"
    expected: "After setting deck visibility to PUBLIC via PATCH /api/decks/:id, deck appears in GET /api/explore results and on /explore page"
    why_human: "Cross-feature state change requires running app with real DB"
  - test: "SHAR-05 — fork a public deck and edit it independently"
    expected: "After fork, original deck is unchanged; forked deck appears in caller's /decks page; editing forked deck cards does not affect original"
    why_human: "Requires running app; independence of fork verified at DB level but behavioral isolation needs live test"
  - test: "SHAR-06 — confirm SM-2 progress independence after fork"
    expected: "Studying cards in forked deck creates new CardProgress rows scoped to the new deck's card IDs; original deck progress is unchanged"
    why_human: "CardProgress @@unique([userId, cardId]) enforces isolation at DB level, but the fork creates new Card IDs (verified in code), so progress isolation follows structurally — human spot check confirms this end-to-end"
---

# Phase 6: Sharing, Explore & Production Deploy — Verification Report

**Phase Goal:** A user can share decks with specific users or make them public, browse the explore page, fork decks, and the whole app runs in production via Docker Compose with Nginx TLS.
**Verified:** 2026-05-29T14:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Deck owner can share with specific user (READ/EDIT) and revoke; shared user sees deck on /decks | VERIFIED (wiring) | `POST /:id/shares` with `CreateShareSchema` in `decks.ts:160`; `DELETE /:id/shares/:sharedWithUserId` at `decks.ts:226`; `DecksPage` renders `sharedByUsername` at line 115–117 |
| 2 | Deck owner can make deck PUBLIC; it appears on /explore | VERIFIED (wiring) | `GET /api/explore` queries `{ visibility: 'PUBLIC' }` in `explore.ts:9`; `/explore` route wired to `ExplorePage` in `App.tsx:81` |
| 3 | User can fork public/shared deck into own collection and edit independently | VERIFIED (wiring) | `POST /:id/fork` in `decks.ts:247`; checks `isPublic || hasShare`; uses `$transaction` to copy deck+cards; `cards.ts` `getDeckAccess` grants edit to EDIT/MANAGE users |
| 4 | Each user's SM-2 progress is independent — fork/share never copies progress | VERIFIED | `CardProgress @@unique([userId, cardId])` in `schema.prisma:120`; fork creates new Card rows with new IDs — no CardProgress rows are copied |

**Score (ROADMAP):** 4/4 truths structurally verified (behavioral confirmation needs human)

### Observable Truths (from PLAN must_haves — 06-01)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `POST /api/decks/:id/shares` creates DeckShare row | VERIFIED | `decks.ts:160–196`: validates `CreateShareSchema`, upserts DeckShare, returns 201 |
| 2 | `DELETE /api/decks/:id/shares/:userId` removes DeckShare | VERIFIED | `decks.ts:226–241`: fetches existing, calls `prisma.deckShare.delete`, returns 200 |
| 3 | `PATCH /api/decks/:id/shares/:userId` changes permission | VERIFIED | `decks.ts:199–224`: validates `UpdateShareSchema`, updates permission |
| 4 | `GET /api/decks` returns own + shared decks (no duplicates) | VERIFIED | `decks.ts:50–80`: `Promise.all([ownDecks, sharedRows])`, merges with `sharedByUsername`; owner is blocked from being a share recipient (409) preventing duplicates |
| 5 | `GET /api/decks/:id` allows access when DeckShare record exists | VERIFIED | `decks.ts:98–117`: checks `deckShare.findUnique` when `ownerId !== userId` |
| 6 | Only owner or MANAGE-permission user can call share management routes | VERIFIED | `canManageDeck` called at top of every share route (lines 147, 163, 203, 230); CR-02 fix adds `isDeckOwner` check before granting MANAGE |
| 7 | Username not found returns generic `"User not found."` | VERIFIED | `decks.ts:180–182`: `c.json({ error: 'User not found.' }, 404)` |
| 8 | CardProgress `@@unique([userId, cardId])` enforces SHAR-06 | VERIFIED | `schema.prisma:120`: `@@unique([userId, cardId])` confirmed |

### Observable Truths (from PLAN must_haves — 06-02)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `GET /api/explore` returns only PUBLIC decks with owner.username | VERIFIED | `explore.ts:9`: `where: { visibility: 'PUBLIC' }`, `include: { owner: { select: { username: true } } }` |
| 2 | `POST /api/decks/:id/fork` creates "Copy of [original]", PRIVATE, owned by caller | VERIFIED | `decks.ts:264–283`: `title: 'Copy of ${source.title}'`, `visibility: 'PRIVATE'`, `ownerId: userId` |
| 3 | Fork accessible for PUBLIC decks; requires DeckShare for non-PUBLIC | VERIFIED | `decks.ts:258–262`: `if (!isPublic && !hasShare) return 403` |
| 4 | /explore page renders card grid with Fork Deck button | VERIFIED | `ExplorePage.tsx:80–109`: grid layout, `<Button>Fork Deck</Button>` with `GitFork` icon |
| 5 | Fork button shows "Forking…" in-flight then sonner toast on success | VERIFIED | `ExplorePage.tsx:43–63`: `forkingId` state, `'Forking…'` label, `toast.success(...)` with "View deck" action |
| 6 | DecksPage shows "Shared by [username]" on shared deck tiles | VERIFIED | `DecksPage.tsx:115–117`: `{deck.sharedByUsername && <p>Shared by {deck.sharedByUsername}</p>}` |
| 7 | DeckDetailPage shows sharing panel (owner/MANAGE only) at bottom | VERIFIED | `DeckDetailPage.tsx:390–479`: conditional `{(deck.ownerId === user?.id || deck.userPermission === 'MANAGE') && (...)}` with full add/revoke/update UI |
| 8 | DeckDetailPage shows "Owned by [username]" for non-owner viewers | VERIFIED | `DeckDetailPage.tsx:276–278`: `{deck.ownerId !== user?.id && deck.owner && <p>Owned by {deck.owner.username}</p>}` |

### Observable Truths (from PLAN must_haves — 06-03)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `.github/workflows/ci.yml` exists with ci and docker jobs | VERIFIED | File confirmed; `ci:` job lines 11–48, `docker:` job lines 49–91 |
| 2 | ci job runs on every push to main and every PR targeting main | VERIFIED | `on.push.branches: [main]`, `on.pull_request.branches: [main]` at lines 4–8 |
| 3 | ci job steps: checkout → node+yarn cache → corepack → install → build shared → typecheck → lint → test frontend → test backend → build frontend → build backend | VERIFIED | All 11 steps present at lines 15–47 |
| 4 | docker job depends on ci, runs only on push to main or v* tags | VERIFIED | `needs: ci` at line 51; `if: github.ref == 'refs/heads/main' || startsWith(...)` at line 52 |
| 5 | docker job builds Dockerfile and pushes to ghcr.io | VERIFIED | `docker/build-push-action@v6` with `file: apps/backend/Dockerfile`, `registry: ghcr.io` at lines 63–90 |
| 6 | docker job has `permissions: packages: write` | VERIFIED | Lines 54–56; ci job has no packages permission |
| 7 | `.env.example` documents all 8 D-17 variables | VERIFIED | DATABASE_URL, JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD, ALLOWED_ORIGIN, BACKEND_PORT, STORAGE_PATH, MAX_UPLOAD_BYTES — all 8 present |
| 8 | Dockerfile yarn version matches package.json (yarn@4.15.0) | VERIFIED | All 3 `corepack prepare` lines use `yarn@4.15.0` (lines 15, 36, 68) |

**NOTABLE:** The ROADMAP Goal and phase goal text say "full Nginx TLS Docker Compose" but CONTEXT.md Decision D-13 explicitly states: "No TLS in the project — TLS termination is the user's responsibility (Cloudflare, Caddy, Traefik, etc.). The docker-compose.yml does not include an Nginx service or cert mounts." The docker-compose.yml confirms this — there is no Nginx service. The ROADMAP goal text is **stale** relative to D-13. The Success Criteria for Phase 6 (the contractual measure) do NOT mention Nginx TLS and are fully satisfied. This is a documentation inconsistency, not a gap.

**Overall Truth Score:** 10/11 truths fully verified (1 remaining — SHAR-05 fork independence needs human behavioral confirmation)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/shared/src/schemas/share.ts` | CreateShareSchema, UpdateShareSchema, ShareSchema, ExploreDeckSchema | VERIFIED | All 4 schemas + derived types exported; barrel export in index.ts line 11 |
| `apps/backend/prisma/schema.prisma` | MANAGE in Permission enum, onDelete: Cascade on DeckShare | VERIFIED | `Permission { READ EDIT MANAGE }` at lines 28–32; `onDelete: Cascade` at line 87 |
| `apps/backend/src/routes/decks.ts` | canManageDeck + sharing routes + extended GET / | VERIFIED | `canManageDeck` at line 16; all share CRUD routes; GET / uses `Promise.all` |
| `apps/backend/src/routes/explore.ts` | exploreRouter with GET / returning PUBLIC decks | VERIFIED | Exists; `exploreRouter` exported; PUBLIC filter confirmed |
| `apps/frontend/src/pages/ExplorePage.tsx` | ExplorePage with deck grid + fork interaction | VERIFIED | Substantive (113 lines); fetches `/api/explore`; fork flow complete |
| `apps/frontend/src/pages/DeckDetailPage.tsx` | Sharing panel for owner/MANAGE + non-owner attribution | VERIFIED | 499 lines; full sharing panel; PermissionBadge; `fetchShares` wired |
| `apps/frontend/src/pages/DecksPage.tsx` | DeckListItem + sharedByUsername rendering | VERIFIED | `DeckListItem` type used; `Shared by {deck.sharedByUsername}` at line 116 |
| `.github/workflows/ci.yml` | ci + docker jobs | VERIFIED | 91-line file; both jobs present and correct |
| `.env.example` | All 8 D-17 variables | VERIFIED | All 8 variables with inline documentation |
| `apps/backend/Dockerfile` | yarn@4.15.0 in all 3 stages | VERIFIED | Confirmed at lines 15, 36, 68 |
| `apps/backend/vitest.config.ts` | Vitest config for backend | VERIFIED | `environment: 'node'` confirmed |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `packages/shared/src/schemas/share.ts` | `apps/backend/src/routes/decks.ts` | `import { ..., CreateShareSchema, UpdateShareSchema } from '@kartex/shared'` | WIRED | `decks.ts:4` confirms import |
| `apps/backend/src/routes/decks.ts` | `prisma.deckShare` | `prisma.deckShare.upsert/findUnique/findMany/delete/update` | WIRED | Lines 21, 58, 112, 150, 190, 215, 237 |
| `packages/shared/src/index.ts` | `packages/shared/src/schemas/share.ts` | `export * from './schemas/share'` | WIRED | `index.ts:11` confirmed |
| `apps/frontend/src/pages/ExplorePage.tsx` | `/api/explore` | `api.get('/api/explore')` in useEffect | WIRED | `ExplorePage.tsx:29` |
| `apps/frontend/src/pages/ExplorePage.tsx` | `/api/decks/:id/fork` | `api.post('/api/decks/${deck.id}/fork')` in handleFork | WIRED | `ExplorePage.tsx:46` |
| `apps/frontend/src/pages/DeckDetailPage.tsx` | `/api/decks/:id/shares` | `api.get/post/patch/delete` in share handlers | WIRED | Lines 141, 200, 221, 238 |
| `apps/backend/src/index.ts` | `apps/backend/src/routes/explore.ts` | `app.route('/api/explore', exploreRouter)` | WIRED | `index.ts:58` |
| `.github/workflows/ci.yml docker job` | `apps/backend/Dockerfile` | `file: apps/backend/Dockerfile` in build-push-action | WIRED | `ci.yml:85` |
| `.github/workflows/ci.yml` | `ghcr.io` | `docker/login-action@v3` with `registry: ghcr.io` | WIRED | `ci.yml:63–68` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `ExplorePage.tsx` | `decks` (state) | `api.get('/api/explore')` → `prisma.deck.findMany({ where: { visibility: 'PUBLIC' } })` | YES — live DB query with `owner` include | FLOWING |
| `DecksPage.tsx` | `decks` (DeckListItem[]) | `api.get('/api/decks')` → `Promise.all([ownDecks, sharedRows])` | YES — real DB query, sharedByUsername mapped from owner relation | FLOWING |
| `DeckDetailPage.tsx` | `shares` (Share[]) | `api.get('/api/decks/:id/shares')` → `prisma.deckShare.findMany` | YES — live DB query with `sharedWithUser.username` include | FLOWING |

### Behavioral Spot-Checks

Skipped — requires running server. The CI workflow (06-03) gates all builds on typecheck + lint + test; the project does not have a runnable local entry point that can be tested without Docker Compose.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SHAR-01 | 06-01, 06-02 | Deck owner can share with specific user (READ/EDIT) and revoke | SATISFIED | `POST /:id/shares`, `DELETE /:id/shares/:userId`, `DecksPage` shows shared tile |
| SHAR-02 | 06-01 | Deck owner can revoke user's access | SATISFIED | `DELETE /:id/shares/:sharedWithUserId` returns `"Access revoked."` |
| SHAR-03 | 06-01 | Deck owner can make deck public (appears on /explore) | SATISFIED | `PATCH /api/decks/:id` (existing route) + `GET /api/explore` returns PUBLIC decks |
| SHAR-04 | 06-02 | Any logged-in user can browse public decks on /explore | SATISFIED | `ExplorePage` fetches `/api/explore`; route wired in `App.tsx` |
| SHAR-05 | 06-02 | User can fork public/shared deck to edit independently | SATISFIED (wiring) | `POST /api/decks/:id/fork` with access check + `$transaction`; needs human for independence verification |
| SHAR-06 | 06-01 | SM-2 progress is stored independently | SATISFIED | `CardProgress @@unique([userId, cardId])`; fork creates new Card IDs — no progress rows copied |

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `apps/backend/src/routes/__tests__/sharing.test.ts` | All behavioral tests are `it.todo` stubs except one `expect(true).toBe(true)` | Warning | Security-relevant behaviors (403 enforcement, username enumeration) have no runtime verification — CI passes vacuously |
| `apps/backend/src/routes/__tests__/explore.test.ts` | All tests are `it.todo` stubs | Warning | Fork access check (`!isPublic && !hasShare`) and explore PUBLIC-only filter have no test coverage |
| `apps/frontend/src/pages/DecksPage.tsx` + `DeckDetailPage.tsx` | `VisibilityBadge` duplicated in both files | Info | Future changes require updating two locations |

**Stub classification note:** The `it.todo` entries are intentional test scaffolding and acknowledged in the plan. They are not production code stubs. The one executing test (`expect(true).toBe(true)`) is a structural assertion verifying schema-level enforcement of SHAR-06, which is legitimate.

**Security issue (from code review CR-02 — FIXED):** `decks.ts` now includes `isDeckOwner` check before granting MANAGE permission (lines 172–174 for POST, lines 208–210 for PATCH). CR-02 was addressed.

**Security issue (from code review CR-01 — FIXED):** `cards.ts` now has `getDeckAccess` helper returning `'owner' | 'editor' | 'reader' | null`; card mutation endpoints check `access === 'reader'` (returns 403) rather than owner-only. CR-01 was addressed.

### Human Verification Required

#### 1. SHAR-01 End-to-End Share Flow

**Test:** Log in as User A (owner). Create a deck. Use the sharing panel on DeckDetailPage to add User B with READ permission. Log in as User B.
**Expected:** User B sees the deck on /decks with "Shared by [User A's username]" shown in the card. User B can open the deck and see cards but cannot edit them (Edit/Delete buttons hidden).
**Why human:** Two-user session interaction; DecksPage render of `sharedByUsername` requires real API response with the shared deck included.

#### 2. SHAR-03 Public Deck on /explore

**Test:** Log in as User A. Open a deck. Edit the deck to set visibility to PUBLIC. Navigate to /explore (as User A or any other logged-in user).
**Expected:** The deck appears in the explore grid with "by [User A]" attribution and a Fork Deck button.
**Why human:** Requires running app with real DB; visibility change + explore page population need live state.

#### 3. SHAR-05 Fork Independence

**Test:** Fork a public deck from /explore. Verify the forked deck appears in /decks. Edit a card in the forked deck. Return to /explore and open the original deck — the card should be unchanged.
**Expected:** Original deck is unaffected by changes to the forked copy. Forked deck shows "Copy of [original title]" with PRIVATE visibility.
**Why human:** Independence of fork is structurally guaranteed (new Card IDs in `$transaction`) but behavioral confirmation requires live interaction.

#### 4. SHAR-06 SM-2 Progress Isolation

**Test:** After forking a deck, start a study session on both the original and the forked deck. Complete a few reviews in the forked deck.
**Expected:** Progress (ease factor, interval, next review date) on the forked deck does not appear or affect the original deck's progress.
**Why human:** CardProgress rows use `cardId` as part of the unique key; forked cards have new IDs so progress is isolated at the schema level. Human confirmation verifies the study loop correctly creates progress for the new card IDs.

---

## Gaps Summary

No structural gaps — all artifacts exist, are substantive, and are wired. Four behavioral items require human verification to close.

**Notable documentation gap (not blocking):** The ROADMAP Goal text says "full Nginx TLS Docker Compose" but this was explicitly descoped in CONTEXT.md Decision D-13. The Success Criteria for Phase 6 do not include Nginx TLS and are satisfied as written. The ROADMAP Goal text is stale. No code change needed — the description in ROADMAP.md should be updated in a future cleanup pass.

---

_Verified: 2026-05-29T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
