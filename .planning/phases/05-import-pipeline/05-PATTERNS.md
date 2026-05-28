# Phase 5: Import Pipeline - Pattern Map

**Mapped:** 2026-05-28
**Files analyzed:** 9 (6 new, 3 modified)
**Analogs found:** 9 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/shared/src/lib/kartex-parser.ts` | utility (pure function) | transform | `packages/shared/src/lib/sm2.ts` | exact |
| `packages/shared/src/schemas/import.ts` | model (Zod schemas) | transform | `packages/shared/src/schemas/study.ts` | exact |
| `apps/backend/src/routes/import.ts` | route/controller | file-I/O + CRUD | `apps/backend/src/routes/media.ts` | exact |
| `apps/frontend/src/pages/ImportPage.tsx` | component (page) | request-response | `apps/frontend/src/pages/DashboardPage.tsx` | role-match |
| `apps/frontend/src/hooks/useImport.ts` | hook (state machine) | request-response | `apps/frontend/src/hooks/useStudySession.ts` | role-match |
| `apps/frontend/src/lib/__tests__/kartex-parser.test.ts` | test | transform | `apps/frontend/src/lib/__tests__/sm2.test.ts` | exact |
| `packages/shared/src/index.ts` | config (barrel) | — | `packages/shared/src/index.ts` (self) | exact |
| `apps/backend/src/index.ts` | config (router reg) | — | `apps/backend/src/index.ts` (self) | exact |
| `apps/frontend/src/App.tsx` | config (route wiring) | — | `apps/frontend/src/App.tsx` (self) | exact |

---

## Pattern Assignments

### `packages/shared/src/lib/kartex-parser.ts` (utility, transform)

**Analog:** `packages/shared/src/lib/sm2.ts`

**Imports pattern** (sm2.ts lines 1-0 — no imports; kartex-parser will have one):
```typescript
// sm2.ts has zero imports — pure TS with no dependencies
// kartex-parser.ts will follow the same pattern but imports one package:
import { parse as parseYaml } from 'yaml'
```

**Exported interface pattern** (sm2.ts lines 9-23):
```typescript
export type SM2Quality = 0 | 3 | 4 | 5

export interface SM2Input {
  quality: SM2Quality
  repetitions: number
  easeFactor: number
  interval: number
}

export interface SM2Output {
  repetitions: number
  easeFactor: number
  interval: number
  nextReview: Date
}
```
Copy this pattern: export all interfaces and types at the top of the file, then export functions below. No default exports. Named exports only.

**Core function signature pattern** (sm2.ts lines 32-66):
```typescript
export function calculateSM2(input: SM2Input): SM2Output {
  const { quality, repetitions, easeFactor, interval } = input
  // ... pure computation, no I/O
  return { repetitions: newRepetitions, easeFactor: newEF, interval: newInterval, nextReview }
}
```
`parseKartex` must follow the same pattern: single exported function, typed input (string), typed return union, pure — no side effects, no I/O.

**Utility function pattern** (sm2.ts lines 71-100):
```typescript
export function calculateStreak(reviewDates: string[], today?: Date): number {
  if (reviewDates.length === 0) return 0
  // ...
}
```
Secondary exported helpers follow the same pattern after the primary function. `kartex-parser.ts` may export helper functions (`parseDeckHeader`, `parseCardBlock`) using this style.

---

### `packages/shared/src/schemas/import.ts` (model, transform)

**Analog:** `packages/shared/src/schemas/study.ts`

**Imports pattern** (study.ts line 1):
```typescript
import { z } from 'zod'
```
Single import. No other dependencies in schema files.

**Schema + inferred type pattern** (study.ts lines 4-17):
```typescript
export const RatingSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
])
export type Rating = z.infer<typeof RatingSchema>

