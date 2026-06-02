# Phase 10: Active Deck Rotation — Research

**Researched:** 2026-06-02
**Domain:** Prisma schema migration, Hono API extension, React state management, shadcn/ui component installation
**Confidence:** HIGH

---

## Summary

Phase 10 adds `Deck.isActive` (Boolean, default true) to the Prisma schema and wires up a toggle on DecksPage and DeckDetailPage. The `/study` global start path — currently an immediate auto-commit — gains a new start screen with a deck picker and session size picker. The backend `/api/study/due` endpoint needs an `isActive` filter so only cards from active decks are returned in the global queue.

The UI design contract (10-UI-SPEC.md) is fully approved and prescribes every JSX structure, Tailwind class, i18n key, and edge-case behavior. All frontend work follows existing patterns already established in StudySessionPage.tsx and DecksPage.tsx. No new architectural patterns are introduced — this phase extends existing patterns uniformly.

Phase 10 also lays the `User.studyMode` column needed by Phase 11. The two columns are added in a single migration per the locked v1.2-research decision.

**Primary recommendation:** One Prisma migration, two new shadcn components (Switch + Checkbox), extend `UpdateDeckSchema` to accept `isActive`, add `isActive` filter to `/api/study/due`, replace the isGlobalSR auto-commit with a start screen, add 11 new i18n keys to both locale files. No library upgrades required.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DECK-01 | User can mark a deck active/inactive via toggle on deck list and deck detail page; persists after browser refresh | `Deck.isActive` column + PATCH /api/decks/:id with `isActive` field + optimistic UI on DecksPage/DeckDetailPage |
| DECK-02 | `/study` global session only queues cards from active decks | `/api/study/due` must filter on `deck.isActive === true` in the OR query for owned and shared decks |
| DECK-03 | `/study` start screen shows deck picker listing all active decks, pre-checked; uncheck is session-only, does not change `isActive` | New start screen component in StudySessionPage — `committedConfig` extended with `deckIds` field; `selectedDeckIds` state drives per-session filter |
| DECK-04 | `/study` start screen has session size picker matching the existing `/decks/:id/learn` picker | Reuse `SIZE_OPTIONS` and segmented button row pattern from StudySessionPage (lines 218–382) |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Persist `Deck.isActive` | Database / Storage | — | Stored on Deck row; owner-scoped; must survive browser refresh |
| Toggle active state from UI | Frontend (React) | API / Backend | Optimistic flip in local state; confirmed via PATCH; revert on error |
| Filter global study queue to active decks only | API / Backend | — | `isActive` filter belongs server-side — client cannot be trusted to omit decks |
| Deck picker per-session state | Frontend (React) | — | `selectedDeckIds` is ephemeral UI state, never persisted; lives only for session lifetime |
| Session size picker state | Frontend (React) | — | Same as existing SIZE_OPTIONS — pure client-side slice |
| `deckIds` passed to card loading | Frontend (React) | — | `committedConfig` extended with `deckIds`; load effect filters fetched cards by deckId membership |

---

## Standard Stack

### Core (all already in project — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | ^7.0.0 | ORM + migration | [ASSUMED] Already used — `apps/backend/package.json` |
| Hono | existing | API routes | [ASSUMED] Already used |
| React + Vite + TypeScript | existing | Frontend | [ASSUMED] Already used |
| Zod | existing | Schema validation | [ASSUMED] Single source of truth in `packages/shared` |
| i18next / react-i18next | existing | Translations | [ASSUMED] Phase 9 |
| sonner | existing | Toast notifications | [ASSUMED] Already used in DecksPage and DeckDetailPage |

### New shadcn Components Required

Per UI-SPEC §Design System — not currently in `apps/frontend/src/components/ui/`:

| Component | Install Command | Status |
|-----------|----------------|--------|
| Switch | `npx shadcn@latest add switch` | NOT installed — confirmed by glob of ui/ directory (13 files, no switch.tsx) |
| Checkbox | `npx shadcn@latest add checkbox` | NOT installed — confirmed by glob of ui/ directory (13 files, no checkbox.tsx) |

