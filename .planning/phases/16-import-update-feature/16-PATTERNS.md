# Phase 16: Import Update Feature - Pattern Map

**Mapped:** 2026-06-10
**Files analyzed:** 8
**Analogs found:** 8 / 8

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/backend/src/routes/deckUpdate.ts` | route | request-response (multipart) | `apps/backend/src/routes/import.ts` | exact |
| `apps/backend/src/index.ts` | config | request-response | itself (lines 58–69) | exact |
| `apps/frontend/src/components/DeckUpdateModal.tsx` | component | request-response (two-phase) | `apps/frontend/src/components/CardEditorModal.tsx` | role-match |
| `apps/frontend/src/pages/DeckDetailPage.tsx` | page (edit) | request-response | itself (lines 352–367) | exact |
| `apps/frontend/src/locales/en.json` | config | — | itself (existing key structure) | exact |
| `apps/frontend/src/locales/de.json` | config | — | itself (existing key structure) | exact |
| `apps/backend/src/routes/__tests__/deck-update.test.ts` | test | — | `apps/backend/src/routes/__tests__/stats-summary.test.ts` | role-match |
| `apps/frontend/src/components/__tests__/DeckUpdateModal.test.tsx` | test | — | `apps/frontend/src/components/__tests__/StatsSummaryPanel.test.tsx` | exact |

---

## Pattern Assignments

### `apps/backend/src/routes/deckUpdate.ts` (route, request-response / multipart)

**Analog:** `apps/backend/src/routes/import.ts`

**Imports pattern** (lines 1–11):
```typescript
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { Prisma } from '@prisma/client'
import { parseKartex } from '@kartex/shared'
import { prisma } from '../lib/prisma.js'
```
Add `DeckUpdatePreviewSchema` / `DeckUpdateResultSchema` from `@kartex/shared` per RESEARCH.md §Standard Stack.

**Router declaration pattern** (import.ts line 35):
```typescript
const deckUpdateRouter = new Hono<{ Variables: { userId: string } }>()
```

**bodyLimit-first pattern** (import.ts lines 46–52) — bodyLimit MUST be the first argument, before the async handler:
```typescript
deckUpdateRouter.post(
  '/:id/update/preview',
  bodyLimit({
    maxSize: MAX_BYTES,
    onError: (c) =>
      c.json({ error: `File too large. Maximum size is ${MAX_BYTES} bytes.` }, 413),
  }),
  async (c) => {
    const userId = c.get('userId')
    // ...
  },
)
```

**Owner auth check + parseBody pattern** (import.ts lines 53–88, adapted for owner check from decks.ts):
```typescript
const { id: deckId } = c.req.param()
const userId = c.get('userId')

const deck = await prisma.deck.findUnique({ where: { id: deckId } })
if (!deck) return c.json({ error: 'Not found.' }, 404)
if (deck.ownerId !== userId) return c.json({ error: 'Forbidden.' }, 403)

const body = await c.req.parseBody()
const file = body['file']
if (!(file instanceof File)) return c.json({ error: 'File is required.' }, 400)

const normalizedName = file.name.replace(/\\/g, '/')
if (!normalizedName.endsWith('.kartex') || normalizedName.endsWith('.kartex.zip')) {
  return c.json({ error: 'File must be a .kartex file.' }, 400)
}

