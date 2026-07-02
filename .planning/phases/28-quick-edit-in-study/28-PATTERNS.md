# Phase 28: Quick-Edit in Study - Pattern Map

**Mapped:** 2026-07-01
**Files analyzed:** 6 (1 new, 5 modified)
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `apps/frontend/src/components/StudyCardMenu.tsx` (NEW) | component | request-response (UI action trigger) | `apps/frontend/src/pages/DecksPage.tsx` (lines 218-232, `DropdownMenu` block) | exact |
| `apps/backend/src/routes/study.ts` (`GET /due`, `GET /deck/:deckId`) | route | CRUD (read + permission-derive) | itself, cross-referenced against `apps/backend/src/routes/cards.ts` `getDeckAccess` | exact (self) + role-match (permission helper) |
| `packages/shared/src/schemas/study.ts` (`DueCardSchema`) | model (Zod schema) | transform | itself (existing schema, additive field) | exact |
| `apps/frontend/src/components/CardEditorModal.tsx` | component | request-response (form submit) | itself (existing component, additive callback) | exact |
| `apps/frontend/src/pages/StudySessionPage.tsx` (`SessionRunner` + parent) | component | CRUD (local state merge) + request-response (navigate) | itself, cross-referenced against `handleLeave` (line 52-55) for the navigate pattern | exact |
| `apps/backend/src/routes/__tests__/study*.test.ts` (extend) | test | — | `apps/backend/src/routes/__tests__/sharing.test.ts`, `study-rate-reviewlog.test.ts` (`it.todo` convention) | exact |

## Pattern Assignments

### `apps/frontend/src/components/StudyCardMenu.tsx` (component, request-response) — NEW FILE

**Analog:** `apps/frontend/src/pages/DecksPage.tsx` lines 1-25 (imports), 218-232 (`DropdownMenu` usage) — this is the ONLY place in the frontend (besides `AdminPage.tsx`) that uses the shadcn `DropdownMenu` primitive; `DeckDetailPage.tsx` does NOT use `DropdownMenu` despite CONTEXT.md's citation of it — use `DecksPage.tsx` as the analog.

**Imports pattern** (`DecksPage.tsx` lines 1, 20-25):
```tsx
import { MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
```

**Core trigger + menu pattern** (`DecksPage.tsx` lines 218-232, no destructive item needed for this new component since neither action is destructive):
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button size="sm" variant="ghost" aria-label={t('decks.moreActions')}>
      <MoreVertical className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => openEdit(deck)}>
      {t('decks.editButton')}
    </DropdownMenuItem>
    <DropdownMenuItem
      className="text-destructive focus:text-destructive"
      onClick={() => setDeleteTargetId(deck.id)}
    >
      {t('decks.deleteButton')}
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Adapted for `StudyCardMenu`** (no destructive styling, two neutral actions, `MoreVertical` icon for visual consistency — NOT `MoreHorizontal` as the original folded todo suggested):
```tsx
interface StudyCardMenuProps {
  onEdit: () => void
  onJumpToDeck: () => void
}

export function StudyCardMenu({ onEdit, onJumpToDeck }: StudyCardMenuProps) {
  const { t } = useTranslation()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" aria-label={t('study.cardMenuAriaLabel')}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>{t('study.editThisCard')}</DropdownMenuItem>
        <DropdownMenuItem onClick={onJumpToDeck}>{t('study.jumpToDeck')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```
No `e.stopPropagation()` on the trigger — D-01 places it in the progress row, structurally outside `CardFlip`'s click zone (confirmed by reading `CardFlip.tsx`: the flip zone is a single `div` with `onClick`/`role="button"` wrapping only front/back faces).

**i18n note:** follow the `t('decks.moreActions')` / `t('decks.editButton')` naming style — add `study.cardMenuAriaLabel`, `study.editThisCard`, `study.jumpToDeck` keys to the same locale JSON files `decks.*` lives in.

---

### `apps/backend/src/routes/study.ts` (route, CRUD) — MODIFY EXISTING FILE

**Analog for the permission distinction:** `apps/backend/src/routes/cards.ts` lines 13-26, `getDeckAccess` helper — DO NOT invent a new permission rule; mirror this exact owner/EDIT-or-MANAGE/READ/none distinction:
```ts
async function getDeckAccess(
  deckId: string,
  userId: string,
): Promise<'owner' | 'editor' | 'reader' | null> {
  const deck = await prisma.deck.findUnique({ where: { id: deckId }, select: { ownerId: true } })
  if (!deck) return null
  if (deck.ownerId === userId) return 'owner'
  const share = await prisma.deckShare.findUnique({
    where: { deckId_sharedWithUserId: { deckId, sharedWithUserId: userId } },
    select: { permission: true },
  })
  if (!share) return null
  return share.permission === 'READ' ? 'reader' : 'editor'
}
```

