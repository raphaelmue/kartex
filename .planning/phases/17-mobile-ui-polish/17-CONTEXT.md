# Phase 17: Mobile UI Polish - Context

**Gathered:** 2026-06-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Pure frontend polish — no backend changes, no new API endpoints, no Prisma migrations. Delivers:

1. **DECK-05**: Restructure `DecksPage` `CardFooter` so deck card action buttons never overflow their container — at 375px or 1280px
2. **MOB-01**: Fix remaining mobile overflow on the dashboard — stats table scroll container + surgical audit of `DashboardPage` / `AppShell`

Out of scope: Library deck toggle (Phase 18), new features, schema changes, i18n additions.

</domain>

<decisions>
## Implementation Decisions

### Deck Card Footer (DECK-05)

- **D-01:** Restructure `CardFooter` in `DecksPage.tsx` using a **kebab/overflow menu (⋮)**: primary actions (Study, Open) stay visible at all times; secondary actions (Edit, Delete) collapse into a `DropdownMenu` triggered by a ⋮ `Button`.
- **D-02:** **Delete confirmation** moves from inline footer state to an **AlertDialog** modal — opens when the user clicks Delete inside the ⋮ menu. Removes the inline "Confirm? / Yes / Cancel" inline footer state entirely.
- **D-03:** For shared/library decks (`sharedByUsername` is set), the footer only has Study + Open — no ⋮ menu needed (no overflow occurs for these).
- **D-04:** Add both `DropdownMenu` and `AlertDialog` shadcn/ui components via CLI: `npx shadcn@latest add dropdown-menu alert-dialog`. These are copy-paste Radix UI components, consistent with all other shadcn components in the project.

### Mobile Layout Overflow (MOB-01)

- **D-05:** Wrap the per-deck progress `<Table>` in `StatsSummaryPanel.tsx` with `<div className="overflow-x-auto">` — allows horizontal scroll when content is wider than the container.
- **D-06:** **Surgical scope**: fix only `StatsSummaryPanel.tsx`, `DashboardPage.tsx` (check for extra padding/margin), and `AppShell.tsx` (add `overflow-x-hidden` to `<main>` if needed). Do NOT audit all 9 AppShell pages — keep the PR minimal and focused on MOB-01.

### Claude's Discretion

- Exact ⋮ button size/variant and DropdownMenu item styling — follow existing `Button size="sm"` convention in the file.
- Whether `overflow-x-hidden` is needed on the `<main>` element depends on audit findings — add only if a concrete overflow is observed.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Affected Components
- `apps/frontend/src/pages/DecksPage.tsx` — `CardFooter` at line ~150; full card rendering logic; `confirmDeleteId` state to remove
- `apps/frontend/src/components/StatsSummaryPanel.tsx` — per-deck progress table starting at line ~127
- `apps/frontend/src/components/AppShell.tsx` — `<main>` layout at line ~256 (`p-4 md:p-8`, `overflow-y-auto`)
- `apps/frontend/src/pages/DashboardPage.tsx` — page wrapper; check for extra padding/margin

### shadcn/ui Components (to add)
- `apps/frontend/src/components/ui/` — existing components directory (target for new shadcn copies)
- Install: `npx shadcn@latest add dropdown-menu alert-dialog`

### Requirements
- `.planning/REQUIREMENTS.md` — MOB-01 and DECK-05 acceptance criteria (source of truth for what "done" looks like)
- `.planning/ROADMAP.md` Phase 17 — success criteria with exact viewport sizes (375px, 1280px)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/frontend/src/components/ui/button.tsx` — `size="sm"` variant used throughout DecksPage; ⋮ button should match this size
- `apps/frontend/src/components/ui/dialog.tsx` — existing Dialog in project; AlertDialog follows same Radix pattern but is semantically correct for destructive confirmations
- `apps/frontend/src/components/ui/card.tsx` — `CardFooter` component; accepts `className` — restructure happens in usage in DecksPage, not in the component itself

### Established Patterns
- **shadcn component install:** All UI components are copy-pasted via `npx shadcn@latest add <name>` into `src/components/ui/`. No custom Radix primitives inline in pages.
- **Conditional rendering in DecksPage:** `deck.sharedByUsername` controls which buttons appear — DropdownMenu guard should use the same condition as the existing Edit/Delete guard (`!deck.sharedByUsername`).
- **`confirmDeleteId` state:** Currently drives inline confirm UI — this state can be replaced entirely by AlertDialog's open state (or removed if AlertDialog is self-contained per deck).

### Integration Points
- `DecksPage.tsx` — remove `confirmDeleteId` state, add per-deck delete dialog state or single shared dialog + selected deck ref
- `StatsSummaryPanel.tsx:127` — wrap `<Table>` in `overflow-x-auto` div
- `AppShell.tsx:256` — optionally add `overflow-x-hidden` to the `<main>` element

</code_context>

<specifics>
## Specific Ideas

- The ⋮ menu icon should use a `MoreVertical` or `MoreHorizontal` icon from `lucide-react` (already a dependency, used throughout the app).
- AlertDialog text: "Delete deck?" / "This cannot be undone." with [Cancel] + [Delete] buttons — standard destructive pattern.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 17-Mobile UI Polish*
*Context gathered: 2026-06-11*
