# Phase 10: Active Deck Rotation — Pattern Map

**Mapped:** 2026-06-02
**Files analyzed:** 11 (9 modified, 2 new shadcn installs)
**Analogs found:** 9 / 11 (2 are shadcn-generated — no codebase analog)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `apps/backend/prisma/schema.prisma` | model/schema | — | `apps/backend/prisma/schema.prisma` (itself — existing pattern) | exact |
| `apps/backend/src/routes/decks.ts` | route | request-response | `apps/backend/src/routes/decks.ts` (itself — PATCH handler) | exact |
| `apps/backend/src/routes/study.ts` | route | request-response | `apps/backend/src/routes/study.ts` (itself — deckFilter) | exact |
| `packages/shared/src/schemas/deck.ts` | schema | transform | `packages/shared/src/schemas/deck.ts` (itself — extend pattern) | exact |
| `apps/frontend/src/pages/DecksPage.tsx` | component/page | request-response | `apps/frontend/src/pages/DecksPage.tsx` (itself — handleDelete optimistic) | exact |
| `apps/frontend/src/pages/DeckDetailPage.tsx` | component/page | request-response | `apps/frontend/src/pages/DeckDetailPage.tsx` (itself — owner guard) | exact |
| `apps/frontend/src/pages/StudySessionPage.tsx` | component/page | request-response | `apps/frontend/src/pages/StudySessionPage.tsx` (itself — SIZE_OPTIONS + committedConfig) | exact |
| `apps/frontend/src/locales/en.json` | config | — | `apps/frontend/src/locales/en.json` (itself — key structure) | exact |
| `apps/frontend/src/locales/de.json` | config | — | `apps/frontend/src/locales/de.json` (itself — key structure) | exact |
| `apps/frontend/src/components/ui/switch.tsx` | component/ui | — | `apps/frontend/src/components/ui/progress.tsx` (Radix primitive wrapper pattern) | role-match |
| `apps/frontend/src/components/ui/checkbox.tsx` | component/ui | — | `apps/frontend/src/components/ui/progress.tsx` (Radix primitive wrapper pattern) | role-match |
| `apps/frontend/src/pages/__tests__/DecksPage.test.tsx` | test | — | `apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx` | role-match |

---

## Pattern Assignments

### `apps/backend/prisma/schema.prisma` (model, schema addition)

**Analog:** itself — `User.isActive Boolean @default(true)` already present (line 40), exact same pattern needed for `Deck`.

**Existing boolean-with-default pattern** (lines 35–48):
```prisma
model User {
  id            String         @id @default(cuid())
  username      String         @unique
  passwordHash  String
  role          Role           @default(USER)
  isActive      Boolean        @default(true)   // ← COPY this pattern for Deck.isActive
  createdAt     DateTime       @default(now())
  ...
}
```

**Target additions** — apply same `@default` convention:
```prisma
model Deck {
  // ... existing fields (lines 70–81) ...
  isActive   Boolean   @default(true)    // ADD after visibility line
}

model User {
  // ... existing fields ...
  studyMode  String    @default("normal") // ADD after isActive line (Phase 11 prep)
}
```

**Key constraint:** `datasource db` block (lines 5–7) has no `url` field — Prisma 7 driver adapter mode. `DATABASE_URL` must be in env when running `prisma migrate dev`. Do not add `url` field.

---

### `apps/backend/src/routes/decks.ts` (route, request-response — PATCH handler)

**Analog:** itself — `PATCH /api/decks/:id` handler already at lines 103–115.

**Existing PATCH pattern** (lines 103–115):
```typescript
decks.patch('/:id', async (c) => {
  const { id } = c.req.param()
  const deck = await prisma.deck.findUnique({ where: { id } })
  if (!deck) return c.json({ error: 'Not found.' }, 404)
  if (deck.ownerId !== c.get('userId')) return c.json({ error: 'Forbidden.' }, 403)
  const body = UpdateDeckSchema.safeParse(await c.req.json())
  if (!body.success) {
    return c.json({ error: 'Validation failed.', details: body.error.flatten() }, 400)
  }
  const updated = await prisma.deck.update({ where: { id }, data: body.data })
  return c.json(updated, 200)
})
```

**What changes:** Zero changes to the route handler itself. `isActive` flows through automatically once `UpdateDeckSchema` is extended. The ownership check (`deck.ownerId !== c.get('userId')`) already enforces the security requirement. No route file edits needed unless UpdateDeckSchema is the only change.

