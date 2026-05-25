---
phase: 1
slug: foundation-auth
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-25
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript compiler (tsc) + Vite build + Prisma validate — no unit test framework in Phase 1 |
| **Config file** | `apps/backend/tsconfig.json`, `apps/frontend/tsconfig.json`, `apps/backend/prisma/schema.prisma` |
| **Quick run command** | `yarn typecheck` |
| **Full suite command** | `yarn typecheck && yarn workspace @kartex/backend prisma validate && yarn workspace @kartex/frontend build && yarn workspace @kartex/backend build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `yarn typecheck`
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| scaffold-ws | 01 | 1 | INFR-01 | — | Workspace packages resolve cross-workspace imports | static | `yarn install && yarn typecheck` | ❌ W0 | ⬜ pending |
| scaffold-prisma | 01 | 1 | INFR-01, INFR-06 | — | Schema validates; no hardcoded secrets | static | `yarn workspace @kartex/backend prisma validate` | ❌ W0 | ⬜ pending |
| scaffold-migrate | 01 | 1 | INFR-01 | — | Initial migration created and applied | static | `test -d apps/backend/prisma/migrations` | ❌ W0 | ⬜ pending |
| scaffold-docker | 01 | 1 | INFR-01, INFR-06 | — | Docker Compose has no hardcoded secrets; uses env vars | static | `grep -E 'JWT_SECRET|DB_PASSWORD' docker-compose.yml \| grep -v '\${' ; test $? -ne 0` | ❌ W0 | ⬜ pending |
| scaffold-frontend | 01 | 1 | INFR-02 | — | Vite build succeeds | static | `yarn workspace @kartex/frontend build` | ❌ W0 | ⬜ pending |
| auth-routes | 02 | 2 | AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05 | — | JWT stored in httpOnly cookie (not JSON body) | static | `grep -n "httpOnly" apps/backend/src/routes/auth.ts` | ❌ W0 | ⬜ pending |
| auth-middleware | 02 | 2 | INFR-03 | — | Auth middleware applied to all non-auth routes | static | `grep -n "authMiddleware\|auth\.ts" apps/backend/src/index.ts` | ❌ W0 | ⬜ pending |
| rate-limit | 02 | 2 | INFR-04 | — | Rate limit applied to login, register, refresh | static | `grep -n "rateLimit" apps/backend/src/routes/auth.ts` | ❌ W0 | ⬜ pending |
| cors | 02 | 2 | INFR-05 | — | CORS has explicit origin, not wildcard `*` | static | `grep -n "origin" apps/backend/src/index.ts \| grep -v "'\*'"` | ❌ W0 | ⬜ pending |
| secrets | 01 | 1 | INFR-06 | — | No hardcoded secrets in source files | static | `grep -rn "secret\|password" apps/ packages/ --include="*.ts" \| grep -v ".env\|process.env\|placeholder"` | ❌ W0 | ⬜ pending |
| admin-routes | 02 | 2 | ADMN-01, ADMN-02, ADMN-03 | — | Admin routes require ADMIN role | static | `grep -n "ADMIN\|admin" apps/backend/src/routes/admin.ts` | ❌ W0 | ⬜ pending |
| frontend-build | 03 | 3 | INFR-02 | — | Frontend builds without TypeScript errors | static | `yarn workspace @kartex/frontend build 2>&1 \| grep -v "warning"; test ${PIPESTATUS[0]} -eq 0` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Wave 0 is embedded in plan 01-01 (monorepo scaffold). The scaffold plan creates:
- [ ] `package.json` root with `workspaces` + `scripts.typecheck`
- [ ] `apps/backend/tsconfig.json` — TypeScript config
- [ ] `apps/frontend/tsconfig.json` — TypeScript config
- [ ] `packages/shared/tsconfig.json` — TypeScript config
- [ ] `apps/backend/prisma/schema.prisma` — Full schema to validate
- [ ] `apps/backend/prisma/migrations/` — Initial migration directory

*No unit test framework installed in Phase 1 — validation is via type-checking, build, and integration spot-checks.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Login → /dashboard redirect works | AUTH-02 | Browser cookie-based session | Visit /login, enter valid credentials, verify redirect to /dashboard |
| Browser refresh keeps user logged in | AUTH-03 | Requires refresh token cookie + /api/auth/me call | Log in, press F5, verify still on dashboard |
| Logout clears session | AUTH-04 | Requires browser interaction | Click "Log out" in sidebar, verify redirect to /login; navigate to /dashboard, verify redirect back to /login |
| Silent token refresh works | AUTH-05 | Requires expired access token + valid refresh token | Wait 15 min or manually expire access token; make an API call and verify it succeeds transparently |
| Refresh token rotation (replay prevention) | AUTH-05 | Hard to fake cookie reuse with curl | After refresh, attempt reuse of old refresh token — must return 401 |
| Full admin workflow | ADMN-01, ADMN-02, ADMN-03 | Multi-step admin UI | Log in as admin, generate invite code, copy it, register new user with it, change role, deactivate account |
| Coming soon pages render correctly | INFR-02 | Visual check | Visit /decks, /import, /explore, /settings — each shows "Coming soon" placeholder |
| docker compose up starts stack | INFR-01 | Docker integration | Run `docker compose up -d`, wait for health, visit http://localhost:{PORT} |
| Invite code is single-use | AUTH-01 | Requires two registration attempts | Register with a code; attempt to register again with the same code — second attempt must fail |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
