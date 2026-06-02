# Phase 11: SM-2 Preset Modes — Patterns

## Codebase Patterns to Follow

### Pattern: Inline authMiddleware on auth routes (CRITICAL)

Auth routes bypass the global `/api/*` authMiddleware. Existing GET `/me` applies it inline:
```typescript
// apps/backend/src/routes/auth.ts line 205
auth.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId')
  ...
})
```
New PATCH `/me` must follow the same pattern:
```typescript
auth.patch('/me', authMiddleware, async (c) => {
  const userId = c.get('userId')
  ...
})
```

### Pattern: Zod safeParse with early return on failure

```typescript
// study.ts POST /rate (lines 136-140) — exact pattern
const body = RateCardSchema.safeParse(await c.req.json())
if (!body.success) {
  return c.json({ error: 'Validation failed.', details: body.error.flatten() }, 400)
}
```

### Pattern: GET /me select extension

Current select (auth.ts line 210):
```typescript
select: { id: true, username: true, role: true, isActive: true, createdAt: true }
```
Add `studyMode: true` — the API then returns it in the response body.

### Pattern: Rate endpoint user fetch for studyMode

After the existing `const existing = await prisma.cardProgress.findUnique(...)` call in the rate handler, add a parallel user lookup:
```typescript
const [existing, ratingUser] = await Promise.all([
  prisma.cardProgress.findUnique({ where: { userId_cardId: { userId, cardId } } }),
  prisma.user.findUnique({ where: { id: userId }, select: { studyMode: true } }),
])
```
Then apply the multiplier post-processor after `calculateSM2`.

### Pattern: Multiplier post-processor (key invariant)

```typescript
const STUDY_MODE_MULTIPLIERS: Record<string, number> = {
  normal: 1.0,
  intensive: 0.5,
  exam_prep: 0.25,
}

const sm2 = calculateSM2({ quality, repetitions: existing?.repetitions ?? 0, easeFactor: existing?.easeFactor ?? 2.5, interval: existing?.interval ?? 1 })

const multiplier = STUDY_MODE_MULTIPLIERS[ratingUser?.studyMode ?? 'normal'] ?? 1.0
const adjustedNextReview = new Date()
adjustedNextReview.setDate(
  adjustedNextReview.getDate() + Math.max(1, Math.ceil(sm2.interval * multiplier))
)
adjustedNextReview.setHours(0, 0, 0, 0)

// CRITICAL: upsert uses sm2.interval (raw), not multiplied
await prisma.cardProgress.upsert({
  ...
  update: { ..., interval: sm2.interval, nextReview: adjustedNextReview },
  create: { ..., interval: sm2.interval, nextReview: adjustedNextReview },
})
```

### Pattern: shadcn RadioGroup install

Same as Phase 10 Switch/Checkbox install:
```bash
# From apps/frontend directory or via workspace command
npx shadcn@latest add radio-group
```
Copies `radio-group.tsx` to `apps/frontend/src/components/ui/`, installs `@radix-ui/react-radio-group`.

### Pattern: labelKey for translated mode options (avoids hooks-at-module-scope)

```typescript
// At module scope — only key strings, not translated text
const STUDY_MODE_OPTIONS = [
  { value: 'normal',    labelKey: 'settings.modeNormal',    descKey: 'settings.modeNormalDesc' },
  { value: 'intensive', labelKey: 'settings.modeIntensive', descKey: 'settings.modeIntensiveDesc' },
  { value: 'exam_prep', labelKey: 'settings.modeExamPrep',  descKey: 'settings.modeExamPrepDesc' },
] as const

// Inside component render — t() called here, not at module scope
{STUDY_MODE_OPTIONS.map(opt => (
  <RadioGroupItem value={opt.value} key={opt.value} />
  <div>
    <Label>{t(opt.labelKey)}</Label>
    <p>{t(opt.descKey)}</p>
  </div>
))}
```
Matches `labelKey` pattern from STATE.md 09-02 (navItems/RATINGS arrays).

### Pattern: Auto-save on RadioGroup change (no explicit Save button)

Consistent with deck active toggle auto-save in DecksPage:
```typescript
const handleModeChange = async (value: string) => {
  // Optimistic update
  setUser({ ...user!, studyMode: value })
  try {
    const res = await api.patch('/api/auth/me', { studyMode: value })
    if (!res.ok) throw new Error()
    toast.success(t('settings.saved'))
  } catch {
    // Revert
    setUser({ ...user!, studyMode: previousStudyMode })
    toast.error(t('settings.saveFailed'))
  }
}
```

### Pattern: StudySessionPage mode indicator via prop

StudySessionPage calls `useAuth()`, passes `studyMode` as prop to `SessionRunner`. SessionRunner renders Badge when non-normal:
```typescript
// In StudySessionPage:
const { user } = useAuth()
// ...
<SessionRunner ... studyMode={user?.studyMode ?? 'normal'} />

// In SessionRunner (add prop):
{ studyMode !== 'normal' && (
  <Badge variant="secondary" className="text-xs">
    {t(`settings.modeNames.${studyMode}`)}
  </Badge>
)}
```
Position: alongside the `<SessionProgress>` component in the session header area.

### Pattern: useAuth mock in StudySessionPage tests

The existing test file comment says `// No useAuth mock — StudySessionPage does not import useAuth` (line 37). After Phase 11 adds useAuth, add:
```typescript
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { studyMode: 'normal' }, loading: false }),
}))
```
This defaults all existing tests to `studyMode: 'normal'` (no behavior change). SM2-04 tests override by importing the mock and changing the return value for specific tests.

### Key Constraint: No migration needed

`User.studyMode` already exists from Phase 10 migration. Do not add or run any migration in Phase 11.

### Key Constraint: settings.modeNames.* key structure

For the indicator in StudySessionPage to work with dynamic key lookup:
```typescript
t(`settings.modeNames.${studyMode}`)
```
The i18n keys must be nested under `settings.modeNames`:
```json
"settings": {
  "modeNames": {
    "normal": "Normal",
    "intensive": "Intensive",
    "exam_prep": "Exam Prep"
  }
}
```
This is different from `settings.modeNormal` flat keys — use the nested structure.