**Imports pattern** (lines 1–6):
```typescript
import { Hono } from 'hono'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { CreateDeckSchema, UpdateDeckSchema, CreateShareSchema, UpdateShareSchema } from '@kartex/shared'
import { cardsRouter } from './cards.js'
```

---

### `apps/backend/src/routes/study.ts` (route, request-response — deckFilter)

**Analog:** itself — `deckFilter` at lines 23–28 is the exact change target.

**Current deckFilter** (lines 23–28):
```typescript
const deckFilter = {
  OR: [
    { ownerId: userId },
    { id: { in: sharedDeckIds } },
  ],
}
```

**New deckFilter** (single-line addition):
```typescript
const deckFilter = {
  OR: [
    { ownerId: userId, isActive: true },   // ADD isActive: true
    { id: { in: sharedDeckIds } },         // shared decks: no isActive filter in v1.2
  ],
}
```

**Context — where deckFilter is used** (lines 31–56):
- `prisma.cardProgress.findMany` — `card: { deck: deckFilter }` (line 34)
- `prisma.card.findMany` — `deck: deckFilter` (line 51)

Both usages receive the updated filter automatically. No other changes needed in study.ts.

**Do NOT add isActive filter** to the `GET /api/study/deck/:deckId` handler (lines 92–132) — deck-specific study always works regardless of `isActive`.

---

### `packages/shared/src/schemas/deck.ts` (schema, transform)

**Analog:** itself — current file at lines 1–29 shows the exact extend/partial pattern.

**Full current file** (lines 1–29):
```typescript
import { z } from 'zod'

export const CreateDeckSchema = z.object({
  title: z.string().min(1, 'Title is required.').max(200),
  description: z.string().max(2000).optional(),
  visibility: z.enum(['PRIVATE', 'SHARED', 'PUBLIC']).default('PRIVATE'),
})
export type CreateDeckInput = z.infer<typeof CreateDeckSchema>

export const UpdateDeckSchema = CreateDeckSchema.partial()
export type UpdateDeckInput = z.infer<typeof UpdateDeckSchema>

export const DeckSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  visibility: z.enum(['PRIVATE', 'SHARED', 'PUBLIC']),
  ownerId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  _count: z.object({ cards: z.number() }).optional(),
})
export type Deck = z.infer<typeof DeckSchema>

export const DeckListItemSchema = DeckSchema.extend({
  sharedByUsername: z.string().optional(),
  owner: z.object({ username: z.string() }).optional(),
})
export type DeckListItem = z.infer<typeof DeckListItemSchema>
```

**Required additions:**
1. Add `isActive: z.boolean().optional()` to `CreateDeckSchema` — propagates to `UpdateDeckSchema` via `.partial()`.
2. Add `isActive: z.boolean().default(true)` to `DeckSchema` — propagates to `DeckListItemSchema` via `.extend()`.

**Pitfall:** `DeckListItemSchema` inherits from `DeckSchema` via `.extend()` — add to `DeckSchema` first and `DeckListItemSchema` gets it for free.

---

### `apps/frontend/src/pages/DecksPage.tsx` (component/page, request-response)

**Analog:** itself — optimistic delete at lines 69–82; CardFooter layout at lines 132–173.

**Imports pattern** (lines 1–17) — new imports needed:
```typescript
// ADD to existing imports:
import { Switch } from '@/components/ui/switch'
// (toast, api, Button, Card*, DeckListItem, etc. already present)
```

**Optimistic delete pattern to adapt for toggle** (lines 69–82):
```typescript
const handleDelete = async (id: string) => {
  try {
    const res = await api.delete(`/api/decks/${id}`)
    if (res.ok) {
      toast.success(t('decks.deckDeleted'))
      setDecks((prev) => prev.filter((d) => d.id !== id))
      setConfirmDeleteId(null)
    } else {
      toast.error(t('common.somethingWrong'))
    }
  } catch {
    toast.error(t('common.somethingWrong'))
  }
}
```

