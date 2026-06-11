---
phase: 17
status: issues-found
reviewed_at: 2026-06-11T16:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - apps/frontend/src/components/AppShell.tsx
  - apps/frontend/src/components/StatsSummaryPanel.tsx
  - apps/frontend/src/pages/DecksPage.tsx
  - apps/frontend/src/locales/en.json
  - apps/frontend/src/locales/de.json
  - apps/frontend/src/components/ui/dropdown-menu.tsx
  - apps/frontend/src/components/ui/alert-dialog.tsx
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
---

# Code Review — Phase 17: mobile-ui-polish

## Summary

Seven files reviewed across two plans: overflow fixes (MOB-01) and deck card footer restructure (DECK-05). The shadcn copy-paste components are complete and correctly exported. The i18n keys are consistent between `en.json` and `de.json`. One warning-level UX bug exists in the delete confirmation flow: clicking the AlertDialog Action button closes the dialog before knowing whether the delete API call succeeded, so a server error leaves the user with no dialog to retry from. Two info-level issues were found: a redundant double `.find()` traversal in AppShell and a formatting inconsistency in StatsSummaryPanel.

---

## Findings

### Warning

#### WR-01: AlertDialog dismiss fires before delete API call resolves — no retry path on failure

**File:** `apps/frontend/src/pages/DecksPage.tsx:220,236`

**Issue:** `AlertDialogAction` is a Radix `AlertDialog.Action` primitive, which unconditionally calls `onOpenChange(false)` on click. The `onOpenChange` handler at line 220 immediately sets `deleteTargetId` to `null`, closing the dialog. The `onClick` at line 236 then fires `handleDelete` asynchronously. If the DELETE request fails (network error or non-OK response), the dialog is already gone and only a toast is shown — the user must re-navigate through ⋮ → Delete to re-open the confirmation, with no indication that the deck was not deleted.

This is a divergence from the AlertDialog's intended use: the Action is semantically "I confirm; proceed" but here the consequence (deletion) may silently fail after confirmation UI has dismissed.

**Fix:** Prevent the Radix `Action` from auto-dismissing by using a plain `Button` for the destructive confirm action, and close the dialog manually only on success:

```tsx
<AlertDialogFooter>
  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
  {/* Use Button instead of AlertDialogAction to control dismiss timing */}
  <Button
    variant="destructive"
    onClick={() => {
      if (deleteTargetId) void handleDelete(deleteTargetId)
    }}
  >
    {t('decks.deleteButton')}
  </Button>
</AlertDialogFooter>
```

Then in `handleDelete`, keep `setDeleteTargetId(null)` only on the success path (already the case at line 92) and remove it from the `onOpenChange` handler on the Action path. The Cancel button and backdrop click still use `onOpenChange` → `setDeleteTargetId(null)` to dismiss the dialog.

---

### Info

#### IN-01: Double `.find()` traversal in AppShell currentLabel computation

**File:** `apps/frontend/src/components/AppShell.tsx:37-39`

**Issue:** `navItems.find()` is called twice with the identical predicate — once to test truthiness and again to retrieve the result with a `!` non-null assertion. This is a pre-existing pattern untouched by this phase but the file was modified and the double traversal is a clear refactor target.

```tsx
// Current (two find calls):
const currentLabel =
  navItems.find(item => location.pathname.startsWith(item.to))
    ? t(navItems.find(item => location.pathname.startsWith(item.to))!.labelKey)
    : (location.pathname.startsWith('/admin') ? t('nav.admin') : 'Kartex')
```

**Fix:** Assign the result of a single `.find()` call:

```tsx
const matchedNav = navItems.find(item => location.pathname.startsWith(item.to))
const currentLabel = matchedNav
  ? t(matchedNav.labelKey)
  : location.pathname.startsWith('/admin') ? t('nav.admin') : 'Kartex'
```

---

#### IN-02: Inconsistent indentation of `<Table>` inside overflow wrapper in StatsSummaryPanel

**File:** `apps/frontend/src/components/StatsSummaryPanel.tsx:127-179`

**Issue:** The `<div className="overflow-x-auto" ...>` wrapper opens at line 127 with 8 spaces of indent (inside `<div className="mt-6">`), but `<Table>` at line 128 and `</div>` at line 179 are only 8 spaces (same level as the `<div>` opener rather than indented inside it). The structure is correct — JSX parsing is not whitespace-sensitive — but the flat indentation makes it harder to visually verify the wrapping hierarchy.

**Fix:** Indent `<Table>` and its children one level inside the wrapper div (two extra spaces):

```tsx
<div className="overflow-x-auto" role="region" aria-label={t('dashboard.stats.perDeckProgress')}>
  <Table>
    ...
  </Table>
</div>
```

---

## Verdict

issues-found — one warning-level bug (delete dialog closes before async delete resolves, blocking retry on failure) and two minor info findings; no critical or security issues.
