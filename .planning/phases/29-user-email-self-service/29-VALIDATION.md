---
phase: 29
slug: user-email-self-service
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-02
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 (pinned per STATE.md `03-01` — do NOT upgrade to 4.x) |
| **Config file** | `apps/backend/vitest.config.ts` (node), `apps/frontend/vitest.config.ts` (jsdom, `@testing-library/react`) |
| **Quick run command** | `yarn workspace @kartex/frontend test -- SettingsPage` / `yarn workspace @kartex/backend test -- <file>` (confirm exact filename during Wave 0) |
| **Full suite command** | `npm test` (root — runs both workspaces per `package.json`) |
| **Estimated runtime** | targeted workspace runs are fast (~seconds); full `npm test` runs both workspaces (estimate, no measured baseline recorded) |

---

## Sampling Rate

- **After every task commit:** Run the targeted quick command for the workspace touched.
- **After every plan wave:** Run `npm test` (full suite, both workspaces).
- **Before `/gsd-verify-work`:** Full suite must be green.
- **Max feedback latency:** targeted run per commit (seconds); full suite per wave merge.

---

## Per-Task Verification Map

*Task IDs are not yet assigned — planning (step 8) has not run. Rows below are keyed by requirement, sourced from `29-RESEARCH.md` §Validation Architecture. The planner should reconcile these into real `{phase}-{plan}-{task}` IDs when PLAN.md files are created.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | EMAIL-09 | — | `GET /me` returns `email` (null-safe) | structural (`it.todo`) | new stub in `auth-me.test.ts` | ❌ W0 — no existing `auth.ts` test file | ⬜ pending |
| TBD | TBD | TBD | EMAIL-09 | V5 Input Validation | `PATCH /me` accepts `{ email }`, rejects duplicate (409 `EMAIL_TAKEN`), rejects bad format (400) | structural (`it.todo`) + frontend RTL | `it.todo` stubs (backend) + `SettingsPage.test.tsx` new cases | ⚠️ Partial — file exists, needs new cases | ⬜ pending |
| TBD | TBD | TBD | EMAIL-10 | — | No-email Alert renders when `user.email == null`, hidden otherwise | frontend RTL | `SettingsPage.test.tsx` (`getByRole('alert')` / `queryByRole`) | ⚠️ Partial — file exists, needs new cases | ⬜ pending |
| TBD | TBD | TBD | EMAIL-11 | V4 Access Control | `PATCH /users/:id` accepts `{ email }` (admin), same conflict/format handling | structural (`it.todo`) + frontend RTL | `it.todo` stubs (backend) + `AdminPage.test.tsx` new cases | ⚠️ Partial — file exists, needs new cases | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/backend/src/routes/__tests__/auth-me.test.ts` (or similarly named) — create following the `it.todo` stub convention shown in `admin-delete.test.ts` / `admin-mailer.test.ts`
- [ ] `SettingsPage.test.tsx` — add new test cases for the Email Card + Alert banner; extend existing `mockUser` / `mockApiPatch` / `vi.hoisted` setup (add `email` to the hoisted mock user fixture)
- [ ] `AdminPage.test.tsx` — add new test cases for the Edit Email Dialog; extend existing `mockApiGet` / `mockApiPost` / `vi.hoisted` setup (`mockApiPatch` already exists but is currently unused/stubbed at line 33 — needs real assertions)

---

## Manual-Only Verifications

*All phase behaviors have automated verification per RESEARCH.md — no manual-only items identified.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency acceptable (targeted per-commit runs)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