const text = Buffer.from(await file.arrayBuffer()).toString('utf-8')
const parseResult = parseKartex(text)
if ('fatal' in parseResult) return c.json({ error: parseResult.message }, 422)
```

**Prisma transaction pattern** (import.ts lines 92–112):
```typescript
await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
  if (diff.addedCards.length > 0) {
    await tx.card.createMany({ data: diff.addedCards.map((fc) => ({
      deckId, frontContent: fc.front, backContent: fc.back, tags: fc.tags, kartexId: fc.id ?? null,
    })) })
  }
  for (const { fileCard, deckCard } of diff.updatedCards) {
    await tx.card.update({
      where: { id: deckCard.id },
      data: { frontContent: fileCard.front, backContent: fileCard.back, tags: fileCard.tags },
    })
  }
  if (!keepRemoved && diff.removedIds.length > 0) {
    await tx.card.deleteMany({ where: { id: { in: diff.removedIds } } })
  }
})
```

**Export pattern** (import.ts line 303):
```typescript
export { deckUpdateRouter }
```

---

### `apps/backend/src/index.ts` (config, edit only)

**Analog:** itself, lines 58–69

**Route mount pattern** — copy the comment + `app.route` call pattern:
```typescript
// ─── 5f. Deck update route (JWT required — inherited from step 4) ─────────────
app.route('/api/decks', deckUpdateRouter)
```
Add the import at the top with the other route imports (lines 10–16):
```typescript
import { deckUpdateRouter } from './routes/deckUpdate.js'
```
Place the `app.route` call immediately after the existing `app.route('/api/decks', decksRouter)` line (line 58).

---

### `apps/frontend/src/components/DeckUpdateModal.tsx` (component, request-response two-phase)

**Analog:** `apps/frontend/src/components/CardEditorModal.tsx`

**Imports pattern** (CardEditorModal.tsx lines 1–32, subset for this file):
```typescript
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'
```

**Props interface pattern** (CardEditorModal.tsx lines 37–43):
```typescript
interface DeckUpdateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deckId: string
  file: File | null
  onSuccess: () => void
}
```

**useEffect auto-trigger pattern** (CardEditorModal.tsx lines 70–80 — triggers on `open` change):
```typescript
useEffect(() => {
  if (open && file) {
    void runPreview()
  }
}, [open, file])
```

**State machine pattern** (useImport.ts lines 6, 23–36):
```typescript
type UpdateStep = 'uploading' | 'previewing' | 'applying' | 'done' | 'error'
const [step, setStep] = useState<UpdateStep>('uploading')
const [preview, setPreview] = useState<{ added: number; updated: number; unchanged: number; removed: number } | null>(null)
const [keepRemoved, setKeepRemoved] = useState(true)
const [errorMsg, setErrorMsg] = useState<string | null>(null)
```

**api.postForm pattern** (useImport.ts lines 119–125):
```typescript
const formData = new FormData()
formData.append('file', file)
const res = await api.postForm(`/api/decks/${deckId}/update/preview`, formData)
```

**Apply formData with keepRemoved as string** (useImport.ts line 121, Pitfall 6):
```typescript
const formData = new FormData()
formData.append('file', file)
formData.append('keepRemoved', String(keepRemoved))
const res = await api.postForm(`/api/decks/${deckId}/update/apply`, formData)
```

**Dialog shell pattern** (CardEditorModal.tsx lines 101–106):
```typescript
return (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{t('deckUpdate.modalTitle')}</DialogTitle>
      </DialogHeader>
      {/* state-driven body */}
      <DialogFooter>
        {/* state-driven buttons */}
      </DialogFooter>
    </DialogContent>
  </Dialog>
)
```

**Loader spinner pattern** (DeckDetailPage uses BookOpen + aria-hidden — use same Loader2 pattern from lucide-react):
```typescript
<Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
<p className="text-sm text-muted-foreground">{t('deckUpdate.uploading')}</p>
```

**Diff chip pattern** — source: StatsSummaryPanel chip pattern (UI-SPEC §Diff Count Grid):
```typescript
<div className="grid grid-cols-2 gap-3">
  {[
    { label: t('deckUpdate.added', { count: preview.added }), value: preview.added },
    { label: t('deckUpdate.updated', { count: preview.updated }), value: preview.updated },
    { label: t('deckUpdate.unchanged', { count: preview.unchanged }), value: preview.unchanged },
    { label: t('deckUpdate.removed', { count: preview.removed }), value: preview.removed },
  ].map(({ label, value }) => (
    <div key={label} className="border border-border rounded-lg p-4 min-h-[44px]" role="region" aria-label={label}>
      <p className="text-xs font-normal text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-xl font-semibold text-foreground">{value}</p>
    </div>
  ))}
