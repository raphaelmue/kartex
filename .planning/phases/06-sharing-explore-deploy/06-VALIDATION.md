---
phase: 6
slug: sharing-explore-deploy
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-29
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Sourced from RESEARCH.md §Validation Architecture (2026-05-29).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 (pinned — Vite 5.x incompatibility with Vitest 4.x) |
| **Config file** | `apps/backend/vitest.config.ts` (new — Wave 0) |
| **Quick run command** | `yarn workspace @kartex/frontend test --run` |
| **Full suite command** | `yarn workspace @kartex/frontend test --run && yarn workspace @kartex/backend test --run` |
| **Estimated runtime** | ~20 seconds |

**Note:** Backend integration tests use `hono/testing` in-process client (no running DB required). Frontend vitest config already exists from Phase 3.

---

## Sampling Rate

- **After every task commit:** Run `yarn workspace @kartex/frontend test --run`
- **After every plan wave:** Run `yarn workspace @kartex/frontend test --run && yarn workspace @kartex/backend test --run` (once backend tests added in Wave 1)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 6-01-01 | 01 | 1 | SHAR-01 | IDOR | Share grant stores DeckShare with correct permission | integration | `yarn workspace @kartex/backend test --run` | ❌ W0 | ⬜ pending |
| 6-01-02 | 01 | 1 | SHAR-02 | IDOR | Revoke deletes DeckShare row; non-owner 403 | integration | same | ❌ W0 | ⬜ pending |
| 6-01-03 | 01 | 1 | SHAR-03 | — | Owner can set visibility PUBLIC; PATCH /api/decks/:id accepts visibility field | integration | same | ❌ W0 | ⬜ pending |
| 6-01-04 | 01 | 1 | SHAR-01 | — | MANAGE-permission user can add/remove shares (not just owner) | integration | same | ❌ W0 | ⬜ pending |
| 6-02-01 | 02 | 2 | SHAR-04 | — | GET /api/explore returns only PUBLIC decks with owner username | integration | `yarn workspace @kartex/backend test --run` | ❌ W0 | ⬜ pending |
| 6-02-02 | 02 | 2 | SHAR-05 | — | Fork creates new deck+cards owned by requester; source deck unchanged | integration | same | ❌ W0 | ⬜ pending |
| 6-02-03 | 02 | 2 | SHAR-05 | Forked access | Fork on SHARED deck requires DeckShare record; non-shared deck returns 403 | integration | same | ❌ W0 | ⬜ pending |
| 6-02-04 | 02 | 2 | SHAR-06 | — | GET /api/decks returns own + shared decks; no duplicates | integration | same | ❌ W0 | ⬜ pending |
| 6-03-01 | 03 | 3 | SHAR-01–06 | — | Full CI workflow passes: typecheck + lint + test + build + docker build | manual | `yarn workspace @kartex/frontend test --run && yarn workspace @kartex/backend test --run` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/backend/vitest.config.ts` — Vitest configuration for backend (`environment: 'node'`, `include: ['src/**/__tests__/*.test.ts']`)
- [ ] `apps/backend/src/routes/__tests__/sharing.test.ts` — Integration tests for sharing API (SHAR-01, SHAR-02, SHAR-03, SHAR-04 partial)
- [ ] `apps/backend/src/routes/__tests__/explore.test.ts` — Integration tests for explore + fork (SHAR-04, SHAR-05)
- [ ] `apps/backend/package.json` — add `"test": "vitest"` script

*All Wave 0 files must exist before Wave 1 execution begins.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sharing panel renders for deck owner at bottom of DeckDetailPage | SHAR-01 | DOM/visual — no unit test surface | Open a deck you own; verify "Share this deck" section appears with add-user form |
| Shared deck appears on /decks with "Shared by [user]" text | SHAR-01 | Frontend rendering of shared deck data | Log in as share recipient; open /decks; verify shared deck tile shows attribution |
| /explore grid shows all public decks | SHAR-04 | E2E — requires running backend + DB with data | Set a deck to PUBLIC; log in as another user; open /explore; verify deck appears |
| Fork toast appears and "View deck" navigates correctly | SHAR-05 | Browser interaction | Click "Fork Deck" on /explore; verify sonner toast appears; click "View deck" link |
| CI workflow runs on push to main | INFR | GitHub Actions — requires remote push | Push a commit to main; verify both `ci` and `docker` jobs complete in GitHub Actions |
| GHCR image pushed with correct tags | INFR | Remote registry — requires workflow run | After docker job, verify `ghcr.io/[owner]/kartex:latest` exists in GHCR |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