Both are official shadcn components from the official registry — no third-party registry involvement. [VERIFIED: 10-UI-SPEC.md §Registry Safety]

---

## Package Legitimacy Audit

No new npm packages are installed in this phase. The two new UI components (Switch, Checkbox) are installed via `npx shadcn@latest add`, which copies component source files into the project — they are not npm dependencies. No audit required.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (React SPA)
  │
  ├─ DecksPage / DeckDetailPage
  │     └─ Switch toggle → optimistic isActive flip
  │           └─ PATCH /api/decks/:id { isActive: boolean }
  │                 └─ Hono decks route → Prisma Deck.update
  │
  ├─ StudySessionPage (isGlobalSR === true)
  │     ├─ Start screen (committedConfig === null)
  │     │     ├─ GET /api/decks → active decks list (isActive filter on client)
  │     │     ├─ GET /api/study/due → due counts per deck
  │     │     ├─ DeckPickerItem × N (Checkbox, pre-checked)
  │     │     ├─ Session size picker (SIZE_OPTIONS, same pattern)
  │     │     └─ "Start session" → setCommittedConfig({ ..., deckIds })
  │     │
  │     └─ Card loading (committedConfig !== null)
  │           └─ GET /api/study/due
  │                 └─ Hono study route → Prisma query with isActive filter
  │                       └─ client-side deckIds filter (from committedConfig.deckIds)
  │
PostgreSQL 16
  └─ Deck table (+ isActive BOOLEAN DEFAULT true)
  └─ User table (+ studyMode TEXT DEFAULT 'normal')  [Phase 11 prep]
```

### Recommended File Touch Points

```
apps/backend/prisma/
  └─ schema.prisma                    ← add isActive to Deck, studyMode to User
apps/backend/prisma/migrations/
  └─ <timestamp>_add_isactive_studymode/migration.sql   ← generated by prisma migrate dev

apps/backend/src/routes/
  └─ decks.ts                         ← UpdateDeckSchema already handles partial updates; isActive added via schema extension
  └─ study.ts                         ← GET /api/study/due: add isActive filter to deckFilter

packages/shared/src/schemas/
  └─ deck.ts                          ← DeckSchema + DeckListItemSchema gain isActive: z.boolean().default(true)
                                       UpdateDeckSchema inherits via CreateDeckSchema.partial() — add isActive to CreateDeckSchema

apps/frontend/src/components/ui/
  └─ switch.tsx                       ← npx shadcn@latest add switch
  └─ checkbox.tsx                     ← npx shadcn@latest add checkbox

apps/frontend/src/pages/
  └─ DecksPage.tsx                    ← isActive toggle in CardFooter + opacity wrapper
  └─ DeckDetailPage.tsx               ← isActive toggle in header button group (owner-only)
  └─ StudySessionPage.tsx             ← replace auto-commit with start screen (isGlobalSR branch)

apps/frontend/src/locales/
  └─ en.json                          ← 11 new keys (decks.activeLabel, decks.toggleActive, etc.)
  └─ de.json                          ← same 11 keys in German
```

### Pattern 1: Prisma Schema Addition (zero-downtime)

**What:** Add columns with `@default` so existing rows receive the default value automatically — no data migration needed.

**When to use:** Adding optional or defaulted fields to existing tables on a live database.

```prisma
// Source: STATE.md — v1.2-research locked decision
model Deck {
  // ... existing fields ...
  isActive  Boolean  @default(true)
}

