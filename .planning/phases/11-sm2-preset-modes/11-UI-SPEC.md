# Phase 11: SM-2 Preset Modes — UI Spec

## Pages / Components Affected

1. **SettingsPage** (`apps/frontend/src/pages/SettingsPage.tsx`) — new page
2. **StudySessionPage** (`apps/frontend/src/pages/StudySessionPage.tsx`) — mode indicator added
3. **App.tsx** — `/settings` route updated to use SettingsPage

---

## SettingsPage Layout

```
Settings — Kartex (document.title)

┌─────────────────────────────────────────┐
│ Settings                                 │ ← h1 text-2xl font-bold
│                                          │
│ ┌────────────────────────────────────┐   │
│ │ Study Mode                          │   │ ← Card with CardHeader + CardContent
│ │ Controls how aggressively your SM-2 │   │
│ │ intervals are compressed. Applied   │   │
│ │ server-side — raw interval is never │   │
│ │ modified.                           │   │
│ │                                     │   │
│ │  ○ Normal                           │   │ ← RadioGroupItem
│ │    Standard SM-2 scheduling         │   │
│ │                                     │   │
│ │  ○ Intensive                        │   │
│ │    Reviews at ½ interval            │   │
│ │                                     │   │
│ │  ○ Exam Prep                        │   │
│ │    Reviews at ¼ interval            │   │
│ └────────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Component: RadioGroup (shadcn)

- `<RadioGroup value={studyMode} onValueChange={handleModeChange}>`
- Three `<RadioGroupItem value="normal" | "intensive" | "exam_prep" />`
- Each item has a `<Label>` (mode name) and a `<p className="text-sm text-muted-foreground">` (description)
- Row layout: `<div className="flex items-start gap-3">` with the RadioGroupItem and the label+desc block
- Auto-save: PATCH fires on `onValueChange` — no explicit Save button

### Behavior

- On mount: `studyMode` comes from `useAuth().user?.studyMode ?? 'normal'`
- On change: optimistic update (`setUser(...)`) → PATCH `/api/auth/me` → success toast or error toast + revert
- `useAuth` is already imported — `setUser` from the context value is available

---

## StudySessionPage Mode Indicator

### Position

In `SessionRunner`, alongside `<SessionProgress>` in the session header row.

Current session header area (lines 147–152):
```tsx
<div className="flex items-center justify-between mb-4">
  ...
  <SessionProgress current={...} total={...} />
  ...
</div>
```

Add the Badge inside this row:
```tsx
<div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-2">
    <SessionProgress current={...} total={...} />
    {studyMode !== 'normal' && (
      <Badge variant="secondary" className="text-xs shrink-0">
        {t(`settings.modeNames.${studyMode}`)}
      </Badge>
    )}
  </div>
  ...
</div>
```

### Badge variants

- `variant="secondary"` for both Intensive and Exam Prep (they differ by mode name only)
- No icon — keep it minimal, text-only badge
- `Badge` component already exists (`apps/frontend/src/components/ui/badge.tsx`)

### SessionRunner Prop

Add `studyMode: string` to `SessionRunner` props interface:
```typescript
function SessionRunner({
  cards,
  mode,
  examDurationSeconds,
  deckId,
  studyMode,
}: {
  ...
  studyMode: string
})
```

`StudySessionPage` passes: `studyMode={user?.studyMode ?? 'normal'}`

---

## Design Constraints

- Semantic color tokens only (`text-muted-foreground`, `border-border`, etc.) — no hardcoded hex or Tailwind `gray-*`
- RadioGroup items use existing `Label` component pattern
- Both pages stay under 500 lines
- `t('settings.modeNames.${studyMode}')` — never render raw enum string (D-07)

---

## i18n Key Inventory

All keys to be added to both `en.json` and `de.json` in Plan 11-01:

```json
// en.json additions
"settings": {
  "title": "Settings — Kartex",
  "pageHeading": "Settings",
  "studyModeSection": "Study Mode",
  "studyModeDesc": "Controls how aggressively your SM-2 review intervals are compressed. The raw interval stored per card is never modified — only the next review date shifts.",
  "modeNames": {
    "normal": "Normal",
    "intensive": "Intensive",
    "exam_prep": "Exam Prep"
  },
  "modeNormalDesc": "Standard SM-2 scheduling",
  "modeIntensiveDesc": "Reviews at ½ interval — doubles revisit frequency",
  "modeExamPrepDesc": "Reviews at ¼ interval — maximum revisit frequency",
  "saved": "Study mode saved",
  "saveFailed": "Failed to save — please try again"
}
```

```json
// de.json additions (same structure)
"settings": {
  "title": "Einstellungen — Kartex",
  "pageHeading": "Einstellungen",
  "studyModeSection": "Lernmodus",
  "studyModeDesc": "Steuert, wie stark deine SM-2-Wiederholungsintervalle komprimiert werden. Das gespeicherte Intervall pro Karte wird nie verändert — nur das Datum der nächsten Wiederholung verschiebt sich.",
  "modeNames": {
    "normal": "Normal",
    "intensive": "Intensiv",
    "exam_prep": "Prüfungsvorbereitung"
  },
  "modeNormalDesc": "Standard-SM-2-Planung",
  "modeIntensiveDesc": "Wiederholungen bei ½ Intervall — doppelte Häufigkeit",
  "modeExamPrepDesc": "Wiederholungen bei ¼ Intervall — maximale Häufigkeit",
  "saved": "Lernmodus gespeichert",
  "saveFailed": "Speichern fehlgeschlagen — bitte erneut versuchen"
}
```

---

## Registry Safety

Only `@radix-ui/react-radio-group` is installed as a new package. Installed via `npx shadcn@latest add radio-group` (official shadcn registry only). No third-party or unvetted packages.