**Adapted optimistic toggle pattern** (new handler — follows same structure):
```typescript
const handleToggleActive = async (deckId: string, checked: boolean) => {
  // Optimistic: flip immediately
  setDecks((prev) =>
    prev.map((d) => (d.id === deckId ? { ...d, isActive: checked } : d))
  )
  try {
    const res = await api.patch(`/api/decks/${deckId}`, { isActive: checked })
    if (!res.ok) throw new Error('PATCH failed')
    toast.success(checked ? t('decks.activatedToast') : t('decks.deactivatedToast'))
  } catch {
    // Revert
    setDecks((prev) =>
      prev.map((d) => (d.id === deckId ? { ...d, isActive: !checked } : d))
    )
    toast.error(t('decks.failedToToggle'))
  }
}
```

**CardFooter layout pattern** (lines 132–173) — where to inject the Switch:
```tsx
<CardFooter className="flex items-center gap-2">
  {/* ADD Switch group before Study button: */}
  {!deck.sharedByUsername && (
    <div className="flex items-center gap-2 mr-auto">
      <Switch
        checked={deck.isActive}
        onCheckedChange={(checked) => void handleToggleActive(deck.id, checked)}
        aria-label={t('decks.toggleActive')}
        id={`active-${deck.id}`}
      />
      <label htmlFor={`active-${deck.id}`} className="text-sm text-muted-foreground cursor-pointer">
        {t('decks.activeLabel')}
      </label>
    </div>
  )}
  <Button size="sm" onClick={() => navigate(`/decks/${deck.id}/learn`)}>
    {t('decks.studyButton')}
  </Button>
  ...
</CardFooter>
```

**Inactive card opacity wrapper** — wrap the `<Card>` (line 111) in:
```tsx
<div className={deck.isActive ? '' : 'opacity-60'}>
  <Card key={deck.id}>...</Card>
</div>
```

Note: `key` moves to the outer `<div>` when the wrapper is added.

---

### `apps/frontend/src/pages/DeckDetailPage.tsx` (component/page, request-response)

**Analog:** itself — owner guard at lines 324–339; `useAuth` import at line 8.

**Owner guard pattern** (lines 320–339) — add Switch before Study button:
```tsx
<div className="flex items-center gap-2">
  {/* ADD owner-only Switch: */}
  {deck.ownerId === user?.id && (
    <div className="flex items-center gap-2">
      <Switch
        checked={deck.isActive}
        onCheckedChange={(checked) => void handleToggleActive(checked)}
        aria-label={t('decks.toggleActive')}
        id="deck-active-toggle"
      />
      <label htmlFor="deck-active-toggle" className="text-sm text-muted-foreground cursor-pointer">
        {t('decks.activeLabel')}
      </label>
    </div>
  )}
  <Button size="sm" onClick={() => navigate(`/decks/${deckId}/learn`)}>
    {t('deckDetail.studyDeck')}
  </Button>
  {deck.ownerId === user?.id && (
    <>
      <Button size="sm" variant="outline" onClick={() => setDeckModalOpen(true)}>
        {t('deckDetail.editDeck')}
      </Button>
      ...
    </>
  )}
</div>
```

**handleToggleActive for DeckDetailPage** — PATCH + local deck state update:
```typescript
const handleToggleActive = async (checked: boolean) => {
  if (!deckId || !deck) return
  const prev = deck.isActive
  setDeck((d) => d ? { ...d, isActive: checked } : d)
  try {
    const res = await api.patch(`/api/decks/${deckId}`, { isActive: checked })
    if (!res.ok) throw new Error('PATCH failed')
    toast.success(checked ? t('decks.activatedToast') : t('decks.deactivatedToast'))
  } catch {
    setDeck((d) => d ? { ...d, isActive: prev } : d)
    toast.error(t('decks.failedToToggle'))
  }
}
```

**Imports to add:**
```typescript
import { Switch } from '@/components/ui/switch'
```

**useAuth is already imported** (line 8 — `import { useAuth } from '@/context/AuthContext'`), and `user` is already destructured (line 122).

---

### `apps/frontend/src/pages/StudySessionPage.tsx` (component/page, request-response)

**Analog:** itself — `CommittedConfig` type at lines 167–172; `isGlobalSR` auto-commit at lines 203–206; `SIZE_OPTIONS` at lines 217–223; mode selector wrapper at line 312; prefetch pattern at lines 229–257; card load effect at lines 259–307.

**CommittedConfig type extension** (lines 167–172) — add `deckIds`:
```typescript
// Current (lines 167–172):
type CommittedConfig = {
  mode: StudyMode
  tags: Set<string>
  size: 'all' | 10 | 20 | 'custom'
  count: number
} | null

// Extended:
type CommittedConfig = {
  mode: StudyMode
  tags: Set<string>
  size: 'all' | 10 | 20 | 'custom'
  count: number
  deckIds?: string[]   // ADD: undefined = all active decks (legacy/deck-specific paths)
} | null
```