model User {
  // ... existing fields ...
  studyMode  String  @default("normal")
}
```

Generated migration SQL will be `ALTER TABLE "Deck" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;` — zero downtime because existing rows receive `true` immediately. [ASSUMED — standard PostgreSQL behavior for NOT NULL DEFAULT]

### Pattern 2: Extending UpdateDeckSchema for isActive

**What:** `isActive` must flow through the shared Zod schema so the backend validates the PATCH body and TypeScript types stay in sync.

**Current state:** `CreateDeckSchema` defines `title`, `description`, `visibility`. `UpdateDeckSchema = CreateDeckSchema.partial()`. Neither has `isActive`.

**Change needed:** Add `isActive: z.boolean().optional()` to `CreateDeckSchema` — it propagates automatically to `UpdateDeckSchema` via `.partial()`.

```typescript
// Source: packages/shared/src/schemas/deck.ts — current pattern
export const CreateDeckSchema = z.object({
  title: z.string().min(1, 'Title is required.').max(200),
  description: z.string().max(2000).optional(),
  visibility: z.enum(['PRIVATE', 'SHARED', 'PUBLIC']).default('PRIVATE'),
  isActive: z.boolean().optional(),   // ADD THIS
})
// DeckSchema and DeckListItemSchema also need isActive: z.boolean().default(true)
```

### Pattern 3: Optimistic Toggle in React

**What:** Flip local state immediately, send PATCH in background, revert and toast on failure. Established by existing `handleDelete` in DecksPage.

**When to use:** Toggle actions where the round-trip is fast and the user benefits from instant feedback.

```typescript
// Source: DecksPage.tsx handleDelete pattern — adapted for toggle
const handleToggleActive = async (deckId: string, checked: boolean) => {
  // Optimistic update
  setDecks((prev) =>
    prev.map((d) => d.id === deckId ? { ...d, isActive: checked } : d)
  )
  try {
    const res = await api.patch(`/api/decks/${deckId}`, { isActive: checked })
    if (!res.ok) throw new Error('PATCH failed')
    toast.success(checked ? t('decks.activatedToast') : t('decks.deactivatedToast'))
  } catch {
    // Revert optimistic update
    setDecks((prev) =>
      prev.map((d) => d.id === deckId ? { ...d, isActive: !checked } : d)
    )
    toast.error(t('decks.failedToToggle'))
  }
}
```

### Pattern 4: isGlobalSR Start Screen Injection

**What:** Replace the immediate `isGlobalSR` auto-commit with a conditional start screen rendered when `committedConfig === null`.

**Current behavior (line 204–206):**
```typescript
// StudySessionPage.tsx — current isGlobalSR auto-commit
const [committedConfig, setCommittedConfig] = useState<CommittedConfig>(
  isGlobalSR ? { mode: 'sr', tags: new Set(), size: 'all', count: 1 } : null,
)
```

**New behavior:** Initialize to `null` for both global and deck-specific routes. Add a new conditional branch in the render tree.

```typescript
// New: always null on mount — start screen shows for isGlobalSR === true
const [committedConfig, setCommittedConfig] = useState<CommittedConfig>(null)

// New state for start screen
const [selectedDeckIds, setSelectedDeckIds] = useState<Set<string>>(new Set())
const [activeDecks, setActiveDecks] = useState<DeckPickerDeck[]>([])

