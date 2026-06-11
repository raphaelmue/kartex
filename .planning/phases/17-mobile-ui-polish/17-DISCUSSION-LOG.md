# Phase 17: Mobile UI Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-11
**Phase:** 17-Mobile UI Polish
**Areas discussed:** CardFooter button layout, Stats table overflow fix, Mobile audit breadth

---

## CardFooter button layout

| Option | Description | Selected |
|--------|-------------|----------|
| flex-wrap | Add flex-wrap to existing footer — buttons spill to a second line when space is tight. Minimal change. | |
| Overflow/kebab menu | Study + Open stay visible; Edit + Delete collapse into a ⋮ DropdownMenu | ✓ |
| Two explicit rows | Fixed two-row layout regardless of viewport. | |

**User's choice:** Overflow/kebab menu (⋮)

### Delete confirmation follow-up

| Option | Description | Selected |
|--------|-------------|----------|
| Alert dialog | Clicking Delete opens an AlertDialog modal. shadcn AlertDialog component. | ✓ |
| Inline confirm (keep current) | Confirmation row appears inline in footer after menu closes. | |

**User's choice:** Alert dialog

### Component installation follow-up

| Option | Description | Selected |
|--------|-------------|----------|
| Add both via shadcn CLI | `npx shadcn@latest add dropdown-menu alert-dialog` | ✓ |
| Use existing Dialog for confirmation | Use Dialog instead of AlertDialog; only add DropdownMenu | |

**User's choice:** Add both via shadcn CLI

**Notes:** Neither DropdownMenu nor AlertDialog were present in the project — both need to be added. Dialog was confirmed present.

---

## Stats table overflow fix

| Option | Description | Selected |
|--------|-------------|----------|
| overflow-x-auto wrapper | Wrap `<Table>` in `<div className="overflow-x-auto">` | ✓ |
| Clamp deck title width | Add max-w + truncate to name cell | |
| Both | overflow-x-auto + truncate — defensive approach | |

**User's choice:** overflow-x-auto wrapper only

**Notes:** Table already hides 2 of 4 columns on mobile (hidden sm:table-cell). Single scroll wrapper is sufficient.

---

## Mobile audit breadth

| Option | Description | Selected |
|--------|-------------|----------|
| Surgical: just DashboardPage + StatsSummaryPanel | Fix only known overflow files | ✓ |
| Targeted audit: all 9 AppShell pages | Render each page at 375px and fix any overflow found | |

**User's choice:** Surgical fix — DashboardPage, StatsSummaryPanel, AppShell only

**Notes:** MOB-01 refers to "remaining" issues — prior partial commits already addressed some. Keep PR minimal.

---

## Claude's Discretion

- ⋮ button size/variant — follow existing `Button size="sm"` convention
- Whether `overflow-x-hidden` is needed on `<main>` — add only if a concrete overflow is observed during implementation
- Exact DropdownMenu item styling

## Deferred Ideas

None — discussion stayed within phase scope.
