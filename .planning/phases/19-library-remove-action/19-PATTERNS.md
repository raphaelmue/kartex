# Phase 19: Library Remove Action — Pattern Map

**Mapped:** 2026-06-13
**Files analyzed:** 4
**Analogs found:** 4 / 4

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/frontend/src/pages/DecksPage.tsx` | component (page) | request-response | itself — extend existing patterns | exact |
| `apps/backend/src/routes/decks.ts` | route/controller | request-response | `PATCH /:id/library` in same file (lines 299–317) | exact |
| `apps/frontend/src/locales/en.json` | config (i18n) | — | `decks.*` keys at lines 95–110 | exact |
| `apps/frontend/src/locales/de.json` | config (i18n) | — | `decks.*` keys at lines 95–110 | exact |

---

## Pattern Assignments

### `apps/frontend/src/pages/DecksPage.tsx` — new state variable

**Analog:** existing `deleteTargetId` state (line 66)

**State shape to mirror** (line 66):
```typescript
const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
```

Add immediately after line 66:
```typescript
const [removeTargetId, setRemoveTargetId] = useState<string | null>(null)
```

---

### `apps/frontend/src/pages/DecksPage.tsx` — new `handleRemoveFromLibrary` function

**Analog:** `handleDelete` (lines 87–100)

**Pattern to copy** (lines 87–100):
```typescript
const handleDelete = async (id: string) => {
  try {
    const res = await api.delete(`/api/decks/${id}`)
    if (res.ok) {
      toast.success(t('decks.deckDeleted'))
      setDecks((prev) => prev.filter((d) => d.id !== id))
      setDeleteTargetId(null)
    } else {
      toast.error(t('common.somethingWrong'))
    }
  } catch {
    toast.error(t('common.somethingWrong'))
  }
}
```

New function — replace endpoint, toast key, and state reset:
```typescript
const handleRemoveFromLibrary = async (id: string) => {
  try {
    const res = await api.delete(`/api/decks/${id}/library`)
    if (res.ok) {
      toast.success(t('decks.removedFromLibraryToast'))
      setDecks((prev) => prev.filter((d) => d.id !== id))
      setRemoveTargetId(null)
    } else {
      toast.error(t('common.somethingWrong'))
    }
  } catch {
    toast.error(t('common.somethingWrong'))
  }
}
```

---

### `apps/frontend/src/pages/DecksPage.tsx` — DropdownMenu in library card footer

**Analog:** owned-deck DropdownMenu (lines 222–239)

**Pattern to copy** (lines 222–239):
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

Insert into the library card footer (after the "Open" Button at line 201, before `</CardFooter>` at line 202). Single item only — no Edit item:
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button size="sm" variant="ghost" aria-label={t('decks.moreActions')}>
      <MoreVertical className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem
      className="text-destructive focus:text-destructive"
      onClick={() => setRemoveTargetId(deck.id)}
    >
      {t('decks.removeFromLibrary')}
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

### `apps/frontend/src/pages/DecksPage.tsx` — AlertDialog for remove confirmation

**Analog:** delete AlertDialog (lines 248–271)

**Pattern to copy** (lines 248–271):
```tsx
<AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => { if (!open) setDeleteTargetId(null) }}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>
        {t('decks.deleteConfirmTitle')}
      </AlertDialogTitle>
      <AlertDialogDescription>
        {t('decks.deleteConfirmBody')}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>
        {t('common.cancel')}
      </AlertDialogCancel>
      {/* Use Button instead of AlertDialogAction to control dismiss timing */}
      <Button
        variant="destructive"
        onClick={() => { if (deleteTargetId) void handleDelete(deleteTargetId) }}
      >
        {t('decks.deleteButton')}
      </Button>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