**isGlobalSR auto-commit initializer change** (lines 203–206):
```typescript
// Current (line 204–206):
const [committedConfig, setCommittedConfig] = useState<CommittedConfig>(
  isGlobalSR ? { mode: 'sr', tags: new Set(), size: 'all', count: 1 } : null,
)

// New — always null; start screen shows for isGlobalSR:
const [committedConfig, setCommittedConfig] = useState<CommittedConfig>(null)
```

**New state for start screen** — add after existing state declarations (after line 197):
```typescript
// Global SR start screen state
const [activeDecks, setActiveDecks] = useState<DeckPickerDeck[]>([])
const [selectedDeckIds, setSelectedDeckIds] = useState<Set<string>>(new Set())
```

**DeckPickerDeck local type** — add before component function or inside:
```typescript
type DeckPickerDeck = {
  id: string
  title: string
  dueCount: number
}
```

**Global start screen prefetch** — add a new `useEffect` following the existing deckId prefetch (after line 257), using the same `Promise.all` + `void (async () => {...})()` pattern:
```typescript
useEffect(() => {
  if (!isGlobalSR) return
  void (async () => {
    try {
      const [decksRes, dueRes] = await Promise.all([
        api.get('/api/decks'),
        api.get('/api/study/due'),
      ])
      if (decksRes.ok && dueRes.ok) {
        const allDecks = await decksRes.json() as DeckListItem[]
        const due = await dueRes.json() as { deckId: string }[]
        const active = allDecks.filter((d) => d.isActive)
        const picker: DeckPickerDeck[] = active.map((d) => ({
          id: d.id,
          title: d.title,
          dueCount: due.filter((c) => c.deckId === d.id).length,
        }))
        setActiveDecks(picker)
        setSelectedDeckIds(new Set(picker.map((d) => d.id)))
      }
    } catch (err) {
      console.error('[StudySessionPage] global prefetch failed:', err)
    }
  })()
}, [isGlobalSR])
```

**Card load effect — deckIds filter addition** (lines 259–307) — add client-side deckIds filter after tag filter (after `tagFiltered` is computed):
```typescript
// DECK-03: session deckIds filter (client-side on top of server isActive filter)
const deckFiltered =
  committedConfig.deckIds
    ? tagFiltered.filter((c) => committedConfig.deckIds!.includes(c.deckId))
    : tagFiltered
// then feed deckFiltered into sized/shuffled instead of tagFiltered
```

**SIZE_OPTIONS** (lines 217–223) — unchanged, reused verbatim for start screen:
```typescript
const SIZE_OPTIONS: { label: string; value: 'all' | 10 | 20 | 'custom' }[] = [
  { label: t('study.sizeAllDue'), value: 'all' },
  { label: '10', value: 10 },
  { label: '20', value: 20 },
  { label: t('study.sizeCustom'), value: 'custom' },
]
```

**Mode selector page wrapper** (line 312) — start screen reuses same class:
```tsx
<div className="max-w-lg mx-auto py-12 px-4">
```

**Back button pattern** (lines 313–320):
```tsx
<Button
  variant="ghost"
  size="sm"
  className="mb-6"
  onClick={() => navigate('/dashboard')}
>
  <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
  {t('study.backToDashboard')}
</Button>
```

**Section label header pattern** (lines 330–334) — reused for "Choose decks" and "Session size":
```tsx
<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
  {t('study.chooseDecks')}
</p>
```

**Render order in return** — the mode selector guard (`if (!selectedMode)`) currently at line 310 applies only to deck-specific sessions. The new isGlobalSR start screen branch is inserted immediately before `if (loadingCards || cards === null)` (line 476):
```tsx
// 1. Deck-specific: mode selector (existing guard, line 310 — unchanged)
if (!selectedMode) { ... }

// 2. Global SR: start screen (NEW)
if (isGlobalSR && !committedConfig) {
  return ( <div className="max-w-lg mx-auto py-12 px-4"> ... </div> )
}

// 3. Loading (line 476 — unchanged)
if (loadingCards || cards === null) { ... }

// 4. SessionRunner (line 484 — unchanged)
return <SessionRunner ... />
```