**Current `GET /api/study/due` code to extend** (`study.ts` lines 17-95, verbatim as of this read):
```ts
study.get('/due', async (c) => {
  const userId = c.get('userId')
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)

  // Deck IDs shared with this user where the share is active (D-03, D-10)
  const sharedRows = await prisma.deckShare.findMany({
    where: { sharedWithUserId: userId, isActive: true },
    select: { deckId: true },              // <-- ADD `permission: true` here
  })
  const activeSharedDeckIds = sharedRows.map((r: { deckId: string }) => r.deckId)

  const deckFilter = {
    OR: [
      { ownerId: userId, isActive: true },
      { id: { in: activeSharedDeckIds } },
    ],
  }

  const dueWithProgress = await prisma.cardProgress.findMany({
    where: { userId, nextReview: { lte: endOfToday }, card: { deck: deckFilter } },
    include: {
      card: {
        include: { deck: { select: { id: true, title: true } } },   // <-- ADD `ownerId: true`
      },
    },
    orderBy: { nextReview: 'asc' },
  })
  // ... neverSeen query, same `deck: { select: { id: true, title: true } }` needs `ownerId: true` too

  const progressCards = dueWithProgress.map((p) => ({
    id: p.card.id,
    deckId: p.card.deckId,
    deckTitle: p.card.deck.title,
    frontContent: p.card.frontContent,
    backContent: p.card.backContent,
    tags: p.card.tags,
    easeFactor: p.easeFactor,
    interval: p.interval,
    repetitions: p.repetitions,
    nextReview: p.nextReview.toISOString(),
    // <-- ADD: canEdit: p.card.deck.ownerId === userId || editableSharedDeckIds.has(p.card.deckId),
  }))
  // same addition needed in the `newCards` map
})
```

**Current `GET /api/study/deck/:deckId` code to extend** (`study.ts` lines 99-138, verbatim):
```ts
study.get('/deck/:deckId', async (c) => {
  const userId = c.get('userId')
  const deckId = c.req.param('deckId')

  const deck = await prisma.deck.findUnique({ where: { id: deckId } })   // already selects ownerId (full row)
  if (!deck) return c.json({ error: 'Not found.' }, 404)
  let share: { permission: string; isActive: boolean } | null = null   // widen select if reused for canEdit
  if (deck.ownerId !== userId) {
    share = await prisma.deckShare.findUnique({
      where: { deckId_sharedWithUserId: { deckId, sharedWithUserId: userId } },
      // current select is default (all fields) — this endpoint currently discards `permission`
    })
    if (!share) return c.json({ error: 'Forbidden.' }, 403)
    // NOTE: does NOT currently check share.isActive (pre-existing gap, see Pitfall 5) —
    // when computing canEdit, explicitly AND with share.isActive per RESEARCH.md recommendation
  }

  const cards = await prisma.card.findMany({
    where: { deckId },
    include: {
      progress: { where: { userId }, take: 1 },
      deck: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const result = cards.map((card) => {
    const progress = card.progress[0]
    return {
      id: card.id,
      deckId: card.deckId,
      deckTitle: deck.title,
      frontContent: card.frontContent,
      backContent: card.backContent,
      tags: card.tags,
      easeFactor: progress?.easeFactor ?? 2.5,
      interval: progress?.interval ?? 1,
      repetitions: progress?.repetitions ?? 0,
      nextReview: progress?.nextReview.toISOString(),
      // <-- ADD: canEdit: deck.ownerId === userId
      //           || (share?.permission === 'EDIT' || share?.permission === 'MANAGE') && share.isActive,
    }
  })
})
```

**Error handling pattern** (both endpoints, consistent across file): `if (!x) return c.json({ error: '...' }, 404 | 403)` — plain Hono early-return, no try/catch wrapper, no centralized error middleware in this file. Follow this exact style for any new branch logic.

---

### `packages/shared/src/schemas/study.ts` (model/Zod schema) — MODIFY EXISTING FILE

**Current `DueCardSchema`** (lines 30-41, verbatim):
```ts
export const DueCardSchema = z.object({
  id: z.string(),
  deckId: z.string(),
  deckTitle: z.string(),
  frontContent: z.string(),
  backContent: z.string(),
  tags: z.array(z.string()),
  easeFactor: z.number().default(2.5),
  interval: z.number().default(1),
  repetitions: z.number().default(0),
  nextReview: z.string().optional(),
  // <-- ADD: canEdit: z.boolean(),
})
```
Add as a required boolean (not `.optional()`) since both backend endpoints will always compute and include it — matches the pattern of other required fields in this schema (no precedent for optional booleans here).

---