</div>
```

**Switch row pattern** — source: DeckDetailPage lines 338–342 (isActive toggle):
```typescript
<div className="flex items-start gap-3 mt-4 min-h-[44px]">
  <Switch
    checked={keepRemoved}
    onCheckedChange={setKeepRemoved}
    id="keep-removed-switch"
  />
  <div>
    <label htmlFor="keep-removed-switch" className="text-sm font-semibold text-foreground">
      {t('deckUpdate.keepRemovedLabel')}
    </label>
    <p className="text-xs text-muted-foreground mt-0.5">{t('deckUpdate.keepRemovedHint')}</p>
  </div>
</div>
```

**Error state with role="alert"** (useImport.ts error handling pattern + UI-SPEC §Accessibility):
```typescript
<div role="alert">
  <p className="text-sm font-semibold text-foreground">{t('deckUpdate.errorTitle')}</p>
  <p className="text-sm text-muted-foreground">{errorMsg}</p>
</div>
```

**Footer buttons pattern** (CardEditorModal.tsx lines 195–199):
```typescript
// previewing state:
<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
  {t('common.cancel')}
</Button>
<Button
  type="button"
  variant="default"
  onClick={() => void runApply()}
  disabled={step === 'applying'}
  aria-busy={step === 'applying'}
>
  {step === 'applying' ? t('deckUpdate.applying') : t('deckUpdate.apply')}
</Button>
// error state:
<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
  {t('common.cancel')}
</Button>
```

**toast.success pattern** (CardEditorModal.tsx line 90):
```typescript
toast.success(t('deckUpdate.successToast'))
onSuccess()
onOpenChange(false)
```

---

### `apps/frontend/src/pages/DeckDetailPage.tsx` (page, edit ~20 lines)

**Analog:** itself (lines 352–367 — owner-only block)

**New import to add** (line 28 area, after DeckFormModal import):
```typescript
import { DeckUpdateModal } from '@/components/DeckUpdateModal'
```

**New state to add** (near existing useState declarations):
```typescript
const [updateFile, setUpdateFile] = useState<File | null>(null)
const updateFileInputRef = useRef<HTMLInputElement>(null)
```
Add `useRef` to the existing `useEffect, useState` import on line 2.

**Hidden file input** (place inside JSX, just before or after the existing modals near line 540):
```typescript
<input
  ref={updateFileInputRef}
  type="file"
  accept=".kartex"
  className="sr-only"
  aria-hidden="true"
  onChange={(e) => {
    const file = e.target.files?.[0]
    if (file) setUpdateFile(file)
    e.target.value = ''  // reset so same file re-triggers onChange
  }}
/>
```

**Trigger button** — place inside the existing `{deck.ownerId === user?.id && (...)}` block (line 352), after the "Edit deck" Button (line 354):
```typescript
<Button
  size="sm"
  variant="outline"
  onClick={() => updateFileInputRef.current?.click()}
>
  {t('deckUpdate.updateFromFile')}
</Button>
```

**Modal mount** (alongside DeckFormModal at line 540):
```typescript
<DeckUpdateModal
  open={updateFile !== null}
  onOpenChange={(open) => { if (!open) setUpdateFile(null) }}
  deckId={deckId!}
  file={updateFile}
  onSuccess={fetchCards}