**Imports to add:**
```typescript
import { DeckListItem } from '@kartex/shared'   // for activeDecks prefetch type
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'  // not needed here; Checkbox is
```
Note: Only `Checkbox` is needed in StudySessionPage (for deck picker). `Switch` is only in DecksPage and DeckDetailPage. Also add `BookOpen` — already imported (line 5).

---

### `apps/frontend/src/locales/en.json` (config, i18n keys)

**Analog:** itself — existing `decks` namespace at lines 75–88; existing `study` namespace at lines 159–192.

**Additions to `decks` namespace** (after line 88, inside `"decks"` object):
```json
"activeLabel": "Active",
"toggleActive": "Toggle deck active",
"activatedToast": "Deck added to study queue",
"deactivatedToast": "Deck removed from study queue",
"failedToToggle": "Failed to update deck — try again"
```

**Additions to `study` namespace** (after line 192, inside `"study"` object):
```json
"globalTitle": "Study session",
"globalSubtitle": "Choose which active decks to include in this session.",
"chooseDecks": "Choose decks",
"startSession": "Start session",
"backToDashboard": "Back to Dashboard",
"noActiveDecks": "No active decks",
"noActiveDecksHint": "Go to My Decks and toggle at least one deck active to study."
```

**Reused existing keys** (no change needed):
- `study.sessionSize` (line 165) — used on start screen session size section
- `study.sizeAllDue` (line 167) — used in SIZE_OPTIONS
- `study.sizeCustom` (line 168) — used in SIZE_OPTIONS
- `study.nCardsDue` (line 173) — used in deck picker due count

**Total new keys: 12** (5 in `decks`, 7 in `study`).

---

### `apps/frontend/src/locales/de.json` (config, i18n keys)

**Analog:** itself — same structure as en.json; German namespace keys at lines 75–88 and 159–192.

**Additions to `decks` namespace** (German translations):
```json
"activeLabel": "Aktiv",
"toggleActive": "Deck aktivieren/deaktivieren",
"activatedToast": "Deck zur Lernwarteschlange hinzugefügt",
"deactivatedToast": "Deck aus der Lernwarteschlange entfernt",
"failedToToggle": "Deck konnte nicht aktualisiert werden — bitte erneut versuchen"
```

**Additions to `study` namespace** (German translations):
```json
"globalTitle": "Lernsitzung",
"globalSubtitle": "Wählen Sie, welche aktiven Decks in dieser Sitzung enthalten sein sollen.",
"chooseDecks": "Decks auswählen",
"startSession": "Sitzung starten",
"backToDashboard": "Zurück zum Dashboard",
"noActiveDecks": "Keine aktiven Decks",
"noActiveDecksHint": "Gehen Sie zu \"Meine Decks\" und aktivieren Sie mindestens ein Deck."
```

**Critical rule:** Both locale files must be updated in the same commit (Pitfall 5 — missing de.json keys fall back to raw key string, not English value).

---

### `apps/frontend/src/components/ui/switch.tsx` (component/ui, new)

**Source:** `npx shadcn@latest add switch` — do not hand-write.

**Analog pattern** (from `apps/frontend/src/components/ui/progress.tsx` lines 1–26):
```typescript
import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root ref={ref} className={cn("...", className)} {...props}>
    ...
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName
export { Progress }
```

shadcn's generated Switch will follow this identical pattern: `React.forwardRef` + `@radix-ui/react-switch` + `cn()` + named export. No manual authoring needed; install command handles it.

---

### `apps/frontend/src/components/ui/checkbox.tsx` (component/ui, new)

**Source:** `npx shadcn@latest add checkbox` — do not hand-write.

Same generation pattern as Switch. shadcn will use `@radix-ui/react-checkbox` wrapped in `React.forwardRef` + `cn()`. No manual authoring needed.

---

### `apps/frontend/src/pages/__tests__/DecksPage.test.tsx` (test, Wave 0 new file)

**Analog:** `apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx` — exact structural pattern.

**Test file structure pattern** (lines 1–106 of StudySessionPage.test.tsx):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DecksPage } from '@/pages/DecksPage'

// 1. Mock react-router-dom — preserve real, override navigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

// 2. Mock api — vi.hoisted for cross-factory availability
const { mockApiGet, mockApiPatch } = vi.hoisted(() => {
  return { mockApiGet: vi.fn(), mockApiPatch: vi.fn() }
})
vi.mock('@/lib/api', () => ({
  api: {
    get: mockApiGet,
    patch: mockApiPatch,
    delete: vi.fn(),
  },
}))

