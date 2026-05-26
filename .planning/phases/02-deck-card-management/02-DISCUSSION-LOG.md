# Phase 2: Deck & Card Management - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 02-deck-card-management
**Areas discussed:** Deck list layout, Card list in deck, Card editor UX, Markdown preview

---

## Deck list layout

| Option | Description | Selected |
|--------|-------------|----------|
| Card grid | Reuses shadcn Card component — each tile shows title, description snippet, card count, visibility badge | ✓ |
| Table list | Rows with title, card count, visibility, last updated, actions — same Table component as AdminPage | |
| Simple list | Plain clickable rows, no extra columns | |

**User's choice:** Card grid
**Notes:** Tile shows title, description snippet, card count, and visibility badge. "New Deck" button at top of page.

---

## Card list in deck

| Option | Description | Selected |
|--------|-------------|----------|
| Table with front preview | Rows: row number, truncated front content, tag chips, Edit/Delete actions — reuses Table component | ✓ |
| Card tiles | Mini flashcard preview tiles in a grid | |

**User's choice:** Table with front preview
**Notes:** Same Table component as AdminPage. "Add Card" button below the table.

---

## Card editor UX

| Option | Description | Selected |
|--------|-------------|----------|
| Modal dialog | Dialog opens over the deck page — front textarea, back textarea, tag input, Cancel + Save | ✓ |
| Separate page | Navigates to /decks/:id/cards/new — full-page layout with side-by-side front/back | |

**User's choice:** Modal dialog
**Notes:** User stays in context of the deck page. shadcn Dialog component to be added in this phase.

---

## Markdown preview

| Option | Description | Selected |
|--------|-------------|----------|
| Tab toggle — Edit / Preview | Two tabs per textarea field; Preview tab renders Markdown via react-markdown | ✓ |
| Live split-pane | Left textarea + right live preview side-by-side in modal | |
| No preview in Phase 2 | Plain textareas; preview added in Phase 3 | |

**User's choice:** Tab toggle — Edit / Preview
**Notes:** Phase 3 extends the same Preview tab with KaTeX + Typst without layout changes. The renderer should be extracted as a reusable component from the start.

---

## Claude's Discretion

- Deck visibility selector control (dropdown vs radio group)
- Empty state content and icons for /decks and /decks/:id
- Tag input UX (comma-separated vs chip input)
- Modal width and textarea heights
- Toast feedback wording on CRUD success/error

## Deferred Ideas

- Deck search/filter on /decks — new capability, deferred to backlog
- Bulk card operations (delete multiple, move to deck) — deferred
- Card reordering (drag-and-drop) — deferred; SM-2 drives order by due date