/>
```
`fetchCards` is the existing function that reloads the card list — use whatever function currently refreshes cards after CardEditorModal's `onSuccess`.

---

### `apps/frontend/src/locales/en.json` (config, edit)

**Analog:** itself — existing key structure

Add under the last top-level key block (no nested namespace, flat sibling to `"nav"`, `"auth"`, etc.):
```json
"deckUpdate": {
  "updateFromFile": "Update from file",
  "modalTitle": "Update Deck from File",
  "uploading": "Uploading...",
  "previewHeading": "Changes preview",
  "added": "{{count}} added",
  "updated": "{{count}} updated",
  "unchanged": "{{count}} unchanged",
  "removed": "{{count}} removed",
  "keepRemovedLabel": "Keep removed cards",
  "keepRemovedHint": "When off, cards absent from the file will be deleted.",
  "apply": "Apply changes",
  "applying": "Applying...",
  "successToast": "Deck updated successfully",
  "errorTitle": "Update failed",
  "parseError": "Could not parse the file. Check it is a valid .kartex file.",
  "fileTooLarge": "File is too large."
}
```

---

### `apps/frontend/src/locales/de.json` (config, edit)

**Analog:** itself — same structure as en.json

Add matching block:
```json
"deckUpdate": {
  "updateFromFile": "Aus Datei aktualisieren",
  "modalTitle": "Deck aus Datei aktualisieren",
  "uploading": "Hochladen...",
  "previewHeading": "Änderungsvorschau",
  "added": "{{count}} hinzugefügt",
  "updated": "{{count}} aktualisiert",
  "unchanged": "{{count}} unverändert",
  "removed": "{{count}} entfernt",
  "keepRemovedLabel": "Entfernte Karten behalten",
  "keepRemovedHint": "Wenn deaktiviert, werden Karten, die nicht in der Datei enthalten sind, gelöscht.",
  "apply": "Änderungen übernehmen",
  "applying": "Wird übernommen...",
  "successToast": "Deck erfolgreich aktualisiert",
  "errorTitle": "Aktualisierung fehlgeschlagen",
  "parseError": "Datei konnte nicht verarbeitet werden. Bitte prüfen Sie, ob es eine gültige .kartex-Datei ist.",
  "fileTooLarge": "Datei ist zu groß."
}
```

---

### `apps/backend/src/routes/__tests__/deck-update.test.ts` (test)

**Analog:** `apps/backend/src/routes/__tests__/stats-summary.test.ts`

**File structure pattern** (stats-summary.test.ts lines 1–7):
```typescript
import { describe, it } from 'vitest'

describe('POST /api/decks/:id/update/preview — deck update preview (T-16-01..T-16-05)', () => {
  it.todo('T-16-01: 403 when caller is not deck owner')
  it.todo('T-16-02: 404 when deckId does not exist')
  it.todo('T-16-03: 422 when file is not a .kartex file')
  it.todo('T-16-04: returns correct added/updated/unchanged/removed counts')
  it.todo('T-16-05: cards without kartexId in file → counted as added')
})

describe('POST /api/decks/:id/update/apply — deck update apply (T-16-06..T-16-12)', () => {
  it.todo('T-16-06: 403 when caller is not deck owner')
  it.todo('T-16-07: creates new cards for added bucket')
  it.todo('T-16-08: updates front/back/tags for matched cards; CardProgress untouched')
  it.todo('T-16-09: keepRemoved=true — absent deck cards remain')
  it.todo('T-16-10: keepRemoved=false — absent deck cards deleted')
  it.todo('T-16-11: transaction is atomic — if update fails, no partial changes')
  it.todo('T-16-12: userId is taken from JWT (c.get(\'userId\')), never from request body')
})
```

Wave 1 implementation should replace `.todo` stubs with assertions using vitest mocks. Mock `prisma` from `../lib/prisma.js` (same pattern as other route tests in the backend suite).

---

### `apps/frontend/src/components/__tests__/DeckUpdateModal.test.tsx` (test)

**Analog:** `apps/frontend/src/components/__tests__/StatsSummaryPanel.test.tsx`

**File structure pattern** (StatsSummaryPanel.test.tsx lines 1–18):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock react-i18next: t returns key, with basic {{count}} interpolation
const mockT = vi.fn((key: string, opts?: { count?: number }) => {
  if (opts?.count !== undefined) return key.replace('{{count}}', String(opts.count))
  return key
})
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockT }),
}))

// Mock api (import AFTER mocks)
vi.mock('@/lib/api', () => ({
  api: { postForm: vi.fn() },
}))

// Import AFTER mock setup
import { DeckUpdateModal } from '@/components/DeckUpdateModal'
```

