---
phase: 11-sm2-preset-modes
plan: "01"
subsystem: shared-schemas, frontend-context, i18n
tags: [zod, typescript, i18n, auth-context]
dependency_graph:
  requires: []
  provides:
    - StudyModeSchema (packages/shared)
    - UpdateStudyModeSchema (packages/shared)
    - studyMode field in AuthContext User interface
    - settings.* i18n keys in en.json and de.json
  affects:
    - packages/shared/src/schemas/user.ts
    - apps/frontend/src/context/AuthContext.tsx
    - apps/frontend/src/locales/en.json
    - apps/frontend/src/locales/de.json
tech_stack:
  added: []
  patterns:
    - Zod enum schema for constrained string values
    - Default value in Zod schema propagated via UserResponseSchema = UserSchema alias
    - Atomic locale file updates to prevent missing-key fallback to raw key string
key_files:
  modified:
    - packages/shared/src/schemas/user.ts
    - apps/frontend/src/context/AuthContext.tsx
    - apps/frontend/src/locales/en.json
    - apps/frontend/src/locales/de.json
decisions:
  - "StudyModeSchema z.enum(['normal','intensive','exam_prep']) with default 'normal' added before createdAt in UserSchema field order"
  - "UpdateStudyModeSchema placed after UserResponseSchema — consumers use it for PATCH /api/users/me body validation"
  - "Both locale files updated atomically in single commit — prevents de.json missing keys falling back to raw key string (Pitfall 5)"
  - "studyMode: string (not StudyMode type) in AuthContext User interface — avoids importing shared package into frontend context; value validated by backend Zod parse before storage"
metrics:
  duration: "~4 min"
  completed: "2026-06-02"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 4
---

# Phase 11 Plan 01: SM-2 Preset Modes Type Foundation Summary

**One-liner:** Zod StudyModeSchema enum + UserSchema studyMode field + UpdateStudyModeSchema added to shared package; studyMode wired into AuthContext User interface; all settings.* i18n keys (including nested modeNames) added atomically to en.json and de.json.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add StudyModeSchema, extend UserSchema, add UpdateStudyModeSchema | 7ae93e0 | packages/shared/src/schemas/user.ts |
| 2 | Add studyMode to AuthContext User interface | d10d013 | apps/frontend/src/context/AuthContext.tsx |
| 3 | Add settings.* i18n keys to en.json and de.json atomically | 2d6f933 | apps/frontend/src/locales/en.json, de.json |

## What Was Built

### Task 1 — Shared schemas
- `StudyModeSchema = z.enum(['normal', 'intensive', 'exam_prep'])` with `StudyMode` type
- `UserSchema` extended with `studyMode: StudyModeSchema.default('normal')` inserted after `isActive`
- `UserResponseSchema = UserSchema` alias automatically includes `studyMode` — no change needed
- `UpdateStudyModeSchema = z.object({ studyMode: StudyModeSchema })` + `UpdateStudyModeInput` type
- `yarn workspace @kartex/shared run build` exits 0

### Task 2 — AuthContext
- `studyMode: string` field added to local `User` interface after `isActive`
- No hydration change needed — `setUser(data)` assigns full API response body
- `yarn workspace @kartex/frontend run build` exits 0

### Task 3 — Locale files
- Both `en.json` and `de.json` updated in one commit (locale parity enforced)
- 10 keys added per file: `title`, `pageHeading`, `studyModeSection`, `studyModeDesc`, `modeNames.normal`, `modeNames.intensive`, `modeNames.exam_prep`, `modeNormalDesc`, `modeIntensiveDesc`, `modeExamPrepDesc`, `saved`, `saveFailed`
- `"settings"` key placed before `"lang"` in alphabetical order
- Both files validate as JSON

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. This plan adds type definitions and i18n keys only; no UI rendering or data flow involved.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: T-11-01 mitigated | packages/shared/src/schemas/user.ts | StudyModeSchema z.enum enforces only valid values; UpdateStudyModeSchema.safeParse will reject invalid strings in PATCH handler (Plan 11-02) |
| threat_flag: T-11-02 mitigated | apps/frontend/src/locales/*.json | settings.modeNames.* keys exist for D-07 compliance — mode names rendered via t() never raw enum value |

## Self-Check: PASSED

- [x] packages/shared/src/schemas/user.ts — exports StudyModeSchema, StudyMode, UpdateStudyModeSchema, UpdateStudyModeInput, extended UserSchema
- [x] apps/frontend/src/context/AuthContext.tsx — User interface contains studyMode: string
- [x] apps/frontend/src/locales/en.json — contains settings.modeNames.normal/intensive/exam_prep
- [x] apps/frontend/src/locales/de.json — contains settings.modeNames.normal/intensive/exam_prep (German values)
- [x] Commits: 7ae93e0, d10d013, 2d6f933 — all exist in git log
- [x] yarn workspace @kartex/shared run build exits 0
- [x] yarn workspace @kartex/frontend run build exits 0
- [x] Both locale JSON files parse as valid JSON
