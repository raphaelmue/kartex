---
phase: 13-documentation
reviewed: 2026-06-04T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - README.md
  - docs/design.md
  - docs/kartex-format.md
findings:
  critical: 3
  warning: 5
  info: 3
  total: 11
status: issues_found
---

# Phase 13: Code Review Report

**Reviewed:** 2026-06-04
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Three documentation files were reviewed against the live codebase: `README.md`, `docs/design.md`, and `docs/kartex-format.md`. The kartex-format spec is accurate and well-written. However, both `README.md` and `docs/design.md` contain factual inaccuracies that directly contradict the running code — most critically around the `ALLOWED_ORIGIN` default value, which if followed literally will break CORS in a fresh Docker deployment, and a missing security warning about the `POST /api/auth/refresh` and `POST /api/auth/logout` endpoints being unprotected. The design doc also omits two auth endpoints (`GET /me`, `PATCH /me`) that are part of the public contract. Study-mode naming is inconsistent between the design doc and the implementation.

---

## Critical Issues

### CR-01: README documents a wrong `ALLOWED_ORIGIN` default — will silently break CORS on fresh deploys

**File:** `README.md:88`
**Issue:** The Configuration table states `ALLOWED_ORIGIN` defaults to `http://localhost:3000`. The actual default baked into the backend code (`apps/backend/src/index.ts:44`) is `http://localhost:5173`, and the `docker-compose.yml` fallback (line 13) is also `http://localhost:5173`. A developer who omits `ALLOWED_ORIGIN` from their `.env` and trusts the README table will find the browser's requests blocked by CORS, since the SPA in development runs on port 5173 (Vite) while the backend uses 5173 as its fallback. The `.env.example` sets `http://localhost:3000`, adding a third conflicting value. These three sources (README, docker-compose fallback, backend hardcoded fallback) do not agree — a developer cannot determine the correct production default from docs alone.

**Fix:** Decide on a single canonical default (`http://localhost:3000` for production Docker; `http://localhost:5173` for local dev) and make all three sources consistent. At minimum, update the README table to reflect the `docker-compose.yml` fallback and add a note distinguishing the dev vs. prod cases:
```
| `ALLOWED_ORIGIN` | `http://localhost:3000` | Origin for CORS. In Docker Compose the default fallback is `http://localhost:5173` (Vite dev port). Set to your domain in production. |
```
And align `apps/backend/src/index.ts` line 44's hardcoded fallback with the docker-compose fallback.

---

### CR-02: `docs/design.md` §13 Security — incorrect claim that only `/api/auth/login` is exempt from JWT

**File:** `docs/design.md:467`
**Issue:** The security section states "All API endpoints require a valid JWT (except `/api/auth/login`)". This is factually wrong in two ways:
1. `/api/auth/register`, `/api/auth/logout`, and `/api/auth/refresh` are also public (no auth middleware), as confirmed in `apps/backend/src/index.ts` lines 45–48 where `authRouter` is mounted **before** `authMiddleware`.
2. `GET /api/media/:filename` is also public (mounted before `authMiddleware` on line 51 to allow `<img src>` and `<audio src>` without a cookie).

This is a security-relevant documentation error. A developer hardening the deployment (e.g., adding a WAF rule or network policy based on the docs) could incorrectly assume the refresh and logout endpoints require a valid JWT and leave them inadequately rate-limited in their infrastructure layer, or conversely believe media is only accessible to authenticated users and rely on that for data confidentiality.

**Fix:** Replace the claim with an accurate list:
```
- Public endpoints (no JWT required): POST /api/auth/login, POST /api/auth/register,
  POST /api/auth/logout, POST /api/auth/refresh, GET /api/health,
  GET /api/media/:filename (media files served without auth to support <img>/<audio> tags)