// Render order:
// 1. if (!selectedMode && !isGlobalSR)  →  mode selector (existing deck-specific)
// 2. if (isGlobalSR && !committedConfig) →  start screen (NEW)
// 3. if (loadingCards || cards === null)  →  loading
// 4. return <SessionRunner>
```

**CommittedConfig type extension:**
```typescript
type CommittedConfig = {
  mode: StudyMode
  tags: Set<string>
  size: 'all' | 10 | 20 | 'custom'
  count: number
  deckIds?: string[]   // ADD: undefined = all active decks (legacy paths); Set used only at start screen
} | null
```

The card loading effect then filters: `data.filter(c => !committedConfig.deckIds || committedConfig.deckIds.includes(c.deckId))`.

### Pattern 5: isActive Filter in /api/study/due

**What:** The `deckFilter` in `GET /api/study/due` currently includes all owned + shared decks. It must also check `isActive === true` for owned decks.

**Current deckFilter (study.ts lines 23–28):**
```typescript
const deckFilter = {
  OR: [
    { ownerId: userId },
    { id: { in: sharedDeckIds } },
  ],
}
```

**New deckFilter:**
```typescript
const deckFilter = {
  OR: [
    { ownerId: userId, isActive: true },
    { id: { in: sharedDeckIds } },   // shared decks: isActive check deferred (owner-only scope in v1.2)
  ],
}
```

Per REQUIREMENTS.md §Future Requirements: "Per-user active state for shared decks is a future requirement — owner-only `isActive` is correct for 2-5 user scale." Shared deck isActive is not filtered in v1.2.

### Anti-Patterns to Avoid

- **Mutating CommittedConfig after session start:** `committedConfig` is a snapshot — do not let start screen state changes affect it once committed (existing CR-02/WR-03 discipline).
- **Translating deck.title:** All deck title rendering uses direct JSX, never `t(deck.title)` — established D-07 rule.
- **Storing selectedDeckIds in committedConfig as a Set:** Pass `[...selectedDeckIds]` to `committedConfig.deckIds` — Set is not serializable and the existing CommittedConfig type uses plain values.
- **Adding isActive filter to /api/study/deck/:deckId:** This endpoint powers deck-specific study (always active regardless of isActive flag per UI-SPEC §1 Note). Do NOT add isActive filter there.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toggle switch UI | Custom styled `<button>` with ARIA | shadcn `Switch` | Radix UI handles keyboard, ARIA, focus ring, animation |
| Checkbox UI | Custom styled `<input type="checkbox">` | shadcn `Checkbox` | Radix UI handles indeterminate state, ARIA, keyboard |
| Optimistic update revert | Complex diff + rollback | Simple state map with revert on catch | Existing pattern in DecksPage works; don't over-engineer |
| Prisma migration | Manual SQL ALTER TABLE | `prisma migrate dev` | Generates migration, updates Prisma Client types, maintains migration history |

---

## Common Pitfalls

### Pitfall 1: isActive Missing from DeckListItemSchema

**What goes wrong:** Backend starts returning `isActive` in responses after migration, but the Zod schema on the shared package doesn't include it. TypeScript narrowing on the frontend will treat `deck.isActive` as `unknown` or `undefined`, causing the Switch to always appear unchecked.

**Why it happens:** `DeckListItemSchema` extends `DeckSchema` — both need `isActive: z.boolean().default(true)`.

**How to avoid:** Add `isActive` to `DeckSchema` first; `DeckListItemSchema` inherits it via `.extend()`.

**Warning signs:** TypeScript error `Property 'isActive' does not exist on type 'DeckListItem'`.

### Pitfall 2: CommittedConfig Initialized to Non-null for Global SR

**What goes wrong:** If the `useState` initializer for `committedConfig` remains `isGlobalSR ? { ... } : null`, the start screen never renders for `/study` — the session starts immediately with no deck filtering.

**Why it happens:** The change to the initializer is the core behavioral change for DECK-02/03/04.

**How to avoid:** Change initializer to always `null`. The mode-selector branch (`!selectedMode`) already guards the deck-specific flow; the new global start screen branch must guard the `isGlobalSR` flow.

**Warning signs:** Opening `/study` jumps straight to loading cards without showing the start screen.

### Pitfall 3: DeckDetailPage Toggle Visible to Non-Owners

**What goes wrong:** Toggle is shown to shared deck users, who cannot own the isActive flag.

**Why it happens:** DeckDetailPage already has `deck.ownerId === user?.id` conditionals for Edit/Delete — the same guard must wrap the new Switch.

**How to avoid:** Wrap Switch render in `{deck.ownerId === user?.id && (<div>...</div>)}` per UI-SPEC §3.2 and §States — shared deck behavior.

**Warning signs:** Non-owner users see the toggle; PATCH returns 403 since the route is owner-only.

### Pitfall 4: deckIds Filter Client-Side vs. Server-Side

**What goes wrong:** DECK-02 requires the global study queue to only surface cards from active decks. If the isActive filter is only applied in the start screen's card fetch (client-side slice), a user who bypasses the start screen still gets all cards.

**Why it happens:** Two separate enforcement points needed: (1) server enforces isActive for the global queue baseline, (2) client enforces per-session deckIds selection on top.

**How to avoid:** The server-side filter in `/api/study/due` is mandatory for DECK-02. The client-side `deckIds` filter in the load effect is additive for DECK-03.

**Warning signs:** DECK-02 acceptance test: close browser and reopen `/study` via URL — cards from inactive decks appear.

### Pitfall 5: Missing i18n Keys in de.json

**What goes wrong:** 11 new keys are added to `en.json` but only 10 are added to `de.json`. The German locale silently falls back to the English key string, not the English value.

**Why it happens:** Copy-paste oversight. The project uses i18next which falls back to the key name (not the English value) when a key is missing from the active locale — visible as raw key strings in German UI.

**How to avoid:** Always update both `en.json` and `de.json` in the same commit, using the copywriting contract from UI-SPEC §Copywriting Contract.

### Pitfall 6: Prisma 7 datasource requires no `url` field in schema

**What goes wrong:** The project uses Prisma 7 with `@prisma/adapter-pg` (driver adapter mode). The `datasource db` block in `schema.prisma` has no `url` field — the URL is passed at runtime via `new PrismaPg(url)`. Running `prisma migrate dev` requires `DATABASE_URL` to be set in the environment.

**Why it happens:** Prisma 7 driver adapter mode — `datasource db { provider = "postgresql" }` with no `url` field is intentional.

**How to avoid:** Run `prisma migrate dev --name add_isactive_studymode` with `DATABASE_URL` set (already required for the dev workflow). The migration generates correctly regardless.

---

## Code Examples

### Verified Patterns from Codebase

#### Prisma schema change (both columns in one migration)
```prisma
// apps/backend/prisma/schema.prisma
model Deck {
  // ... existing fields ...
  isActive  Boolean  @default(true)   // ADD
}