### `apps/frontend/src/components/CardEditorModal.tsx` (component, request-response) — MODIFY EXISTING FILE

**Current props interface** (lines 37-43):
```ts
interface CardEditorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deckId: string
  card?: Card
  onSuccess: () => void
}
```

**Current `onSubmit` handler** (lines 82-99, verbatim):
```ts
const onSubmit = async (data: CardFormInput) => {
  const tags = tagInput.split(',').map((tag) => tag.trim()).filter(Boolean)
  const payload = { ...data, tags }
  try {
    const res = isEdit && card
      ? await api.patch(`/api/decks/${deckId}/cards/${card.id}`, payload)
      : await api.post(`/api/decks/${deckId}/cards`, payload)
    if (res.ok) {
      toast.success(isEdit ? t('cardEditor.cardUpdated') : t('cardEditor.cardAdded'))
      onOpenChange(false)
      onSuccess()
      // <-- response body currently discarded; must add:
      //     const updated = await res.json()
      //     onCardUpdated?.(updated)   (new optional prop, called only when present)
    } else {
      toast.error(t('common.somethingWrong'))
    }
  } catch {
    toast.error(t('common.somethingWrong'))
  }
}
```

**Type-mismatch note (Pitfall 3):** `card?: Card` (full `CardSchema`: `id, deckId, frontContent, backContent, tags, createdAt, updatedAt`). The study session's `DueCard` type lacks `createdAt`/`updatedAt` and has extra fields. Since only `frontContent`/`backContent`/`tags` are read internally (lines 54, 59-61, 73-77), widen the prop type to `Pick<Card, 'id' | 'deckId' | 'frontContent' | 'backContent' | 'tags'>` rather than fabricating timestamps on the `DueCard` object passed in from `SessionRunner`.

**Existing call site to keep compiling unchanged:** `DeckDetailPage.tsx` calls `<CardEditorModal ... onSuccess={...} />` with no `onCardUpdated` — make the new prop optional (`onCardUpdated?: (updated: Pick<Card, ...>) => void`).

---

### `apps/frontend/src/pages/StudySessionPage.tsx` (`SessionRunner` + parent) — MODIFY EXISTING FILE

**Current imports** (lines 1-19):
```tsx
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Brain, BookOpen, Timer, Trophy, CheckCircle2 } from 'lucide-react'
import type { DueCard, DeckListItem } from '@kartex/shared'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { CardFlip } from '@/components/CardFlip'
import { RatingButtons } from '@/components/RatingButtons'
import { ExamTimer } from '@/components/ExamTimer'
import { SessionProgress } from '@/components/SessionProgress'
import { useStudySession, type StudyMode } from '@/hooks/useStudySession'
import { useAuth } from '@/context/AuthContext'
import { shuffle } from '@/lib/shuffle'
// <-- ADD: import { StudyCardMenu } from '@/components/StudyCardMenu'
// <-- ADD: import { CardEditorModal } from '@/components/CardEditorModal'
```

**`SessionRunner` prop signature** (lines 24-38, verbatim) — `cards` is a prop, no local setter exists:
```tsx
function SessionRunner({
  cards,
  mode,
  examDurationSeconds,
  deckId,
  studyMode,
  onRestart,
  // <-- ADD: onCardUpdated,
}: {
  cards: DueCard[]
  mode: StudyMode
  examDurationSeconds: number | null
  deckId?: string
  studyMode: string
  onRestart: () => void
  // <-- ADD: onCardUpdated: (updated: DueCard) => void
}) {
```

**Progress row — exact insertion point for `StudyCardMenu`** (lines 144-152, verbatim):
```tsx
{/* Progress: Card N of M + deck badge (STUDY-04) + optional mode indicator badge (SM2-04) */}
<div className="flex items-center gap-2 mb-3 shrink-0">
  <SessionProgress current={progress.current} total={progress.total} />
  <Badge variant="secondary" className="text-xs shrink-0" aria-label={t('study.deckBadgeAriaLabel', { deckTitle: currentCard.deckTitle })}>{currentCard.deckTitle}</Badge>
  {studyMode !== 'normal' && (
    <Badge variant="secondary" className="text-xs shrink-0">
      {t(`settings.modeNames.${studyMode}`)}
    </Badge>
  )}
  {/* <-- ADD: {currentCard.canEdit && <StudyCardMenu onEdit={...} onJumpToDeck={...} />} */}
</div>
```
This row is a sibling of `<CardFlip>` (line 157+), not a child — confirms D-01/D-02 need no click-zone guard.

