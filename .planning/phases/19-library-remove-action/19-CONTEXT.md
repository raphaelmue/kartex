# Phase 19: Library Remove Action - Context

**Gathered:** 2026-06-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 19 delivers one capability: a user can permanently remove a public/shared deck from their personal library. Removing deletes the `DeckShare` row; the deck disappears from the library view on `/decks` and is excluded from all future study sessions. Study progress (`CardProgress` rows) is preserved.

This phase does NOT change the Explore page, add any new library metadata views, or touch owned-deck management.

</domain>

<decisions>
## Implementation Decisions

### Entry Point

- **D-01:** "Remove from library" lives on the **Decks page** only — library deck cards (`ownerId !== user?.id` branch) get a ⋮ `DropdownMenu`, identical placement to owned-deck cards (Phase 17 pattern). The dropdown contains a single destructive item: "Remove from library".
- **D-02:** The Explore page is not changed — no per-user library status needed on the Explore API. The existing "Add to Library" / "Fork" buttons remain as-is.
- **D-03:** Study and Open buttons in the library card footer are unchanged. The ⋮ menu is purely for the remove action.

### Confirmation UX

- **D-04:** Use an `AlertDialog` (consistent with the Phase 17 owned-deck delete pattern). Single shared `AlertDialog` outside the card map loop, controlled by a `removeTargetId` state variable.
- **D-05:** AlertDialog content:
  - Title: "Remove from library?"
  - Body: "Your study progress for this deck will be preserved. You can re-add it from Explore at any time."
  - Actions: [Cancel] [Remove] (Remove uses `variant="destructive"`)

### Data Handling

- **D-06:** Only the `DeckShare` row is deleted (for the calling user). `CardProgress` rows for those cards are preserved. If the user re-adds the deck from Explore later, they resume prior study progress.
- **D-07:** The deck is removed from the frontend deck list state optimistically on API success (consistent with `handleDelete` pattern on `DecksPage`).

### Backend

- **D-08:** New endpoint: `DELETE /api/decks/:id/library`. Authenticates via existing `authMiddleware`. Checks that a `DeckShare` record exists for `(deckId, userId)` — returns 403 if not (user does not have this deck in their library). Deletes the `DeckShare` row and returns 204 (no content).
- **D-09:** No `CardProgress` cascade delete. The Prisma `deckShare.delete` call is the only mutation.

### i18n

- **D-10:** New i18n keys required (add to both `en.json` and `de.json` in the same commit): library card ⋮ menu label, AlertDialog title, AlertDialog body, AlertDialog confirm button, and success toast. Exact key names left to planner.

### Folded Todos

- **LIB-02** from todo `2026-06-13-remove-public-deck-from-library.md`: "Remove public deck from personal library" — directly maps to this phase's sole requirement.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §LIB-02 — the single active requirement this phase satisfies
- `.planning/ROADMAP.md` §Phase 19 — goal, success criteria, UI hint

### Key Source Files
- `apps/frontend/src/pages/DecksPage.tsx` — library deck card branch (`ownerId !== user?.id`); existing ⋮ DropdownMenu + AlertDialog pattern for owned decks is the model
- `apps/backend/src/routes/decks.ts` — existing `POST /:id/library` (add) and `PATCH /:id/library` (toggle active) — new `DELETE /:id/library` follows same auth pattern
- `apps/frontend/src/locales/en.json` and `apps/frontend/src/locales/de.json` — both must be updated atomically in one commit (10-05 pattern)

### Patterns From Prior Phases
- Phase 17 decision (17-02): `deleteTargetId` / single shared `AlertDialog` outside map loop — apply same pattern as `removeTargetId` for library remove
- Phase 17 decision (17-02): `DropdownMenuItem` destructive style via `className="text-destructive focus:text-destructive"` — no variant prop on shadcn DropdownMenuItem

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AlertDialog`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle` — already imported in `DecksPage.tsx`; reuse directly
- `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuTrigger` — already imported in `DecksPage.tsx`; add to the library card branch
- `Button` with `variant="destructive"` — used in existing delete flow; reuse for Remove confirm button

### Established Patterns
- `deleteTargetId: string | null` state → `removeTargetId: string | null` state (same shape, same toggle-on-open logic)
- Optimistic deck list removal: `setDecks((prev) => prev.filter((d) => d.id !== id))` — apply same after successful DELETE
- `api.delete(url)` — fetch wrapper already handles auth headers; use `api.delete(\`/api/decks/\${id}/library\`)` 

### Integration Points
- `DecksPage.tsx` library card footer (`ownerId !== user?.id` branch, lines 183–202) — add ⋮ dropdown here, matching owned-card footer structure
- `apps/backend/src/routes/decks.ts` — append `DELETE /:id/library` route after existing `PATCH /:id/library` (line 317); register nothing new in `index.ts` (router already mounted)
- `packages/shared/src/schemas/` — no schema changes needed; `DeckListItem` already sufficient for the remove flow

</code_context>

<specifics>
## Specific Ideas

- AlertDialog body text confirmed by user: "Your study progress for this deck will be preserved. You can re-add it from Explore at any time."
- The ⋮ dropdown for library decks should match the visual placement of the owned-deck ⋮ dropdown in the card footer (right-aligned, ghost button, `MoreVertical` icon).

</specifics>

<deferred>
## Deferred Ideas

- **Explore page state-awareness** (showing "In Library / Remove" on Explore cards) — discussed and declined for Phase 19. Could be a future UX enhancement if users find the Decks page remove action hard to discover.
- **LIB-03**: Hiding/blocking a public deck from Explore results — already in REQUIREMENTS.md future requirements; not in scope for v1.3.2.

### Reviewed Todos (not folded)
- "Redesign Kartex logo with K motif on learning card" — maps to Phase 20 (BRAND-01/BRAND-02); not in scope for Phase 19.

</deferred>

---

*Phase: 19-Library Remove Action*
*Context gathered: 2026-06-13*
