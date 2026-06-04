---
phase: 13-documentation
fixed_at: 2026-06-04T00:00:00Z
review_path: .planning/phases/13-documentation/13-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
---

# Phase 13: Code Review Fix Report

**Fixed at:** 2026-06-04
**Source review:** .planning/phases/13-documentation/13-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (3 Critical, 5 Warning)
- Fixed: 8
- Skipped: 0

## Fixed Issues

### CR-01: README documents a wrong `ALLOWED_ORIGIN` default

**Files modified:** `README.md`, `apps/backend/src/index.ts`, `docker-compose.yml`
**Commit:** a0b4324
**Applied fix:** Updated README table description to explain dev (5173) vs prod (3000) distinction. Changed the hardcoded backend fallback in `index.ts` from `5173` to `3000`. Changed the `docker-compose.yml` fallback from `5173` to `3000`. All three sources now agree on `3000` as the canonical production default.

---

### CR-02: `docs/design.md` §13 Security — incorrect JWT exemption claim

**Files modified:** `docs/design.md`
**Commit:** 9d4dbde
**Applied fix:** Replaced the single-exception claim with an accurate bulleted list of all public endpoints: `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/logout`, `POST /api/auth/refresh`, `GET /api/health`, and `GET /api/media/:filename`. Added a second bullet clarifying that all other `/api/*` routes require JWT.

---

### CR-03: `docs/design.md` §5 Auth — undocumented `GET /me` and `PATCH /me` endpoints

**Files modified:** `docs/design.md`
**Commit:** cdc9184
**Applied fix:** Added `GET /api/auth/me` and `PATCH /api/auth/me` to the auth endpoint code block, with annotations indicating JWT is required and that `PATCH /me` updates `studyMode`.

---

### WR-01: CLAUDE.md claims `pnpm workspaces` instead of `yarn workspaces`

**Files modified:** `CLAUDE.md`
**Commit:** 13092ca
**Applied fix:** Updated the Monorepo row in the Technology Stack table from `pnpm workspaces` to `yarn workspaces (yarn@4.15.0)` to match `package.json`, `README.md`, and `docs/design.md`.

---

### WR-02: `docs/design.md` §9 Study Modes table — Exam Mode description is misleading

**Files modified:** `docs/design.md`
**Commit:** b4abe2c
**Applied fix:** Replaced the single "Study Modes" table with two separate sections: "Session Types" (sr/deck/exam — presentation and progress saving behaviour) and "SM-2 User Modes" (normal/intensive/exam_prep — interval multipliers via `PATCH /api/auth/me`). Added a callout note explaining the two axes are orthogonal and commonly confused.

---

### WR-03: `docs/design.md` §12 Docker Compose snippet — `ALLOWED_ORIGIN` default inconsistency

**Files modified:** `docs/design.md`
**Commit:** 1d9cc22
**Applied fix:** Changed the `ALLOWED_ORIGIN` fallback in the design.md Docker Compose snippet from `5173` to `3000` to match the actual `docker-compose.yml` (which was also fixed in CR-01). Added a deployment CORS note explaining that `5173` is the Vite dev port and must not be used as a production default when the backend serves the SPA on port 3000.

---

### WR-04: `docs/kartex-format.md` §6 — comment stripping rule lacks field-value scope clarification

**Files modified:** `docs/kartex-format.md`
**Commit:** 078449c
**Applied fix:** Expanded the "Comment stripping" table row to clarify that stripping applies only to standalone lines (not continuation lines within a `front:` or `back:` field value). Noted explicitly that Python comments and shell script lines inside a `back:` field are preserved correctly.

---

### WR-05: `README.md` Prerequisites omits Node.js requirement for JWT command

**Files modified:** `README.md`
**Commit:** 93ffe83
**Applied fix:** Updated the Prerequisites section to list Node.js as optional with an explanation of when it is needed. Added `openssl rand -hex 32` as an alternative JWT secret generation command for users without Node.js installed.

---

## Skipped Issues

None — all findings were successfully fixed.

---

_Fixed: 2026-06-04_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
