# Phase 8: Study UX - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-31
**Phase:** 08-study-ux
**Areas discussed:** Session setup screen, Tag filter behavior, Session size scope, Deck detail tag grouping

---

## Session Setup Screen

### Q1: Where does the tag filter + session size picker live?

| Option | Description | Selected |
|--------|-------------|----------|
| Above the mode cards | "Session options" section at the top of the same screen — single-screen flow | ✓ |
| Separate step before mode selection | New 'Configure session' screen before the 3 mode cards | |
| Inline in the SR mode card only | Config expands inside the SR card when clicked | |

**User's choice:** Above the mode cards

---

### Q2: Does the config section appear for all sessions or only deck-specific?

| Option | Description | Selected |
|--------|-------------|----------|
| Deck-specific sessions only | Mode selector already only exists for /decks/:id/learn | ✓ |
| All sessions including global SR | Add config to /study route too (tags from all due cards) | |

**User's choice:** Deck-specific sessions only

---

### Q3: Where exactly on the mode selector screen?

| Option | Description | Selected |
|--------|-------------|----------|
| Between title/back button and mode cards | Compact row: tag chips + size picker, above mode cards with divider | ✓ |
| Below the mode cards, before Start button | Config at the bottom after mode cards | |

**User's choice:** Between the title/back button and the mode cards

---

## Tag Filter Behavior

### Q1: Default state when config appears?

| Option | Description | Selected |
|--------|-------------|----------|
| No tags selected = all cards included | User opts in to filtering by selecting tags | ✓ |
| All tags pre-selected | User deselects to exclude | |

**User's choice:** No tags selected = all cards included

---

### Q2: What happens to untagged cards when tag filter is active?

| Option | Description | Selected |
|--------|-------------|----------|
| Always excluded when any tag is selected | Filter = "show cards with these tags" — untagged excluded | ✓ |
| 'Untagged' is its own selectable filter option | Untagged chip alongside real tags | |
| Always included regardless of filter | Untagged always appear — inconsistent | |

**User's choice:** Always excluded when any tag is selected

---

### Q3: How does selecting multiple tags work?

| Option | Description | Selected |
|--------|-------------|----------|
| OR logic — show cards matching any selected tag | Card appears if it has biology OR chemistry | ✓ |
| AND logic — show cards matching all selected tags | Card must have all selected tags — very narrow | |

**User's choice:** OR logic

---

### Q4: UI component for tag selection?

| Option | Description | Selected |
|--------|-------------|----------|
| Toggle chips | Small clickable chips, selected = filled, deselected = outline | ✓ |
| Multi-select dropdown | Select dropdown with checkboxes | |

**User's choice:** Toggle chips

---

## Session Size Scope

### Q1: Which modes does the size picker apply to?

| Option | Description | Selected |
|--------|-------------|----------|
| SR mode only | Size picker only makes sense for due-cards mode | ✓ |
| All 3 modes | User can limit any mode — Exam Mode would have time + count limits | |

**User's choice:** SR mode only

---

### Q2: What does the 'custom' option look like?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline number input | When 'Custom' selected, number input appears inline | ✓ |
| Prompt/dialog after selecting 'Custom' | Popover or modal asks for the number | |

**User's choice:** Inline number input

---

### Q3: How is the size picker displayed?

| Option | Description | Selected |
|--------|-------------|----------|
| Segmented button row: All / 10 / 20 / Custom | 4 compact toggle buttons | ✓ |
| Select dropdown | Consistent with Exam Mode time selector | |

**User's choice:** Segmented button row

---

## Deck Detail Tag Grouping

### Q1: Visual approach for tag grouping?

| Option | Description | Selected |
|--------|-------------|----------|
| Section layout: tag header + cards below | Named sections, bold header per tag | ✓ |
| Table with tag header rows | Insert styled TableRow entries as headers | |

**User's choice:** Section layout

---

### Q2: How are cards shown within each section?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep table layout within each section | Mini-table with # / Front / Tags / Actions | ✓ |
| Switch to card list or grid | Rows without table chrome | |

**User's choice:** Keep table layout within each section

---

### Q3: Multi-tag cards — appear in one section or multiple?

| Option | Description | Selected |
|--------|-------------|----------|
| Card appears under its first tag only | No duplication | ✓ |
| Card appears in every matching section | Same card listed multiple times | |

**User's choice:** First tag only

---

### Q4: How are tag sections ordered?

| Option | Description | Selected |
|--------|-------------|----------|
| Alphabetical by tag name, Untagged last | Predictable, easy to scan | ✓ |
| By card count descending, Untagged last | Most-populated tags first | |

**User's choice:** Alphabetical, Untagged last

---

## Claude's Discretion

- Tailwind classes for config section layout, chip toggle states, segmented button row styling
- Whether to extract config section as a `SessionConfig` sub-component or keep inline
- Tag section header format (capitalization, card count display style)
- Empty-state within a section if a tag has zero matching cards

## Deferred Ideas

None — discussion stayed within phase scope.