**Test stubs following the it.todo pattern for Wave 0:**
```typescript
describe('DeckUpdateModal (T-16-FE-01..T-16-FE-06)', () => {
  it.todo('T-16-FE-01: uploading state — shows spinner while preview fetch is in-flight')
  it.todo('T-16-FE-02: previewing state — shows diff counts after preview fetch succeeds')
  it.todo('T-16-FE-03: keepRemoved toggle — default state is checked (true)')
  it.todo('T-16-FE-04: Apply button triggers apply fetch with keepRemoved value')
  it.todo('T-16-FE-05: error state — shows error message on preview fetch failure')
  it.todo('T-16-FE-06: done — calls onSuccess() and closes modal on successful apply')
})
```

Wave 1 assertions should use `screen.getByRole`, `screen.getByText`, `userEvent.click` from `@testing-library/user-event` — same approach as StatsSummaryPanel.test.tsx.

---

## Shared Patterns

### Authentication / userId extraction
**Source:** `apps/backend/src/routes/import.ts` line 54
**Apply to:** Both handlers in `deckUpdate.ts`
```typescript
const userId = c.get('userId')
```
userId is ALWAYS from `c.get('userId')` (JWT), never from URL params or request body (T-16-12).

### Owner gate
**Source:** `apps/frontend/src/pages/DeckDetailPage.tsx` line 352 (frontend), backend pattern from RESEARCH.md §Pattern 1
**Apply to:** Both `deckUpdate.ts` route handlers (backend) and button render (DeckDetailPage)
```typescript
// Backend
const deck = await prisma.deck.findUnique({ where: { id: deckId } })
if (!deck) return c.json({ error: 'Not found.' }, 404)
if (deck.ownerId !== userId) return c.json({ error: 'Forbidden.' }, 403)

// Frontend (DeckDetailPage)
{deck.ownerId === user?.id && ( <Button ...> )}
```

### File input value reset (re-selection)
**Source:** RESEARCH.md §Pitfall 4 (derived from ImportPage.tsx pattern)
**Apply to:** DeckDetailPage hidden file input `onChange`
```typescript
onChange={(e) => {
  const file = e.target.files?.[0]
  if (file) setUpdateFile(file)
  e.target.value = ''  // REQUIRED — allows same file to be re-selected
}}
```

### i18n hook
**Source:** `apps/frontend/src/components/CardEditorModal.tsx` line 52
**Apply to:** DeckUpdateModal.tsx, DeckDetailPage.tsx (already present)
```typescript
const { t } = useTranslation()
```

### toast.success / toast.error
**Source:** `apps/frontend/src/components/CardEditorModal.tsx` lines 90, 93
**Apply to:** DeckUpdateModal.tsx success path
```typescript
toast.success(t('deckUpdate.successToast'))  // on apply success
// error is shown inline in modal body, not via toast
```

---

## No Analog Found

All files have close analogs in the codebase. No entries required.

---

## Metadata

**Analog search scope:** `apps/backend/src/routes/`, `apps/frontend/src/components/`, `apps/frontend/src/hooks/`, `apps/frontend/src/pages/`, `apps/backend/src/routes/__tests__/`, `apps/frontend/src/components/__tests__/`
**Files scanned:** 9 (import.ts, index.ts, CardEditorModal.tsx, DeckDetailPage.tsx, useImport.ts, stats-summary.test.ts, StatsSummaryPanel.test.tsx, en.json, de.json)
**Pattern extraction date:** 2026-06-10