**`handleLeave` — navigate-without-confirmation precedent for "Jump to deck"** (lines 52-55, verbatim):
```ts
const handleLeave = () => {
  if (deckId) navigate(`/decks/${deckId}`)
  else navigate('/dashboard')
}
```
**Do not reuse `handleLeave` directly** — "Jump to deck" (SEDIT-03) always targets `currentCard.deckId` (the card's own deck, correct even in global SR mode spanning multiple decks), not the `deckId` prop (`undefined` in global SR mode). Use `navigate(`/decks/${currentCard.deckId}`)` inline, following the same "no confirmation" style.

**Parent state — `cards` ownership and `SessionRunner` call site** (lines 335, 726-729, verbatim):
```ts
const [cards, setCards] = useState<DueCard[] | null>(null)
// ...
return (
  <SessionRunner
    cards={cards}
    mode={selectedMode}
    examDurationSeconds={examDurationSeconds}
    // <-- ADD:
    // onCardUpdated={(updated) =>
    //   setCards((prev) => prev?.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)) ?? prev)
    // }
    ...
  />
)
```
**Critical:** the PATCH response is `Card`-shaped, not `DueCard`-shaped — always spread-merge (`{ ...c, ...updated }`), never full-replace, or `deckTitle`/`easeFactor`/`interval`/`repetitions`/`nextReview`/`canEdit` will be dropped and crash the `Badge` render (`currentCard.deckTitle` becomes `undefined`).

---

### Backend tests — `it.todo` convention

**Analog:** `apps/backend/src/routes/__tests__/sharing.test.ts`, `apps/backend/src/routes/__tests__/study-rate-reviewlog.test.ts` — both use `it.todo(...)` documentation-only stubs rather than a live Prisma-mock harness for permission-computation behavior. Follow this convention for new `canEdit` test cases in `study.ts` unless explicitly asked to build a live mock harness.

**Frontend test gaps** (`StudySessionPage.test.tsx`, existing file):
- `makeCard()` helper needs `canEdit: boolean` added.
- `vi.mock('@/lib/api', ...)` factory currently mocks only `get`/`post` — add `patch`.
- `useNavigate: () => vi.fn()` creates a fresh unassertable spy per render — hoist a shared spy via `vi.hoisted`, following the existing `mockApiGet` hoisting pattern in this file, to assert "Jump to deck" navigation.

## Shared Patterns

### DropdownMenu shell (component-level UI primitive)
**Source:** `apps/frontend/src/pages/DecksPage.tsx` lines 20-25 (import), 218-232 (usage)
**Apply to:** `StudyCardMenu.tsx` (new)
```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
```

### Owner-or-share permission distinction
**Source:** `apps/backend/src/routes/cards.ts` lines 13-26 (`getDeckAccess`)
**Apply to:** `apps/backend/src/routes/study.ts` (`canEdit` computation in both `GET` endpoints) — reuse the exact `owner / EDIT-or-MANAGE / READ / none` semantics; do not invent a parallel rule.

### Plain early-return error handling (no centralized middleware)
**Source:** `apps/backend/src/routes/study.ts` (existing style throughout) and `cards.ts`
**Apply to:** Any new branches added to `study.ts`'s two `GET` handlers
```ts
if (!deck) return c.json({ error: 'Not found.' }, 404)
if (!share) return c.json({ error: 'Forbidden.' }, 403)
```

### Navigate-without-confirmation
**Source:** `apps/frontend/src/pages/StudySessionPage.tsx` lines 52-55 (`handleLeave`)
**Apply to:** "Jump to deck" action in `StudyCardMenu`/`SessionRunner` — same style, different target (`currentCard.deckId` instead of the `deckId` prop).

### Spread-merge on partial server response
**Source:** N/A (no existing precedent in codebase for this exact merge — new pattern introduced by this phase, documented explicitly in RESEARCH.md Pitfall 1/2)
**Apply to:** `StudySessionPage`'s `onCardUpdated` callback — `{ ...existing, ...patchResponse }`, never a full replace.

## No Analog Found

None — every file in scope has a direct, concrete analog already in the codebase (self-modification for `study.ts`/`study.ts` schema/`CardEditorModal.tsx`/`StudySessionPage.tsx`, cross-file analog for the new `StudyCardMenu.tsx` and the permission-computation logic). This phase is 100% wiring/composition per RESEARCH.md's own conclusion — no net-new capability requiring an external pattern.

## Metadata

**Analog search scope:** `apps/backend/src/routes/`, `apps/frontend/src/components/`, `apps/frontend/src/pages/`, `packages/shared/src/schemas/`
**Files scanned:** `study.ts`, `cards.ts`, `DecksPage.tsx`, `DeckDetailPage.tsx`, `CardEditorModal.tsx`, `StudySessionPage.tsx`, `CardFlip.tsx`, `study.ts` (shared schema), `card.ts` (shared schema), `sharing.test.ts`, `study-rate-reviewlog.test.ts`
**Pattern extraction date:** 2026-07-01
</content>