export const RateCardSchema = z.object({
  cardId: z.string().min(1),
  rating: RatingSchema,
})
export type RateCardInput = z.infer<typeof RateCardSchema>
```
Pattern: `export const XxxSchema = z.object({...})` immediately followed by `export type Xxx = z.infer<typeof XxxSchema>`. Every schema paired with its inferred type.

**Nested schema composition pattern** (study.ts lines 44-58):
```typescript
export const DashboardStatsSchema = z.object({
  totalDue: z.number(),
  reviewedToday: z.number(),
  streak: z.number(),
  byDeck: z.array(
    z.object({
      deckId: z.string(),
      deckTitle: z.string(),
      dueCount: z.number(),
    })
  ),
})
export type DashboardStats = z.infer<typeof DashboardStatsSchema>
```
Inline nested `z.object()` for sub-shapes, or reference previously defined schemas. `import.ts` will define:
- `DeckHeaderSchema` — deck YAML header
- `ParsedCardSchema` — single parsed card (front, back, tags)
- `ParseWarningSchema` — `{ cardIndex: number, reason: string }`
- `ImportResultSchema` — `{ deckId, cardCount, warnings }`
- `ImportConfigSchema` — `{ maxFileSizeBytes: number }`

---

### `apps/backend/src/routes/import.ts` (route/controller, file-I/O + CRUD)

**Analog:** `apps/backend/src/routes/media.ts`

**Imports pattern** (media.ts lines 1-5):
```typescript
import { Hono } from 'hono'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { prisma } from '../lib/prisma.js'
```
`import.ts` adds `bodyLimit`, `unzipper`, `file-type`, and the shared parser on top:
```typescript
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { prisma } from '../lib/prisma.js'
import { parseKartex } from '@kartex/shared'
// unzipper and file-type imported at top (see pitfall notes in RESEARCH.md)
```

**Router instantiation pattern** (media.ts line 49):
```typescript
const media = new Hono<{ Variables: { userId: string } }>()
```
`importRouter` uses the exact same generic — the `userId` variable is populated by `authMiddleware` upstream.

**`parseBody()` + `instanceof File` guard pattern** (media.ts lines 54-59):
```typescript
const body = await c.req.parseBody()
const file = body['file']

if (!(file instanceof File)) {
  return c.json({ error: 'File is required.' }, 400)
}
```
Copy exactly. The `bodyLimit` middleware must be inserted as the first middleware in the POST route chain, before `parseBody()` is called:
```typescript
importRouter.post(
  '/',
  bodyLimit({ maxSize: MAX_BYTES, onError: (c) => c.json({ error: 'File too large.' }, 413) }),
  async (c) => {
    const body = await c.req.parseBody()
    const file = body['file']
    if (!(file instanceof File)) return c.json({ error: 'File is required.' }, 400)
    // ...
  }
)
```

**File storage pattern** (media.ts lines 61-80):
```typescript
const storagePath = process.env.STORAGE_PATH ?? '/app/media'
await mkdir(storagePath, { recursive: true })

const ext = extname(file.name)
const filename = randomUUID() + ext
const fullPath = join(storagePath, filename)

await writeFile(fullPath, new Uint8Array(await file.arrayBuffer()))

