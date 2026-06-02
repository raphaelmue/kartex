# Phase 11: SM-2 Preset Modes — Research

## Goal

Users choose how aggressively their review intervals are compressed (Normal / Intensive / Exam Prep); the choice is enforced server-side on every card rating; the raw SM-2 interval in `CardProgress` is never modified.

---

## Key Decisions Already Locked (STATE.md v1.2-research)

| Decision | Details |
|----------|---------|
| `User.studyMode` column exists | Added in Phase 10 migration `20260602000000_add_isactive_studymode`. Column: `TEXT NOT NULL DEFAULT 'normal'` on the `User` table. No migration needed in Phase 11. |
| studyMode on User model, not UserSettings | Single preference; premature abstraction avoided; `/api/auth/me` already returns UserSchema |
| Multiplier as nextReviewAt post-processor | Never modify `CardProgress.interval` — only `nextReview` is shifted. The raw SM-2 interval is preserved for all future scheduling calculations. |
| `/api/auth/me` returns UserSchema | GET `/api/auth/me` is the existing user self-service endpoint. The PATCH variant is the natural write endpoint. |

---

## Multiplier Values

| Mode | Value | Enum string | Effect |
|------|-------|-------------|--------|
| Normal | 1.0× | `normal` | Standard SM-2 scheduling (no change) |
| Intensive | 0.5× | `intensive` | Intervals halved — cards reviewed twice as often |
| Exam Prep | 0.25× | `exam_prep` | Intervals quartered — maximum revisit frequency |

---

## SM-2 Multiplier Post-Processor Pattern

```typescript
// After calculateSM2(input) → sm2:
const STUDY_MODE_MULTIPLIERS: Record<string, number> = {
  normal: 1.0,
  intensive: 0.5,
  exam_prep: 0.25,
}

const multiplier = STUDY_MODE_MULTIPLIERS[user.studyMode] ?? 1.0

// Apply to nextReview only — never to sm2.interval
const adjustedNextReview = new Date()
adjustedNextReview.setDate(
  adjustedNextReview.getDate() + Math.max(1, Math.ceil(sm2.interval * multiplier))
)
adjustedNextReview.setHours(0, 0, 0, 0)

// Upsert stores sm2.interval (raw), adjustedNextReview (shifted)
```

`Math.max(1, ...)` ensures the floor is 1 day — a card is never scheduled in the past even under 0.25× with a 1-day interval.

---

## Backend: PATCH /api/auth/me

The `authRouter` is registered at `app.route('/api/auth', authRouter)` in `apps/backend/src/index.ts` (line 34) **before** the global `app.use('/api/*', authMiddleware)` at line 41. This means auth routes are NOT automatically protected by the global middleware.

The existing `GET /me` handler applies `authMiddleware` inline: `auth.get('/me', authMiddleware, async (c) => {...})`. The new `PATCH /me` must follow the same inline-middleware pattern or it will be unauthenticated.

Endpoint design:
```
PATCH /api/auth/me
Body: { studyMode: 'normal' | 'intensive' | 'exam_prep' }
Auth: inline authMiddleware required
Returns: 200 { id, username, role, isActive, studyMode, createdAt }
Errors: 400 validation failure
```

---

## Frontend: SettingsPage

The `/settings` route currently uses a `ComingSoon` placeholder in `App.tsx` (line 82). This must be replaced with the real `SettingsPage` component.

### RadioGroup Component

`apps/frontend/src/components/ui/radio-group.tsx` does **not** exist yet. Install via official shadcn CLI:
```bash
npx shadcn@latest add radio-group
```
This copies `radio-group.tsx` into `apps/frontend/src/components/ui/` and adds `@radix-ui/react-radio-group` to `apps/frontend/package.json`.

### Auto-save Pattern

Consistent with the Phase 10 deck toggle (DecksPage `handleToggleActive`), the settings page calls PATCH immediately on RadioGroup `onValueChange`. No separate Save button. Show a toast on success/failure.

---

## Frontend: StudySessionPage Mode Indicator

`StudySessionPage` currently does **not** import `useAuth` (STATE.md 08-01 decision). Adding the mode indicator requires `useAuth` to get `user?.studyMode`.

Since `StudySessionPage` is a page component (not deep in a render tree), calling `useAuth()` directly is appropriate. Pass `studyMode` as a prop to the inner `SessionRunner` to keep the data flow clear.

The `StudySessionPage.test.tsx` file contains the comment `// No useAuth mock — StudySessionPage does not import useAuth` (line 37). When useAuth is added, this comment becomes stale and a mock must be added.

Mock shape needed in tests:
```typescript
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { studyMode: 'normal' }, loading: false }),
}))
```

---

## AuthContext: User Interface Extension

`apps/frontend/src/context/AuthContext.tsx` line 7–13 defines the local `User` interface. It must gain `studyMode: string`.

The context hydrates from GET `/api/auth/me` at line 38–48. After Plan 11-02 adds `studyMode` to the select, the API will return it. The existing `setUser(data)` call will propagate it automatically.

---

## Pitfalls

| # | Pitfall | Avoidance |
|---|---------|-----------|
| 1 | Storing `interval * multiplier` in `CardProgress.interval` | Upsert always writes `sm2.interval` (raw). Only `nextReview` gets the adjusted date. |
| 2 | Applying multiplier before `calculateSM2` instead of after | Multiplier is a **post-processor** on `sm2.nextReview` only — calculateSM2 runs unmodified. |
| 3 | `PATCH /me` missing inline `authMiddleware` | Auth routes bypass global middleware — apply `authMiddleware` inline as 2nd arg to `auth.patch`. |
| 4 | `updateStudyModeSchema` validates a free-form string | Use the `StudyModeSchema` enum (`z.enum(['normal','intensive','exam_prep'])`) — rejects unknown values. |
| 5 | StudySessionPage tests fail after `useAuth` added | Update test file: add `vi.mock('@/context/AuthContext', ...)` with default `studyMode: 'normal'`. |
| 6 | Mode name display using raw enum value | Use `t('settings.modeNames.intensive')` etc. — never render `user.studyMode` directly (D-07 pattern). |
| 7 | i18n locale parity — missing de.json keys | Both locale files must be updated atomically in one commit (Pitfall 5 from Phase 10 — prevents raw key string fallback). |

---

## Package Legitimacy Audit

| Package | Source | Risk | Decision |
|---------|--------|------|----------|
| `@radix-ui/react-radio-group` | Official shadcn registry via `npx shadcn@latest add radio-group` | Low — first-party Radix UI, already used for Switch/Checkbox/Select/Tabs in this project | ACCEPTED |

---

## No Migration Required

`User.studyMode TEXT NOT NULL DEFAULT 'normal'` was added to the schema in Phase 10's migration (`20260602000000_add_isactive_studymode`). Phase 11 makes no schema changes — only reads/writes this column.