New remove AlertDialog — place after the existing delete AlertDialog (after line 271, before `<DeckFormModal`):
```tsx
<AlertDialog open={removeTargetId !== null} onOpenChange={(open) => { if (!open) setRemoveTargetId(null) }}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>
        {t('decks.removeFromLibraryTitle')}
      </AlertDialogTitle>
      <AlertDialogDescription>
        {t('decks.removeFromLibraryBody')}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>
        {t('common.cancel')}
      </AlertDialogCancel>
      <Button
        variant="destructive"
        onClick={() => { if (removeTargetId) void handleRemoveFromLibrary(removeTargetId) }}
      >
        {t('decks.removeFromLibraryConfirm')}
      </Button>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

### `apps/backend/src/routes/decks.ts` — new `DELETE /:id/library` route

**Analog:** `PATCH /:id/library` (lines 299–317)

**Pattern to copy** (lines 299–317):
```typescript
// ─── PATCH /api/decks/:id/library — toggle isActive for share recipient ──────
// D-08: only the share recipient (sharedWithUserId === userId) may call this.
decks.patch('/:id/library', async (c) => {
  const { id } = c.req.param()
  const userId = c.get('userId')
  const body = UpdateLibrarySchema.safeParse(await c.req.json())
  if (!body.success) {
    return c.json({ error: 'Validation failed.', details: body.error.flatten() }, 400)
  }
  const share = await prisma.deckShare.findUnique({
    where: { deckId_sharedWithUserId: { deckId: id, sharedWithUserId: userId } },
  })
  if (!share) return c.json({ error: 'Forbidden.' }, 403)
  const updated = await prisma.deckShare.update({
    where: { deckId_sharedWithUserId: { deckId: id, sharedWithUserId: userId } },
    data: { isActive: body.data.isActive },
  })
  return c.json({ isActive: updated.isActive }, 200)
})
```

New route — append after line 317, before `export { decks as decksRouter }` (line 319). No body parsing needed; 204 no-content response:
```typescript
// ─── DELETE /api/decks/:id/library — remove public deck from own library ─────
// D-08: only the share recipient may call this. Deletes DeckShare row only;
// CardProgress rows are preserved (D-09).
decks.delete('/:id/library', async (c) => {
  const { id } = c.req.param()
  const userId = c.get('userId')

  const share = await prisma.deckShare.findUnique({
    where: { deckId_sharedWithUserId: { deckId: id, sharedWithUserId: userId } },
  })
  if (!share) return c.json({ error: 'Forbidden.' }, 403)

  await prisma.deckShare.delete({
    where: { deckId_sharedWithUserId: { deckId: id, sharedWithUserId: userId } },
  })
  return c.body(null, 204)
})
```

---

### `apps/frontend/src/locales/en.json` — 5 new keys

**Analog:** existing `decks` block keys (lines 100–110 of en.json)

**Existing pattern** (lines 100–110):
```json
"deleteButton": "Delete",
"deckDeleted": "Deck deleted",
"moreActions": "More actions",
"deleteConfirmTitle": "Delete deck?",
"deleteConfirmBody": "This cannot be undone."
```

Add after `"deleteConfirmBody"` (line 110), inside the `decks` object:
```json
"removeFromLibrary": "Remove from library",
"removeFromLibraryTitle": "Remove from library?",
"removeFromLibraryBody": "Your study progress for this deck will be preserved. You can re-add it from Explore at any time.",
"removeFromLibraryConfirm": "Remove Deck",
"removedFromLibraryToast": "Deck removed from your library"
```

---

### `apps/frontend/src/locales/de.json` — 5 new keys (same commit as en.json)

**Analog:** existing `decks` block keys (lines 100–110 of de.json)

**Existing pattern** (lines 100–110):
```json
"deleteButton": "Löschen",
"deckDeleted": "Deck gelöscht",
"moreActions": "Weitere Aktionen",
"deleteConfirmTitle": "Deck löschen?",
"deleteConfirmBody": "Dies kann nicht rückgängig gemacht werden."
```

Add after `"deleteConfirmBody"` (line 110), inside the `decks` object:
```json
"removeFromLibrary": "Aus der Bibliothek entfernen",
"removeFromLibraryTitle": "Aus der Bibliothek entfernen?",
"removeFromLibraryBody": "Ihr Lernfortschritt für dieses Deck bleibt erhalten. Sie können es jederzeit über Entdecken erneut hinzufügen.",
"removeFromLibraryConfirm": "Deck entfernen",
"removedFromLibraryToast": "Deck aus Ihrer Bibliothek entfernt"
```

---

## Shared Patterns

### Auth pattern on backend routes
**Source:** `apps/backend/src/routes/decks.ts` lines 301–311
**Apply to:** `DELETE /:id/library`

`userId` is extracted via `c.get('userId')` — injected by `authMiddleware` upstream; no additional auth code needed in the route handler. The `findUnique` + `if (!share) return 403` pattern is the authorization check.

### Optimistic list removal
**Source:** `apps/frontend/src/pages/DecksPage.tsx` lines 92–93
**Apply to:** `handleRemoveFromLibrary`

```typescript
setDecks((prev) => prev.filter((d) => d.id !== id))
setDeleteTargetId(null)  // → setRemoveTargetId(null) for remove
```

No rollback needed on error — the deck was not mutated, only a failed attempt to remove it. Error toast is sufficient.

### Destructive DropdownMenuItem style
**Source:** `apps/frontend/src/pages/DecksPage.tsx` lines 232–237
**Apply to:** library card DropdownMenuItem

```tsx
className="text-destructive focus:text-destructive"
```

No `variant` prop exists on shadcn `DropdownMenuItem` — styling is done exclusively via className.

---

## No Analog Found

None — all four files have exact or strong role-match analogs in the existing codebase.

---

## Metadata

**Analog search scope:** `apps/frontend/src/pages/`, `apps/backend/src/routes/`, `apps/frontend/src/locales/`
**Files scanned:** 4
**Pattern extraction date:** 2026-06-13