await prisma.media.create({
  data: {
    ownerId: userId,
    filename,
    mimeType: file.type,
    storagePath: fullPath,
    sizeBytes: file.size,
  },
})
```
For bundled zip media: `file.type` is NOT used for `mimeType` — use the `detected.mime` from `fileTypeFromBuffer` instead (magic bytes are authoritative per D-08).

**Response pattern** (media.ts line 81):
```typescript
return c.json({ filename, url: `/api/media/${filename}` }, 201)
```
Import route responds with: `c.json({ deckId, cardCount, warnings }, 201)`

**Named export pattern** (media.ts line 83):
```typescript
export { media as mediaRouter, mediaPublic as mediaPublicRouter }
```
`import.ts` uses: `export { importRouter }`

---

### `apps/frontend/src/pages/ImportPage.tsx` (component, request-response)

**Analog:** `apps/frontend/src/pages/DashboardPage.tsx`

**Imports pattern** (DashboardPage.tsx lines 1-17):
```typescript
import { CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { DashboardStats } from '@kartex/shared'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
```
`ImportPage.tsx` follows the same import order: lucide icons → react hooks → react-router → sonner → `@kartex/shared` types → `@/lib/api` → shadcn components → local hooks.

**Page title pattern** (DashboardPage.tsx lines 23-25):
```typescript
useEffect(() => {
  document.title = 'Dashboard — Kartex'
}, [])
```
`ImportPage.tsx`: `document.title = 'Import — Kartex'`

**Loading state pattern** (DashboardPage.tsx lines 47-53):
```typescript
if (loading) {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  )
}
```
Copy exactly for the config-fetch loading state.

**Page wrapper layout pattern** (DashboardPage.tsx line 57):
```typescript
<div className="max-w-2xl mx-auto px-4 py-8">
```
`ImportPage.tsx` uses the same `max-w-2xl mx-auto px-4 py-8` wrapper for consistent page width.

**toast.error pattern** (DashboardPage.tsx lines 33-38):
```typescript
try {
  const res = await api.get('/api/dashboard/stats')
  if (res.ok) {
    setStats((await res.json()) as DashboardStats)
  } else {
    toast.error('Could not load your cards. Please refresh.')
  }
} catch {
  toast.error('Could not reach the server. Check your connection.')
}
```
Copy this try/catch/toast.error structure for the config fetch and the import POST.

**Named export pattern** (DashboardPage.tsx line 18):
```typescript
export function DashboardPage() {
```
`ImportPage.tsx` uses: `export function ImportPage()`

---

### `apps/frontend/src/hooks/useImport.ts` (hook, request-response)

**Analog:** `apps/frontend/src/hooks/useStudySession.ts`

**Imports pattern** (useStudySession.ts lines 1-4):
```typescript
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { DueCard } from '@kartex/shared'
import { api } from '@/lib/api'
```
`useImport.ts` follows the same order: react hooks → sonner → `@kartex/shared` types → `@/lib/api`.

**State machine shape pattern** (useStudySession.ts lines 9-25):
```typescript
interface UseStudySessionReturn {
  currentCard: DueCard | null
  face: CardFace
  isFlipping: boolean
  sessionDone: boolean
  progress: { current: number; total: number }
  ratingCounts: RatingCounts
  flip: () => void
  rate: (rating: 1 | 2 | 3 | 4) => void
}
```
`useImport.ts` defines a typed return interface at the top. The import state machine has steps:
```typescript
export type ImportStep = 'idle' | 'uploading' | 'success' | 'error'

interface UseImportReturn {
  step: ImportStep
  maxFileSizeBytes: number | null
  configError: boolean
  selectFile: (file: File) => void
  selectedFile: File | null
  submitImport: (deckName: string) => Promise<void>
  result: { deckId: string; cardCount: number; warnings: ParseWarning[] } | null
  error: string | null
  reset: () => void
}
```

**`useState` initialization pattern** (useStudySession.ts lines 28-34):
```typescript
const [currentIndex, setCurrentIndex] = useState(0)
const [face, setFace] = useState<CardFace>('front')
const [isFlipping, setIsFlipping] = useState(false)
const [sessionDone, setSessionDone] = useState(false)
const [ratingCounts, setRatingCounts] = useState<RatingCounts>({
  again: 0, hard: 0, good: 0, easy: 0,
})
```
Flat `useState` declarations at the top of the hook body, one per state atom.

**`useCallback` async pattern** (useStudySession.ts lines 56-93):
```typescript
const rate = useCallback(
  async (rating: 1 | 2 | 3 | 4) => {
    // ...
    try {
      const res = await api.post('/api/study/rate', { cardId: card.id, rating })
      if (!res.ok) {
        toast.error('Failed to save your rating. Please try again.')
        return
      }
    } catch {
      toast.error('Failed to save your rating. Please try again.')
      return
    }
    // advance state
  },
  [cards, currentIndex, mode]
)
```
`submitImport` in `useImport.ts` follows this pattern: `useCallback(async () => { ... }, [deps])` with `try/catch/toast.error`.

**FormData upload — CRITICAL difference from `api.post()`:**
`api.post()` calls `JSON.stringify(body)` unconditionally (api.ts line 71). For multipart upload, use `baseFetch` directly. Add a `postForm` helper to `api.ts` (open question from RESEARCH.md §3 recommends this):
```typescript
// Add to api.ts (apps/frontend/src/lib/api.ts lines 64-88):
postForm(url: string, formData: FormData, options?: RequestInit): Promise<Response> {
  return baseFetch(url, { ...options, method: 'POST', body: formData })
},
```
Then in `useImport.ts`:
```typescript
const res = await api.postForm('/api/import', formData)
```

**`useEffect` for data fetch on mount pattern** (useStudySession.ts lines 96-114 — keyboard handler; DashboardPage.tsx lines 42-44 for data fetch):
```typescript
useEffect(() => {
  void fetchStats()
}, [])
```
`useImport.ts` uses the same pattern for the config fetch on hook initialization:
```typescript
useEffect(() => {
  void fetchConfig()
}, [])
```

**Named export pattern** (useStudySession.ts line 27):
```typescript
export function useStudySession(cards: DueCard[], mode: StudyMode): UseStudySessionReturn {
```
`useImport.ts`: `export function useImport(): UseImportReturn`

---

### `apps/frontend/src/lib/__tests__/kartex-parser.test.ts` (test, transform)

**Analog:** `apps/frontend/src/lib/__tests__/sm2.test.ts`

**Imports pattern** (sm2.test.ts lines 1-2):
```typescript
import { describe, it, expect } from 'vitest'
import { calculateSM2, calculateStreak } from '@kartex/shared'
```
`kartex-parser.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { parseKartex } from '@kartex/shared'
```
Import the function under test directly from `@kartex/shared` — NOT from the source file path. This tests through the barrel export, matching the established pattern.

**`describe` + `it` block structure** (sm2.test.ts lines 4-82):
```typescript
describe('calculateSM2', () => {
  const defaults = { repetitions: 0, easeFactor: 2.5, interval: 1 }

  it('Again (quality=0) resets interval to 1 and repetitions to 0', () => {
    const result = calculateSM2({ quality: 0, repetitions: 3, easeFactor: 2.5, interval: 15 })
    expect(result.interval).toBe(1)
    expect(result.repetitions).toBe(0)
  })
  // ...
})

describe('calculateStreak', () => {
  const today = new Date('2026-05-28')

  it('returns 0 for empty array', () => {
    expect(calculateStreak([], today)).toBe(0)
  })
  // ...
})
```
One `describe` block per exported function. Shared fixture constants at the top of the block. `it()` descriptions are behavior-first, not implementation-first.

**Test fixture pattern** (sm2.test.ts line 5):
```typescript
const defaults = { repetitions: 0, easeFactor: 2.5, interval: 1 }
```
`kartex-parser.test.ts` defines shared `.kartex` fixture strings at the top of the describe block:
```typescript
const VALID_KARTEX = `---
deck: Test Deck
author: Test Author
tags: [physics, math]
---
:: card
front: What is 1+1?
back: 2
::
`
```

**Assertion pattern** (sm2.test.ts lines 8-11):
```typescript
const result = calculateSM2({ quality: 0, repetitions: 3, easeFactor: 2.5, interval: 15 })
expect(result.interval).toBe(1)
expect(result.repetitions).toBe(0)
```
`kartex-parser.test.ts` assertion style:
```typescript
const result = parseKartex(VALID_KARTEX)
// type narrowing before accessing fields
if ('fatal' in result) throw new Error('Expected parse success')
expect(result.deck.deck).toBe('Test Deck')
expect(result.cards).toHaveLength(1)
expect(result.warnings).toHaveLength(0)
```

---

## Modified Files

### `packages/shared/src/index.ts` — barrel export

**Current state** (index.ts lines 1-8):
```typescript
export * from './schemas/user'
export * from './schemas/auth'
export * from './schemas/inviteCode'
export * from './schemas/deck'
export * from './schemas/card'
export * from './schemas/media'
export * from './schemas/study'
export * from './lib/sm2'
```

**Add two lines at the end** (follow existing order — schemas first, then lib):
```typescript
export * from './schemas/import'
export * from './lib/kartex-parser'
```

---

### `apps/backend/src/index.ts` — router registration

**Current registration pattern** (index.ts lines 43-50):
```typescript
// ─── 5. Deck + Card routes (JWT required — inherited from step 4) ─────────────
app.route('/api/decks', decksRouter)

// ─── 5b. Media protected route (POST /upload — auth required) ────────────────
app.route('/api/media', mediaRouter)

// ─── 5c. Study + Dashboard routes (JWT required — inherited from step 4) ──────
app.route('/api/study', studyRouter)
app.route('/api/dashboard', dashboardRouter)
```

**Add import registration after `authMiddleware` (step 4), before admin (step 6):**
```typescript
// ─── 5d. Import route (JWT required — inherited from step 4) ──────────────────
app.route('/api/import', importRouter)
```
Also add to imports at top of file:
```typescript
import { importRouter } from './routes/import.js'
```
Follow the `.js` extension convention used by all other route imports (media.ts line 10: `from './routes/media.js'`).

---

### `apps/frontend/src/App.tsx` — route wiring

**Current ComingSoon placeholder** (App.tsx line 78):
```typescript
<Route path="/import" element={<ComingSoon title="Import" />} />
```

**Replace with:**
```typescript
<Route path="/import" element={<ImportPage />} />
```

**Add to imports** (App.tsx lines 9-16, following the alphabetical page import pattern):
```typescript
import { ImportPage } from '@/pages/ImportPage'
```

---

## Shared Patterns

### Authentication — Apply to all backend route files

**Source:** `apps/backend/src/index.ts` lines 40-40
```typescript
app.use('/api/*', authMiddleware)
```
All `/api/import/*` routes are automatically protected by the global `authMiddleware` registered at step 4 of `index.ts`. The `importRouter` does NOT need to apply `authMiddleware` itself — it is inherited. The router accesses `userId` via `c.get('userId')` (set by the middleware upstream).

**Source:** `apps/backend/src/routes/media.ts` line 49
```typescript
const media = new Hono<{ Variables: { userId: string } }>()
```
The `<{ Variables: { userId: string } }>` generic is required on the router for TypeScript to know `c.get('userId')` is valid. Copy exactly.

### Error Handling — Backend routes

**Source:** `apps/backend/src/routes/media.ts` lines 57-59
```typescript
if (!(file instanceof File)) {
  return c.json({ error: 'File is required.' }, 400)
}
```
All error responses use `c.json({ error: '...' }, statusCode)`. Status codes: 400 bad request, 413 too large, 422 unprocessable, 404 not found. No other error shape.

### Error Handling — Frontend

**Source:** `apps/frontend/src/pages/DashboardPage.tsx` lines 33-39
```typescript
try {
  const res = await api.get('/api/dashboard/stats')
  if (res.ok) {
    setStats((await res.json()) as DashboardStats)
  } else {
    toast.error('Could not load your cards. Please refresh.')
  }
} catch {
  toast.error('Could not reach the server. Check your connection.')
}
```
All fetch calls: try/catch, `res.ok` check, `toast.error()` on failure. No `console.error`. `finally { setLoading(false) }` to clear loading state.

### Media Storage — Backend

**Source:** `apps/backend/src/routes/media.ts` lines 61-80
```typescript
const storagePath = process.env.STORAGE_PATH ?? '/app/media'
await mkdir(storagePath, { recursive: true })
const filename = randomUUID() + ext
const fullPath = join(storagePath, filename)
await writeFile(fullPath, new Uint8Array(await file.arrayBuffer()))
await prisma.media.create({
  data: { ownerId: userId, filename, mimeType: file.type, storagePath: fullPath, sizeBytes: file.size },
})
```
**Apply to:** `apps/backend/src/routes/import.ts` for bundled zip media files. Use `detected.mime` (from `fileTypeFromBuffer`) instead of `file.type` for `mimeType` to use authoritative magic bytes value.

### Path Traversal Prevention — Backend

**Source:** `apps/backend/src/routes/media.ts` lines 16-18
```typescript
if (!/^[A-Za-z0-9_-]+\.[a-z0-9]{1,10}$/.test(filename)) {
  return c.json({ error: 'Invalid filename.' }, 400)
}
```
**Apply to:** ZIP entry media filenames before writing to disk. Use `path.basename(entry.path)` to strip any directory prefix from ZIP entry paths — never write the raw entry path to disk.

### Zod Schema + Type Export — Shared Package

**Source:** `packages/shared/src/schemas/study.ts` lines 4-10
```typescript
export const RatingSchema = z.union([...])
export type Rating = z.infer<typeof RatingSchema>
```
Every schema in `import.ts` must be immediately paired with its inferred type export.

### `api.ts` FormData Upload (new `postForm` helper)

**Source:** `apps/frontend/src/lib/api.ts` lines 64-88 (current `api` object)
```typescript
export const api = {
  get(url: string, options?: RequestInit): Promise<Response> {
    return baseFetch(url, { ...options, method: 'GET' })
  },
  post(url: string, body?: unknown, options?: RequestInit): Promise<Response> {
    return baseFetch(url, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  },
  // ...
}
```
`api.post()` always calls `JSON.stringify` — it CANNOT be used for FormData. Add `postForm` to the `api` object (modify `api.ts`):
```typescript
postForm(url: string, formData: FormData, options?: RequestInit): Promise<Response> {
  return baseFetch(url, { ...options, method: 'POST', body: formData })
},
```
`baseFetch` already handles the `FormData` case correctly (lines 17-19: skips `Content-Type: application/json` when `body instanceof FormData`).

---

## No Analog Found

All files have analogs in the codebase. No files require falling back to RESEARCH.md patterns exclusively.

| File | Note |
|------|------|
| `apps/backend/src/routes/import.ts` | Analog is `media.ts` (exact). New elements (bodyLimit, unzipper, file-type) are single-function library calls with patterns fully specified in RESEARCH.md §Code Examples. |

---

## Metadata

**Analog search scope:** `packages/shared/src/`, `apps/backend/src/`, `apps/frontend/src/`
**Files read:** 11 (2 context files + 9 analog/target files)
**Pattern extraction date:** 2026-05-28
