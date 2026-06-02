---
phase: 10-active-deck-rotation
verified: 2026-06-02T15:20:00Z
status: human_needed
score: 4/4
overrides_applied: 0
human_verification:
  - test: "Toggle a deck inactive from DecksPage, navigate to /study, confirm no cards from that deck appear in the queue"
    expected: "Zero cards from the inactive deck surface in the study session"
    why_human: "Server-side isActive filter verified by code inspection; actual DB column existence depends on migration applied at deploy time (hand-written SQL, not prisma migrate dev)"
  - test: "Toggle a deck inactive from DecksPage, then refresh the browser; confirm the toggle remains in the inactive (off) state"
    expected: "Switch is still unchecked after refresh — isActive=false persisted to DB"
    why_human: "Persistence requires the DB column to exist; migration was hand-written and not applied to live DB during Phase 10 execution"
  - test: "Open /study while logged in; confirm the start screen renders (not an auto-started session)"
    expected: "A start screen with a deck picker and session size picker is visible before any cards are shown"
    why_human: "Requires a running app with the DB migration applied"
  - test: "On the /study start screen, uncheck one active deck and click Start session; confirm only cards from the remaining checked decks appear"
    expected: "Cards from the unchecked deck do not appear in the session; isActive flag on that deck is unchanged after the session"
    why_human: "Session-only uncheck behavior requires manual end-to-end validation in a running app"
  - test: "Verify the DB migration has been applied: Deck table has isActive column, User table has studyMode column"
    expected: "psql \\d Deck shows isActive BOOLEAN NOT NULL DEFAULT true; \\d User shows studyMode TEXT NOT NULL DEFAULT 'normal'"
    why_human: "Migration SQL file exists at apps/backend/prisma/migrations/20260602000000_add_isactive_studymode/migration.sql but prisma migrate dev was unavailable during Phase 10 — column existence in the live DB must be confirmed by a developer"
---

# Phase 10: Active Deck Rotation — Verification Report

**Phase Goal:** Users control which decks feed their global study queue, and the /study start screen gives them per-session overrides
**Verified:** 2026-06-02T15:20:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can toggle a deck active/inactive from the deck list and deck detail page; state persists after browser refresh | VERIFIED (code) / UNCERTAIN (DB) | DecksPage.tsx line 85-99: `handleToggleActive` calls `api.patch('/api/decks/:id', { isActive: checked })` with optimistic update + revert. DeckDetailPage.tsx line 207-219: owner-only `handleToggleActive`. Migration SQL exists but not confirmed applied to live DB — human check needed. |
| 2 | /study session only surfaces due cards from decks the user marked active (inactive excluded server-side) | VERIFIED (code) / UNCERTAIN (DB) | study.ts lines 23-28: `deckFilter = { OR: [{ ownerId: userId, isActive: true }, { id: { in: sharedDeckIds } }] }`. Both `cardProgress.findMany` and `card.findMany` use this filter. DB column existence requires human check. |
| 3 | /study start screen shows deck picker with all active decks pre-checked; unchecking is session-only | VERIFIED | StudySessionPage.tsx line 673-688: `if (isGlobalSR && !committedConfig)` renders `GlobalSRStartScreen`. Lines 401-426: prefetch effect filters `allDecks.filter(d => d.isActive)`, builds picker, calls `setSelectedDeckIds(new Set(picker.map(d => d.id)))` (all pre-checked). `toggleDeckSelection` (lines 485-491) mutates only `selectedDeckIds` state — no api.patch called. Test DECK-03c confirms no PATCH call on uncheck. |
| 4 | /study start screen has session size picker (All / 10 / 20 / custom) consistent with /decks/:id/learn | VERIFIED | StudySessionPage.tsx lines 359-365: SIZE_OPTIONS = [all, 10, 20, custom]. GlobalSRStartScreen (lines 279-305) renders the same segmented button row. Test DECK-04a passes: All/10/20/Custom buttons present, clicking Custom reveals spinbutton. |

