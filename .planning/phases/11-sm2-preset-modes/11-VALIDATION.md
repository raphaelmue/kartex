# Phase 11: SM-2 Preset Modes — Validation Plan

## Requirements

| ID | Requirement | Plan(s) |
|----|-------------|---------|
| SM2-01 | Settings page shows study mode selector; selected mode persists after logout + re-login | 11-01, 11-02, 11-03 |
| SM2-02 | Intensive schedules sooner than Normal; Exam Prep sooner than Intensive (verified via API response) | 11-02 |
| SM2-03 | `CardProgress.interval` is unchanged regardless of active mode — only `nextReview` shifts | 11-02 |
| SM2-04 | Non-Normal mode active shows visible indicator in study session header | 11-01, 11-04 |

---

## Per-Task Verification Map

### Plan 11-01: Shared schemas + i18n

| Check | Method | Pass Condition |
|-------|--------|---------------|
| StudyModeSchema exported | `grep -n 'StudyModeSchema' packages/shared/src/schemas/user.ts` | Found: `z.enum(['normal', 'intensive', 'exam_prep'])` |
| UserSchema has studyMode | `grep -n 'studyMode' packages/shared/src/schemas/user.ts` | Found: `studyMode: StudyModeSchema.default` |
| UpdateStudyModeSchema exported | `grep -n 'UpdateStudyModeSchema' packages/shared/src/schemas/user.ts` | Found: exported |
| Shared package builds | `yarn workspace @kartex/shared run build` | Exit 0 |
| AuthContext User has studyMode | `grep -n 'studyMode' apps/frontend/src/context/AuthContext.tsx` | Found in User interface |
| en.json settings keys | `grep -n '"settings"' apps/frontend/src/locales/en.json` | All 11 keys (modeNames nested) |
| de.json settings keys | `grep -n '"settings"' apps/frontend/src/locales/de.json` | German equivalents present |

### Plan 11-02: Backend

| Check | Method | Pass Condition |
|-------|--------|---------------|
| GET /me returns studyMode | `grep -n 'studyMode' apps/backend/src/routes/auth.ts` | Found in select object |
| PATCH /me endpoint exists | `grep -n "patch.*me\|me.*patch" apps/backend/src/routes/auth.ts` | Found with inline authMiddleware |
| PATCH /me uses UpdateStudyModeSchema | `grep -n 'UpdateStudyModeSchema' apps/backend/src/routes/auth.ts` | Found |
| Rate endpoint has multiplier | `grep -n 'STUDY_MODE_MULTIPLIERS\|multiplier' apps/backend/src/routes/study.ts` | Found post-processor |
| Rate endpoint stores raw interval | `grep -n 'sm2.interval' apps/backend/src/routes/study.ts` | Found (not `sm2.interval * ...`) |
| Backend builds | `yarn workspace @kartex/backend run build` | Exit 0 |

### Plan 11-03: SettingsPage

| Check | Method | Pass Condition |
|-------|--------|---------------|
| RadioGroup installed | `ls apps/frontend/src/components/ui/radio-group.tsx` | File exists |
| SettingsPage exists | `ls apps/frontend/src/pages/SettingsPage.tsx` | File exists |
| SettingsPage uses RadioGroup | `grep -n 'RadioGroup' apps/frontend/src/pages/SettingsPage.tsx` | Found |
| App.tsx imports SettingsPage | `grep -n 'SettingsPage' apps/frontend/src/App.tsx` | Found import + route usage |
| No ComingSoon for /settings | `grep -n 'ComingSoon.*Settings' apps/frontend/src/App.tsx` | NOT found |
| Frontend builds | `yarn workspace @kartex/frontend run build` | Exit 0 |

### Plan 11-04: Indicator + Tests

| Check | Method | Pass Condition |
|-------|--------|---------------|
| StudySessionPage imports useAuth | `grep -n 'useAuth' apps/frontend/src/pages/StudySessionPage.tsx` | Found |
| StudySessionPage passes studyMode | `grep -n 'studyMode' apps/frontend/src/pages/StudySessionPage.tsx` | Found in SessionRunner prop |
| SessionRunner shows Badge | `grep -n 'Badge.*modeNames\|modeNames.*Badge' apps/frontend/src/pages/StudySessionPage.tsx` | Found conditional badge |
| SettingsPage tests exist (SM2-01) | `ls apps/frontend/src/pages/__tests__/SettingsPage.test.tsx` | File exists |
| SettingsPage tests pass | `yarn workspace @kartex/frontend run test --run src/pages/__tests__/SettingsPage.test.tsx` | All pass, exit 0 |
| StudySessionPage tests pass | `yarn workspace @kartex/frontend run test --run src/pages/__tests__/StudySessionPage.test.tsx` | All pass (incl. SM2-04), exit 0 |

---

## SM2-02: Manual Verification (API Response Inspection)

**Test setup:** Run app with migration applied. Ensure the user has `studyMode = 'intensive'` set.

**Test:** Rate a card Good (3). Check the API response `nextReview` date. Then set `studyMode = 'normal'` and rate another card Good with the same state (interval = 1). Compare the two `nextReview` values.

**Expected:** The Intensive-mode `nextReview` is earlier (fewer days out) than the Normal-mode value.

**Why human:** Verifying exact date arithmetic requires a running app with the DB migration applied.

---

## SM2-03: Code Verification

Check the upsert in `apps/backend/src/routes/study.ts` POST `/rate`:
- `interval: sm2.interval` — raw value (NOT `sm2.interval * multiplier`)
- `nextReview: adjustedNextReview` — shifted value

This is a code-level invariant verifiable via grep.
