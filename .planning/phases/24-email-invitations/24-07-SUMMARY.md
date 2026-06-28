---
phase: 24-email-invitations
plan: "07"
subsystem: backend-admin, frontend-admin, shared-schemas
tags: [smtp-error, i18n, gap-closure, dead-code-removal]
dependency_graph:
  requires: [24-01, 24-02, 24-03, 24-04, 24-05]
  provides: [EMAIL-03, EMAIL-04]
  affects: [apps/backend/src/routes/admin.ts, apps/frontend/src/pages/AdminPage.tsx, packages/shared/src/index.ts]
tech_stack:
  added: []
  patterns: [opaque-error-code, i18n-error-mapping, tdd-red-green]
key_files:
  modified:
    - apps/backend/src/routes/admin.ts
    - apps/frontend/src/pages/AdminPage.tsx
    - apps/frontend/src/locales/en.json
    - apps/frontend/src/locales/de.json
    - apps/frontend/src/pages/__tests__/AdminPage.test.tsx
    - packages/shared/src/index.ts
    - apps/backend/src/routes/__tests__/admin-delete.test.ts
  deleted:
    - packages/shared/src/schemas/inviteCode.ts
decisions:
  - "24-07: SMTP_ERROR opaque code in POST /invites catch block; raw cause logged server-side only (T-24-23 mitigated)"
  - "24-07: Unknown non-ok invite send failures map to admin.inviteSendError (same toast as SMTP_ERROR) — admin always gets actionable signal"
  - "24-07: InviteCode schema deleted; InviteToken is sole invite model as of Phase 23"
metrics:
  duration: "~5 min"
  completed: "2026-06-28"
  tasks: 3
  files: 8
status: complete
---

# Phase 24 Plan 07: SMTP Error Handling + Dead Code Removal Summary

**One-liner:** Replace raw SMTP error leak with opaque SMTP_ERROR code + localized admin toast, and remove the dead InviteCode schema/export left over from Phase 23.

## Objective

Fix UAT Gap 2 (SMTP delivery failure gives no actionable signal) and Gap 3 (dead InviteCode schema/export still present, stale admin-delete test assertion).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Return opaque SMTP_ERROR from POST /invites | 6791322 | admin.ts |
| 2 (RED) | Add failing SMTP_ERROR toast test | 40f94dd | AdminPage.test.tsx |
| 2 (GREEN) | Map SMTP_ERROR + unexpected 500 to inviteSendError | 7e49a8b | AdminPage.tsx, en.json, de.json |
| 3 | Remove dead InviteCode schema and stale test assertion | 0abcff3 | inviteCode.ts (deleted), index.ts, admin-delete.test.ts |

## What Was Built

### Task 1 — Opaque SMTP_ERROR response

In the `POST /api/admin/invites` catch block in `apps/backend/src/routes/admin.ts`:
- Token rollback (`prisma.inviteToken.delete`) preserved unchanged
- Raw error message replaced with `console.error('[admin] Invite email delivery failed:', ...)` to server log
- Response changed from `{ error: (err as Error).message }` to `{ error: 'SMTP_ERROR' }` with status 500
- The 400 `'SMTP not configured.'` guard (not-configured case) is unchanged

### Task 2 — Localized admin toast (TDD: RED→GREEN)

**RED:** Added failing test asserting a 500 `{ error: 'SMTP_ERROR' }` response triggers `toast.error` with the `inviteSendError` string. Test failed as expected (frontend only mapped `SMTP not configured.`).

**GREEN:** 
- Added `admin.inviteSendError` key to `en.json`: "Could not send the invitation email. Check the SMTP settings and try again."
- Added `admin.inviteSendError` key to `de.json`: "Die Einladungs-E-Mail konnte nicht gesendet werden. Bitte überprüfen Sie die SMTP-Einstellungen und versuchen Sie es erneut."
- Updated `handleSendInvite` in `AdminPage.tsx` to map both `errCode === 'SMTP_ERROR'` and the unknown-non-ok fallback to `t('admin.inviteSendError')`
- All 6 AdminPage tests green

### Task 3 — Dead code removal

- Deleted `packages/shared/src/schemas/inviteCode.ts` (InviteCode table dropped in Phase 23; InviteToken is the sole model)
- Removed `export * from './schemas/inviteCode'` from `packages/shared/src/index.ts`
- Removed the `describe('InviteCode FK — structural assertion (ADMIN-01)', ...)` block (lines 44-53) from `apps/backend/src/routes/__tests__/admin-delete.test.ts`
- Fixed cascade todo string on line 10: removed `InviteCode(usedById) →` segment
- `packages/shared` build succeeds; admin-delete test: 4 passed, 10 todo

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All behavior-adding tasks are fully wired.

## Threat Surface Scan

T-24-23 (Information Disclosure — raw SMTP error in 500 body): **mitigated** — backend now returns opaque `SMTP_ERROR` code; real cause is logged server-side only. No new threat surface introduced.

## Verification Results

- `cd apps/frontend && yarn vitest run src/pages/__tests__/AdminPage.test.tsx` — 6/6 passed
- `cd apps/backend && yarn vitest run src/routes/__tests__/admin-delete.test.ts` — 4 passed, 10 todo
- `cd packages/shared && yarn build` — succeeded (no output = success)
- `grep InviteCodeSchema|getInviteCodeStatus apps/ packages/` — no matches
- Pre-existing `InviteRegisterPage.test.tsx` failures confirmed pre-existing (unrelated to this plan)

## Self-Check

- [x] Task 1 commit 6791322 exists in git log
- [x] Task 2 commits 40f94dd (test) and 7e49a8b (feat) exist
- [x] Task 3 commit 0abcff3 exists; `inviteCode.ts` deleted confirmed
- [x] `admin.inviteSendError` present in both en.json and de.json
- [x] No `InviteCode` references in admin-delete.test.ts
- [x] No `InviteCodeSchema` or `getInviteCodeStatus` in apps/ or packages/ source