**Score:** 4/4 truths verified at code level; 1 truth (toggle persistence + server enforcement) has a DB-deployment dependency that requires human confirmation.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/backend/src/routes/study.ts` | isActive:true filter on owned-deck branch | VERIFIED | Lines 23-28: `{ ownerId: userId, isActive: true }` confirmed |
| `apps/frontend/src/pages/DecksPage.tsx` | Switch toggle + handleToggleActive + opacity-60 | VERIFIED | Lines 85-99 (handler), lines 128 (opacity-60 wrapper), lines 152-162 (Switch in CardFooter) |
| `apps/frontend/src/pages/DeckDetailPage.tsx` | Owner-only Switch toggle + handleToggleActive | VERIFIED | Lines 207-219 (handler), lines 336-348 (owner-guarded Switch with `deck.ownerId === user?.id`) |
| `apps/frontend/src/pages/StudySessionPage.tsx` | Start screen with deck picker + size picker + committedConfig=null on mount | VERIFIED | Line 344: `useState<CommittedConfig>(null)`. Lines 673-688: start screen render branch. Lines 495-503: `handleStartSession` sets deckIds. Lines 455-458: deckIds filter in card load effect. |
| `apps/frontend/src/pages/__tests__/DecksPage.test.tsx` | 4 DECK-01 test cases GREEN | VERIFIED | All 4 cases pass (confirmed by test run: 4 passed, 575ms) |
| `apps/frontend/src/pages/__tests__/StudySessionPage.test.tsx` | DECK-03/DECK-04 start screen cases GREEN | VERIFIED | 15 total tests pass (10 pre-existing + 5 new DECK-03/04 cases, confirmed by test run: 15 passed, 1918ms) |
| `packages/shared/src/schemas/deck.ts` | isActive on DeckSchema and CreateDeckSchema | VERIFIED | Line 7: `isActive: z.boolean().optional()` in CreateDeckSchema. Line 20: `isActive: z.boolean().default(true)` in DeckSchema. UpdateDeckSchema and DeckListItemSchema inherit via `.partial()` and `.extend()`. |
| `apps/backend/prisma/schema.prisma` | Deck.isActive Boolean @default(true), User.studyMode String @default("normal") | VERIFIED | Line 77: `isActive    Boolean     @default(true)`. Line 41: `studyMode     String         @default("normal")` |
| `apps/backend/prisma/migrations/20260602000000_add_isactive_studymode/migration.sql` | DDL for isActive + studyMode | VERIFIED (SQL file) / UNCERTAIN (applied to DB) | File confirmed: `ALTER TABLE "Deck" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;` and `ALTER TABLE "User" ADD COLUMN "studyMode" TEXT NOT NULL DEFAULT 'normal';`. Hand-written (prisma migrate dev unavailable without DATABASE_URL). Applied to live DB not confirmed. |
| `apps/frontend/src/components/ui/switch.tsx` | shadcn Switch wrapping @radix-ui/react-switch | VERIFIED | Full forwardRef wrapper with Radix SwitchPrimitives.Root/Thumb, cn() utility, named `Switch` export |
| `apps/frontend/src/components/ui/checkbox.tsx` | shadcn Checkbox wrapping @radix-ui/react-checkbox | VERIFIED | Full forwardRef wrapper with Radix CheckboxPrimitive.Root/Indicator, cn() utility, named `Checkbox` export |
| `apps/frontend/src/locales/en.json` | 12 new keys (5 decks.*, 7 study.*) | VERIFIED | All 12 keys confirmed: activeLabel, toggleActive, activatedToast, deactivatedToast, failedToToggle, globalTitle, globalSubtitle, chooseDecks, startSession, backToDashboard, noActiveDecks, noActiveDecksHint |
| `apps/frontend/src/locales/de.json` | 12 new keys in German | VERIFIED | All 12 keys confirmed with German copy at same positions as en.json |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `DecksPage.tsx` | `PATCH /api/decks/:id` | `api.patch` with `{ isActive: checked }` | VERIFIED | Line 90: `api.patch(\`/api/decks/${deckId}\`, { isActive: checked })`. Test DECK-01c asserts this call with exact args. |
| `DeckDetailPage.tsx` | `PATCH /api/decks/:id` | `api.patch` with `{ isActive: checked }` | VERIFIED | Line 212: `api.patch(\`/api/decks/${deckId}\`, { isActive: checked })`. Owner-only guard on line 336. |
| `study.ts deckFilter` | `prisma Deck filter` | `ownerId: userId, isActive: true` on owned branch | VERIFIED | Lines 23-28: exact pattern `{ ownerId: userId, isActive: true }` confirmed. Both `findMany` calls at lines 31-43 and 49-56 consume this filter. |
| `StudySessionPage` → `GlobalSRStartScreen` | `committedConfig.deckIds` | `handleStartSession` spreads `[...selectedDeckIds]` | VERIFIED | Line 501: `deckIds: [...selectedDeckIds]`. Line 456-458: card load effect filters `tagFiltered.filter(c => committedConfig.deckIds!.includes(c.deckId))`. |
| `DeckSchema.isActive` | `UpdateDeckSchema` | `CreateDeckSchema.partial()` inherits isActive | VERIFIED | `CreateDeckSchema` line 7 has `isActive: z.boolean().optional()`. `UpdateDeckSchema = CreateDeckSchema.partial()` on line 11 inherits it. |
| `DeckSchema.isActive` | `DeckListItemSchema` | `DeckSchema.extend()` inherits isActive | VERIFIED | `DeckSchema` line 20 has `isActive: z.boolean().default(true)`. `DeckListItemSchema = DeckSchema.extend(...)` on line 27 inherits it. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `DecksPage.tsx` | `decks` (DeckListItem[]) | `api.get('/api/decks')` → `setDecks(await res.json())` | Yes — fetched from real API endpoint | FLOWING |
| `DecksPage.tsx` | `deck.isActive` on each card | Server response via `decks` state | Yes — `isActive` in DeckListItemSchema (default true), returned by `/api/decks` | FLOWING |
| `StudySessionPage.tsx` | `activeDecks` (DeckPickerDeck[]) | Prefetch effect fetches `/api/decks` + `/api/study/due` in parallel; filters `d.isActive` | Yes — real API calls; `DeckListItem[]` typed via shared schema | FLOWING |
| `StudySessionPage.tsx` | `selectedDeckIds` (Set) | Populated from `activeDecks` on prefetch completion; mutated only by `toggleDeckSelection` (no API call) | Yes — all active deck IDs pre-checked; session-only mutations | FLOWING |
| `study.ts GET /due` | cards returned | `prisma.cardProgress.findMany` + `prisma.card.findMany` with `deckFilter` | Yes — real DB queries with `isActive: true` on owned branch | FLOWING (code) / UNCERTAIN (DB column not confirmed applied) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| DecksPage DECK-01 tests (4 cases) | `yarn workspace @kartex/frontend run test --run src/pages/__tests__/DecksPage.test.tsx` | 4 passed, 575ms, exit 0 | PASS |
| StudySessionPage tests (15 cases including 5 DECK-03/04) | `yarn workspace @kartex/frontend run test --run src/pages/__tests__/StudySessionPage.test.tsx` | 15 passed, 1918ms, exit 0 | PASS |

### Probe Execution

No probes declared in plan files. Phase 10 does not include `scripts/*/tests/probe-*.sh` files. Step 7c: SKIPPED (no probe files for this phase).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DECK-01 | 10-01, 10-02, 10-03, 10-05 | User can mark a deck active/inactive via toggle on deck list or detail page | SATISFIED | Switch in DecksPage CardFooter (owner-only via `!deck.sharedByUsername`); Switch in DeckDetailPage header (owner-only via `deck.ownerId === user?.id`); 4 DECK-01 tests GREEN |
| DECK-02 | 10-02, 10-03 | /study global session only queues due cards from active decks | SATISFIED (code) | `deckFilter` owned branch has `isActive: true`; server-side enforcement confirmed in study.ts; DB column depends on migration deploy |
| DECK-03 | 10-02, 10-04, 10-05 | Deck picker on start screen; active decks pre-checked; uncheck is session-only | SATISFIED | `GlobalSRStartScreen` with Checkbox deck picker; `selectedDeckIds` initialized from active decks; `toggleDeckSelection` has no API call; DECK-03a–d tests GREEN |
| DECK-04 | 10-02, 10-04, 10-05 | Session size picker (All / 10 / 20 / custom) on start screen | SATISFIED | SIZE_OPTIONS reused in `GlobalSRStartScreen`; DECK-04a test GREEN (Custom reveals spinbutton) |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `DecksPage.test.tsx` | 39-41 | Stale comment: "isActive is not yet on DeckListItem schema (Plan 02 adds it)" — schema already updated; `as unknown as` cast still used | Info | Factory uses `as unknown as DeckListItem & { isActive: boolean }` but the real type now includes isActive; cast is unnecessary but harmless |

No TBD/FIXME/XXX markers found in any Phase 10 modified files. No placeholder return values. No empty handlers. CR-01 (CardActionCell instant delete) and CR-02 (GlobalSRStartScreen stale i18n) were flagged by code review and fixed in commit 0a15a32 — both fixes confirmed present in current codebase.

### Human Verification Required

#### 1. DB Migration Applied

**Test:** Connect to the PostgreSQL instance and run `\d "Deck"` and `\d "User"` (or equivalent introspection). Alternatively, run `npx prisma migrate status` with DATABASE_URL set.
**Expected:** `Deck` table has `isActive BOOLEAN NOT NULL DEFAULT true`; `User` table has `studyMode TEXT NOT NULL DEFAULT 'normal'`. Migration history shows `20260602000000_add_isactive_studymode` as applied.
**Why human:** `prisma migrate dev` was unavailable during Phase 10 (DATABASE_URL not in shell env). Migration SQL hand-written and checked in. Docker Compose entrypoint should apply it on next deploy, but live-DB column existence cannot be confirmed programmatically from this context.

#### 2. Toggle Persistence After Browser Refresh (DECK-01 full cycle)

**Test:** In a running app with the migration applied: open `/decks`, toggle any owned deck to inactive (switch off), refresh the browser, return to `/decks`.
**Expected:** The deck card still shows the switch in the off (unchecked) state — `isActive=false` persisted to DB via PATCH and returned on the next GET `/api/decks`.
**Why human:** Requires a live DB with the isActive column. The PATCH call and optimistic update are verified by test DECK-01c/d; the round-trip persistence requires a real running stack.

#### 3. Study Queue Excludes Inactive Decks (DECK-02 end-to-end)

**Test:** Mark a deck inactive, navigate to `/study`, start a session. Observe whether cards from the deactivated deck appear.
**Expected:** No cards from the inactive deck appear. The deck picker on the start screen should not list it (it is filtered to `d.isActive` in the prefetch effect).
**Why human:** Server-side filter is code-verified but requires live DB column to take effect.

#### 4. Session-Only Uncheck Does Not Persist isActive (DECK-03 behavioral contract)

**Test:** On the `/study` start screen, uncheck an active deck from the picker, click Start session, complete the session. Then navigate to `/decks` and check the deck's toggle state.
**Expected:** The deck's toggle remains in the active (on) state on `/decks` — unchecking in the start screen did not call PATCH on `isActive`.
**Why human:** The `toggleDeckSelection` function is verified to have no API call (DECK-03c test passes), but the absence of an unintended side effect on real data requires a live test.

#### 5. German UI Shows Translated Strings (No Raw Key Fallback)

**Test:** Switch the app language to German, navigate to `/decks` and `/study`.
**Expected:** Labels read "Aktiv", "Lernsitzung", "Decks auswählen", etc. — no raw key strings like "decks.activeLabel" visible anywhere.
**Why human:** Both locale files have all 12 keys confirmed by grep; actual rendered output in a running app is a visual/language check.

### Gaps Summary

No automated gaps found. All 4 success criteria are verified at the code level:
1. Toggle UI exists on both DecksPage and DeckDetailPage with correct behavior (DECK-01 tests GREEN).
2. Server-side isActive filter is in place in study.ts (DECK-02 code-verified).
3. Start screen with pre-checked deck picker and session-only uncheck is implemented (DECK-03 tests GREEN).
4. Session size picker on the start screen matches /decks/:id/learn (DECK-04 test GREEN).

The one known infrastructure gap — DB migration not confirmed applied to the live database — is a deployment concern, not a code gap. The migration SQL file is checked in and will be applied by the Docker Compose entrypoint on next deploy. This gates the behavioral correctness of DECK-01 persistence and DECK-02 server enforcement in production.

CR-01 and CR-02 code review blockers are fixed (commit 0a15a32, confirmed in current codebase).

---

_Verified: 2026-06-02T15:20:00Z_
_Verifier: Claude (gsd-verifier)_