- All other /api/* endpoints require a valid JWT access token in the httpOnly cookie.
```

---

### CR-03: `docs/design.md` §5 Auth — undocumented `GET /me` and `PATCH /me` endpoints omitted from the API contract

**File:** `docs/design.md:112-115`
**Issue:** The authentication section lists exactly four endpoints. The live backend (`apps/backend/src/routes/auth.ts` lines 211 and 229) also exposes `GET /api/auth/me` (returns current user profile) and `PATCH /api/auth/me` (updates `studyMode`). These are part of the public API and are called by the frontend's settings page. Omitting them from the design doc means:
- New contributors have an incomplete API contract to work from.
- The `PATCH /me` endpoint is the only way to update `studyMode`, which affects SM-2 interval multipliers — this is a meaningful functional omission.

**Fix:** Add both endpoints to the auth section:
```
GET  /api/auth/me        ← returns authenticated user profile (JWT required)
PATCH /api/auth/me       ← updates studyMode: normal | intensive | exam_prep (JWT required)
```

---

## Warnings

### WR-01: README tech stack table claims `yarn workspaces`; CLAUDE.md claims `pnpm workspaces` — monorepo tool is ambiguous in docs

**File:** `README.md:19`
**Issue:** `README.md` line 19 and `docs/design.md` line 16 both correctly state `yarn workspaces (yarn@4.15.0)`, which matches `package.json` (`"packageManager": "yarn@4.15.0"`). However, `CLAUDE.md` line 16 (the project's own AI instructions file) states `pnpm workspaces`. This is a documentation inconsistency at the project-instructions level. While `README.md` is correct, the conflict could mislead contributors relying on `CLAUDE.md` to set up their dev environment (e.g., running `pnpm install` instead of `yarn install`).

**Fix:** Update `CLAUDE.md` line 16 to `yarn workspaces (yarn@4.15.0)` to match the actual toolchain.

---

### WR-02: `docs/design.md` §9 Study Modes table — "Exam Mode" description is misleading

**File:** `docs/design.md:380`
**Issue:** The study modes table describes "Exam Mode" as "Time limit, progress not saved." This is half-accurate: progress is indeed not saved (confirmed in `useStudySession.ts` line 66: `// T-4-04: Exam mode skips POST /api/study/rate entirely`). However, the table omits that the three actual configurable study modes in the backend (`normal`, `intensive`, `exam_prep`) are **per-user SM-2 multipliers** controlled via `PATCH /api/auth/me`, and are completely separate from the front-end "Exam Mode" session type. The table conflates "Exam Mode" (a session type with a timer, no progress saved) with "exam_prep" (an SM-2 interval multiplier of 0.25x). A developer reading the table cannot understand that there are two orthogonal axes: session type (sr/deck/exam) and SM-2 speed multiplier (normal/intensive/exam_prep).

**Fix:** Add a note distinguishing session types from SM-2 multipliers, and add a second table or section covering the three SM-2 user modes (`normal`, `intensive`, `exam_prep`) with their multiplier values.

---

### WR-03: `docs/design.md` §12 Docker Compose snippet — `ALLOWED_ORIGIN` default differs from `docker-compose.yml`

**File:** `docs/design.md:424`
**Issue:** The Docker Compose YAML snippet in the design doc (line 424) shows `ALLOWED_ORIGIN: ${ALLOWED_ORIGIN:-http://localhost:5173}`. This matches the actual `docker-compose.yml`. However, the deployment note at line 460 says "Available at http://localhost:3000", which is the backend port, not the CORS origin. When a developer does a fresh deploy without setting `ALLOWED_ORIGIN`, the CORS origin defaults to 5173. If they follow the "open http://localhost:3000" instruction and the browser SPA is served from port 3000 (which it is in the Docker Compose production setup), then requests from port 3000 will be blocked by CORS since the fallback is 5173. The embedded Docker Compose snippet is therefore internally inconsistent for the production single-container deployment scenario.

**Fix:** Clarify that in the Docker Compose production setup (both backend and SPA served from port 3000), `ALLOWED_ORIGIN` should be set to `http://localhost:3000`. The `5173` fallback is a Vite dev-server artifact and should not appear as the docker-compose default for production.

---

### WR-04: `docs/kartex-format.md` §6 — parsing rule table claims comments are stripped "globally" but does not warn about `#typst` interaction inside indented lines

**File:** `docs/kartex-format.md:249`
**Issue:** The comment stripping rule states lines starting with `#` (excluding `#typst`) are removed before parsing. The actual parser (`packages/shared/src/lib/kartex-parser.ts` lines 27–41) strips lines where the first non-whitespace character is `#` and the line is not a field assignment. However, the documentation does not warn that a line beginning with `#` (e.g., a Python `# comment` inside a code block embedded in a card field value) will be stripped if it appears as a standalone indented continuation line — because the parser only exempts field assignment lines (`front:`, `back:`, etc.), not arbitrary content lines. A Python docstring or shell script snippet with a leading `#` in the continuation value of a `back:` field **would not be stripped** because those lines are continuations of a field value (the parser collects them as-is in `parseFields`). However, this nuance (that comment stripping only applies to standalone lines before the parser enters a field) is entirely absent from the spec. Users generating `.kartex` files programmatically may be confused.

**Fix:** Add a clarification to the comment stripping rule:
```
Comment stripping applies only to standalone lines (lines that are not continuation
lines within a front: or back: field value). Code examples with leading # inside
a back: field are preserved correctly.
```

---

### WR-05: `README.md` Prerequisites section omits `node` requirement for the JWT secret generation command

**File:** `README.md:29-30`
**Issue:** The Prerequisites section states "No other tools needed on the host (everything runs in containers)." However, step 3 of Quick Start (line 59) instructs the user to run `node -e "..."` to generate `JWT_SECRET`. This requires Node.js on the host. A user on a fresh machine without Node.js installed cannot follow the instructions as written. The omission is a minor but direct contradiction within the same document.

**Fix:** Either change the prerequisite note to say "Node.js is optional but recommended for secret generation", or provide an alternative command that does not require Node.js (e.g., `openssl rand -hex 32`).

---

## Info

### IN-01: `docs/design.md` §4 Architecture diagram — omits `Media` model owner relation

**File:** `docs/design.md:238-247`
**Issue:** The Prisma schema excerpt in the design doc includes the `Media` model with `ownerId String` but there is no corresponding `owner User @relation(...)` line and no back-relation on the `User` model. The actual `schema.prisma` also omits the relation (no `@relation` on `Media.ownerId` and no `media Media[]` on `User`). This means `Media` has a dangling foreign-key-by-convention that Prisma cannot traverse as a typed relation. The design doc faithfully reproduces the schema but does not note this intentional omission or explain that media ownership is enforced at the application layer rather than via Prisma relations. This is a minor documentation gap that could confuse a developer trying to query "all media owned by user X" via Prisma.

**Fix:** Add a note below the `Media` model in the design doc explaining that the `ownerId` field is an application-level ownership reference, not a Prisma relation, and that media ownership checks are performed in route handlers.

---

### IN-02: `docs/kartex-format.md` §4 — `tags` field described as supporting "block YAML list syntax" but example only shows inline syntax

**File:** `docs/kartex-format.md:136-140`
**Issue:** The card fields section says `tags` accepts "YAML list syntax" with "both formats valid" and then only demonstrates the inline `[a, b]` syntax. The deck header section (line 59) says it accepts "both inline (`[a, b, c]`) and block YAML list syntax" but also only shows inline examples. No example of block YAML list syntax (the multi-line `- item` form) is shown anywhere in the document. While the claim is technically true (the parser passes the value through `yaml.parse()`), the absence of any example could mislead users into writing block syntax for card-level tags, which the single-line `tags:` regex match in the parser (`/^tags:\s*(.+)$/m`) would not capture correctly for multi-line block form.

**Fix:** Either add an example showing block YAML list syntax working, or remove the claim that block YAML list syntax is supported for card-level tags and restrict it to deck-level tags only (where YAML parsing happens on the full header block and multi-line values would work).

---

### IN-03: `docs/design.md` — version label "v0.4" in heading but no versioning policy documented

**File:** `docs/design.md:2`
**Issue:** The document is labelled "Design Document v0.4" but there is no changelog, version history, or policy explaining what increment triggers a version bump. This is a minor maintainability concern — as the project evolves, developers have no way to determine whether v0.4 is current without comparing the document to the code.

**Fix:** Either remove the version number from the heading (since git history serves as version control), or add a one-line changelog section at the bottom noting what changed in v0.4 vs v0.3.

---

_Reviewed: 2026-06-04_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
