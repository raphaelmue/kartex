---
phase: 25-password-reset
plan: "02"
subsystem: ui
tags: [i18n, react, localization, password-reset]

requires:
  - phase: 25-01
    provides: PasswordResetToken schema and Zod types consumed by future pages

provides:
  - 18 auth.* i18n keys for ForgotPasswordPage and ResetPasswordPage in en.json and de.json
  - 3 admin.* i18n keys for AdminPage password reset action in en.json and de.json

affects: [25-04, 25-05]

tech-stack:
  added: []
  patterns:
    - "Both locale files (en.json + de.json) updated atomically in one commit — missing de.json keys fall back to raw key string, not English value (10-05 decision)"

key-files:
  created: []
  modified:
    - apps/frontend/src/locales/en.json
    - apps/frontend/src/locales/de.json

key-decisions:
  - "10-05 enforced: en.json and de.json committed in the same atomic commit to prevent German users from seeing raw key strings"

patterns-established:
  - "i18n parity: every new key added to en.json must be added to de.json in the same commit"

requirements-completed:
  - RESET-01
  - RESET-06

coverage:
  - id: D1
    description: "18 auth.* i18n keys for password reset flow added to en.json (forgotPassword, sendResetLink, resetEmailSent*, resetPassword*, newPassword, resettingPassword, resetError*, resetLink*, resetSuccess, resetPageTitle, forgotPageTitle)"
    requirement: RESET-01
    verification:
      - kind: other
        ref: "node -e \"JSON.parse(require('fs').readFileSync('apps/frontend/src/locales/en.json','utf8'))\" exits 0; grep count for all 9 spot-checked keys = 1"
        status: pass
    human_judgment: false
  - id: D2
    description: "18 auth.* i18n keys added to de.json with German translations"
    requirement: RESET-06
    verification:
      - kind: other
        ref: "node -e \"JSON.parse(require('fs').readFileSync('apps/frontend/src/locales/de.json','utf8'))\" exits 0; grep count for all 6 spot-checked keys = 1"
        status: pass
    human_judgment: false
  - id: D3
    description: "3 admin.* i18n keys (sendPasswordReset, resetNoEmail, resetSentSuccess) added to both en.json and de.json"
    verification:
      - kind: other
        ref: "grep -c sendPasswordReset/resetNoEmail/resetSentSuccess in both files = 1 each"
        status: pass
    human_judgment: false
  - id: D4
    description: "Both locale files committed atomically in a single commit (10-05 decision compliance)"
    verification:
      - kind: other
        ref: "git show eb498b6 --stat confirms both files in same commit (2 files changed, 46 insertions)"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-06-29
status: complete
---

# Phase 25 Plan 02: i18n Keys (en.json + de.json) Summary

**21 new i18n keys for password reset feature added atomically to both en.json and de.json — 18 auth.* keys for ForgotPasswordPage/ResetPasswordPage and 3 admin.* keys for AdminPage password reset action**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-29T11:20:00Z
- **Completed:** 2026-06-29T11:25:00Z
- **Tasks:** 2 (committed as one atomic commit per 10-05 decision)
- **Files modified:** 2

## Accomplishments

- Added 18 new `auth.*` keys to en.json and de.json covering: forgot-password page, send reset link button, email sent confirmation, reset password form, error states, link validity states, success message, and page titles
- Added 3 new `admin.*` keys to en.json and de.json: `sendPasswordReset`, `resetNoEmail`, `resetSentSuccess`
- Both locale files validated as valid JSON after editing
- Atomic commit enforces 10-05 decision: German users never see raw key strings

## Task Commits

Both tasks committed atomically in a single commit (plan requirement):

1. **Task 2.1 + 2.2: Add 21 i18n keys to en.json and de.json** - `eb498b6` (feat)

## Files Created/Modified

- `apps/frontend/src/locales/en.json` — 18 new auth.* keys + 3 new admin.* keys (21 entries added)
- `apps/frontend/src/locales/de.json` — same 21 keys with German translations

## Decisions Made

None beyond enforcing the pre-existing 10-05 decision (atomic commit for both locale files).

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All 21 i18n keys are in place; Plans 25-04 (ForgotPasswordPage) and 25-05 (ResetPasswordPage + admin reset button) can consume them immediately
- No blockers

## Self-Check

- [x] `apps/frontend/src/locales/en.json` modified — file exists and is valid JSON
- [x] `apps/frontend/src/locales/de.json` modified — file exists and is valid JSON
- [x] Commit `eb498b6` exists and touches both files

## Self-Check: PASSED

---
*Phase: 25-password-reset*
*Completed: 2026-06-29*