// 3. Mock sonner
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

// Helper deck factory
function makeDeck(id: string, isActive = true) { ... }

function renderPage() {
  return render(<MemoryRouter><DecksPage /></MemoryRouter>)
}

describe('DecksPage isActive toggle', () => {
  beforeEach(() => { mockApiGet.mockReset(); mockApiPatch.mockReset() })

  it('DECK-01a: Switch renders checked when deck.isActive === true', async () => { ... })
  it('DECK-01b: Switch renders unchecked when deck.isActive === false', async () => { ... })
  it('DECK-01c: PATCH called with { isActive: false } when toggled off', async () => { ... })
  it('DECK-01d: optimistic revert on PATCH failure; toast.error shown', async () => { ... })
})
```

**Key differences from StudySessionPage test:**
- No `useAuth` mock needed (DecksPage does not import `useAuth`).
- `mockApiPatch` needed (DecksPage uses `api.patch` for toggle).
- `useParams` not needed (DecksPage has no route params).
- Deck factory must include `isActive: boolean` field.

---

## Shared Patterns

### Optimistic State Update + Revert
**Source:** `apps/frontend/src/pages/DecksPage.tsx` lines 69–82 (`handleDelete`) — adapted for toggle
**Apply to:** `DecksPage.tsx` (`handleToggleActive`), `DeckDetailPage.tsx` (`handleToggleActive`)

Core shape:
```typescript
// 1. Optimistic update
setState(prev => prev.map(item => item.id === id ? { ...item, field: value } : item))
// 2. try { await api.patch(...); toast.success(...) }
// 3. catch { revert state; toast.error(...) }
```

### Owner-Only Conditional Render
**Source:** `apps/frontend/src/pages/DeckDetailPage.tsx` lines 324–339
**Apply to:** `DeckDetailPage.tsx` (isActive Switch), `DecksPage.tsx` (isActive Switch per `!deck.sharedByUsername`)

```tsx
// DeckDetailPage — strict owner check:
{deck.ownerId === user?.id && (<Switch .../>)}

// DecksPage — shared deck exclusion (equivalent guard already at line 139):
{!deck.sharedByUsername && (<div className="flex items-center gap-2 mr-auto"><Switch .../></div>)}
```

### Hono Route + Zod Validation + Ownership Check
**Source:** `apps/backend/src/routes/decks.ts` lines 103–115 (PATCH handler)
**Apply to:** No new routes — existing PATCH handler is reused. UpdateDeckSchema extension in shared schemas is the only change.

```typescript
const body = UpdateDeckSchema.safeParse(await c.req.json())
if (!body.success) {
  return c.json({ error: 'Validation failed.', details: body.error.flatten() }, 400)
}
```

### i18n Key Addition
**Source:** `apps/frontend/src/locales/en.json` + `de.json` (both files, same namespaces)
**Apply to:** Both locale files simultaneously — never one without the other.

Rule: New keys are always nested under their page namespace (`decks.*`, `study.*`). Both locale files updated in the same edit pass.

### Shadcn Component File Header
**Source:** `apps/frontend/src/components/ui/progress.tsx` lines 1–3
**Apply to:** `switch.tsx`, `checkbox.tsx` (generated by shadcn CLI — follows same header pattern)

```typescript
import * as React from "react"
import * as [RadixPrimitive] from "@radix-ui/react-[component]"
import { cn } from "@/lib/utils"
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `apps/frontend/src/components/ui/switch.tsx` | component/ui | — | shadcn-generated — no handwritten analog; `progress.tsx` shows generation pattern only |
| `apps/frontend/src/components/ui/checkbox.tsx` | component/ui | — | shadcn-generated — no handwritten analog; `progress.tsx` shows generation pattern only |

Both are installed via `npx shadcn@latest add switch` and `npx shadcn@latest add checkbox`. The planner should issue the install command rather than write these files manually.

---

## Metadata

**Analog search scope:** `apps/backend/src/routes/`, `apps/backend/prisma/`, `packages/shared/src/schemas/`, `apps/frontend/src/pages/`, `apps/frontend/src/components/ui/`, `apps/frontend/src/locales/`, `apps/frontend/src/pages/__tests__/`
**Files scanned:** 12 source files read directly
**Pattern extraction date:** 2026-06-02