model User {
  // ... existing fields ...
  studyMode String  @default("normal")  // ADD (consumed by Phase 11)
}
```

#### Zod schema extension for isActive
```typescript
// packages/shared/src/schemas/deck.ts
export const DeckSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  visibility: z.enum(['PRIVATE', 'SHARED', 'PUBLIC']),
  ownerId: z.string(),
  isActive: z.boolean().default(true),   // ADD
  createdAt: z.string(),
  updatedAt: z.string(),
  _count: z.object({ cards: z.number() }).optional(),
})
```

#### /api/study/due with isActive filter
```typescript
// apps/backend/src/routes/study.ts — deckFilter update
const deckFilter = {
  OR: [
    { ownerId: userId, isActive: true },   // CHANGED: add isActive: true
    { id: { in: sharedDeckIds } },
  ],
}
```

#### DeckPickerDeck type for start screen
```typescript
// In StudySessionPage.tsx — local type for deck picker display
type DeckPickerDeck = {
  id: string
  title: string
  dueCount: number
}
```

#### i18n keys inventory (new keys — both locales)
```json
// en.json additions
"decks": {
  // ...existing...
  "activeLabel": "Active",
  "toggleActive": "Toggle deck active",
  "activatedToast": "Deck added to study queue",
  "deactivatedToast": "Deck removed from study queue",
  "failedToToggle": "Failed to update deck — try again"
},
"study": {
  // ...existing...
  "globalTitle": "Study session",
  "globalSubtitle": "Choose which active decks to include in this session.",
  "chooseDecks": "Choose decks",
  "startSession": "Start session",
  "backToDashboard": "Back to Dashboard",
  "noActiveDecks": "No active decks",
  "noActiveDecksHint": "Go to My Decks and toggle at least one deck active to study."
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Auto-start global study session | Start screen with deck picker | Phase 10 | Users must click "Start session" — one extra tap but full control |
| All owned decks in global queue | Only `isActive=true` owned decks in global queue | Phase 10 | Users who only want to study specific decks no longer get noise from dormant decks |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `studyMode String @default("normal")` stores study mode as a plain string on User — Phase 11 will read/write this column | Standard Stack, Architecture Patterns | Low — Phase 11 depends on this column; wrong type would require another migration |
| A2 | Prisma 7 with driver adapter generates standard `ALTER TABLE ADD COLUMN` migration SQL | Pitfall 6, Patterns §1 | Very low — standard Postgres behavior confirmed by existing migration files |
| A3 | Shared deck `isActive` is not filtered server-side (owner-only scope for v1.2) | Patterns §5 | Low — explicitly stated in REQUIREMENTS.md §Future Requirements |

---

## Open Questions

1. **Due count per deck in picker**
   - What we know: The start screen shows `{count} cards due` per deck. The current `/api/study/due` returns all due cards (post-migration: only from active decks). Counts per deck can be derived client-side by filtering the response by `deckId`.
   - What's unclear: Whether the start screen should make one GET `/api/study/due` prefetch (and group by deckId client-side) or whether a new endpoint is needed.
   - Recommendation: Reuse the single `/api/study/due` call — group by `deckId` client-side. Same pattern as the existing `deckDueCount` calculation at line 248–250 of StudySessionPage.tsx. No new endpoint needed.

2. **Active decks list source**
   - What we know: The deck picker needs a list of active decks. The frontend already fetches `/api/decks` on DecksPage.
   - What's unclear: Whether StudySessionPage should make its own `/api/decks` call or reuse a shared store.
   - Recommendation: StudySessionPage makes its own `GET /api/decks` on mount (when isGlobalSR). Filter `decks.filter(d => d.isActive)` client-side. No shared store needed — consistent with existing pattern of each page fetching its own data.

---

## Environment Availability

Step 2.6: SKIPPED (no new external tools — all dependencies are already present in the project. The two new shadcn components copy source files; `npx shadcn@latest` is the same command already used in previous phases per STATE.md decisions 04-03).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 + @testing-library/react |
| Config file | `apps/frontend/vitest.config.ts` |
| Quick run command | `yarn workspace @kartex/frontend run test --run` |
| Full suite command | `yarn workspace @kartex/frontend run test --run` |

**Current suite state:** 9 test files, 67 tests — all passing (confirmed by run above).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DECK-01 | isActive toggle renders with correct initial state; PATCH called on toggle | unit | `yarn workspace @kartex/frontend run test --run src/pages/__tests__/DecksPage.test.tsx` | ❌ Wave 0 |
| DECK-01 | Optimistic revert on PATCH failure; toast.error shown | unit | same file | ❌ Wave 0 |
| DECK-01 | DeckDetailPage toggle hidden for non-owner | unit | `yarn workspace @kartex/frontend run test --run src/pages/__tests__/DeckDetailPage.test.tsx` | ✅ exists — extend |
| DECK-02 | /api/study/due only returns cards from isActive=true decks | unit (backend) | `yarn workspace @kartex/backend run test --run` (if backend test infra exists) | ❌ — see note |
| DECK-03 | Start screen renders when isGlobalSR === true and committedConfig === null | unit | `yarn workspace @kartex/frontend run test --run src/pages/__tests__/StudySessionPage.test.tsx` | ✅ exists — extend |
| DECK-03 | All active decks are pre-checked; unchecking does not change isActive | unit | same file | ✅ exists — extend |
| DECK-03 | Start session disabled when no decks selected | unit | same file | ✅ exists — extend |
| DECK-04 | Session size picker renders; "custom" shows number input | unit | same file | ✅ exists — extend |

**Backend test note:** No backend test infrastructure found (`apps/backend` has no test directory or vitest config). DECK-02 backend filter is verified manually (acceptance test: create deck, set isActive=false, start /study, verify no cards from that deck appear) or via integration test if backend infra is added. This is pre-existing test coverage gap — not introduced by Phase 10.

### Sampling Rate

- **Per task commit:** `yarn workspace @kartex/frontend run test --run`
- **Per wave merge:** `yarn workspace @kartex/frontend run test --run`
- **Phase gate:** Full suite (67 + new tests) green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `apps/frontend/src/pages/__tests__/DecksPage.test.tsx` — covers DECK-01 (toggle render, optimistic update, revert on error)
- [ ] Extend `StudySessionPage.test.tsx` — add test cases for global start screen render, deck picker pre-check, disabled CTA when no decks selected, session size picker

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Existing JWT cookie auth unchanged |
| V3 Session Management | no | No new session state |
| V4 Access Control | yes | isActive toggle: PATCH /api/decks/:id already checks `deck.ownerId !== userId` → 403; no change needed |
| V5 Input Validation | yes | `isActive: z.boolean()` in UpdateDeckSchema — Zod rejects non-boolean values |
| V6 Cryptography | no | No new crypto |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| User toggles another user's deck isActive | Tampering | Existing `deck.ownerId !== c.get('userId')` check in PATCH /api/decks/:id — returns 403 |
| User sends `isActive: "true"` (string) | Tampering | Zod `z.boolean()` rejects — returns 400 with validation error |
| User bypasses start screen, hits /api/study/due directly | Tampering | Server-side isActive filter in deckFilter — inactive deck cards never returned regardless of client state |

---

## Sources

### Primary (HIGH confidence)
- `apps/backend/prisma/schema.prisma` — current Prisma schema (verified field names, no isActive on Deck, no studyMode on User)
- `apps/backend/src/routes/study.ts` — current deckFilter implementation (lines 23–28)
- `apps/backend/src/routes/decks.ts` — existing PATCH handler (ownership check confirmed at line 108)
- `apps/frontend/src/pages/StudySessionPage.tsx` — isGlobalSR auto-commit at line 204–206; SIZE_OPTIONS at 218–223; load effect at 260–307
- `apps/frontend/src/pages/DecksPage.tsx` — optimistic delete pattern (lines 69–82); CardFooter layout (lines 132–176)
- `apps/frontend/src/pages/DeckDetailPage.tsx` — owner guard pattern (lines 324–339); useAuth import confirmed
- `packages/shared/src/schemas/deck.ts` — DeckSchema and DeckListItemSchema (no isActive field confirmed)
- `.planning/phases/10-active-deck-rotation/10-UI-SPEC.md` — approved UI design contract (all JSX, classes, i18n keys)
- `.planning/STATE.md` — locked decisions: single combined migration, studyMode on User model
- `.planning/REQUIREMENTS.md` — DECK-01/02/03/04 acceptance criteria; deferred items (shared deck isActive)
- `apps/frontend/src/locales/en.json` + `de.json` — complete i18n key inventory (no existing study.globalTitle etc.)
- `apps/frontend/src/components/ui/` — glob confirmed Switch and Checkbox NOT installed (13 files, none are switch.tsx or checkbox.tsx)
- Test run: 67/67 passing — baseline confirmed

### Secondary (MEDIUM confidence)
- `apps/backend/package.json` — Prisma 7.0.0 confirmed [ASSUMED version behavior matches standard Postgres driver adapter pattern]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already present, no new npm dependencies
- Architecture: HIGH — all patterns derived directly from existing source files
- Pitfalls: HIGH — identified from direct code reading of affected files
- UI spec: HIGH — 10-UI-SPEC.md is approved and fully prescriptive
- Backend filter change: HIGH — deckFilter pattern read directly from study.ts

**Research date:** 2026-06-02
**Valid until:** 2026-07-02 (stable stack, 30-day window)
