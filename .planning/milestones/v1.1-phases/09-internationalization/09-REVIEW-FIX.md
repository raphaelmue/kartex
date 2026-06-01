---
phase: 09-internationalization
fixed_at: 2026-06-01T23:04:30Z
review_path: .planning/phases/09-internationalization/09-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 9: Code Review Fix Report

**Fixed at:** 2026-06-01T23:04:30Z
**Source review:** .planning/phases/09-internationalization/09-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (CR-01, WR-01, WR-02, WR-03)
- Fixed: 4
- Skipped: 0

## Fixed Issues

### CR-01: Side effects inside state updater in `ExamTimer`

**Files modified:** `apps/frontend/src/components/ExamTimer.tsx`
**Commit:** 11be550
**Applied fix:** Added `onExpireRef = useRef(onExpire)` with a sync effect to keep it current. Made the `setSecondsLeft` updater pure (`(prev) => (prev <= 1 ? 0 : prev - 1)`). Moved `clearInterval` and `onExpireRef.current()` into a separate `useEffect` that fires when `secondsLeft === 0`. The interval setup effect is unchanged except the updater is now pure.

---

### WR-01: Variable `t` shadows translation function in `DeckDetailPage`

**Files modified:** `apps/frontend/src/pages/DeckDetailPage.tsx`
**Commit:** aa9adce
**Applied fix:** Renamed the `.some()` callback parameter from `t` to `tag` — `cards.filter((c) => c.tags.some((tag) => filterTags.has(tag)))`.

---

### WR-02: Hardcoded `"+N more"` not localized in `DeckDetailPage`

**Files modified:** `apps/frontend/src/pages/DeckDetailPage.tsx`, `apps/frontend/src/locales/en.json`, `apps/frontend/src/locales/de.json`
**Commit:** a65458a
**Applied fix:** Added `useTranslation()` call to `TagChips` component. Added `"nMoreTags": "+{{count}} more"` to `en.json` under `deckDetail`. Added `"nMoreTags": "+{{count}} weitere"` to `de.json` under `deckDetail`. Replaced `<span>+{extra} more</span>` with `<span>{t('deckDetail.nMoreTags', { count: extra })}</span>`.

---

### WR-03: Missing `initImmediate: false` in test setup

**Files modified:** `apps/frontend/src/test/setup.ts`
**Commit:** b77c4c8
**Applied fix:** Added `initImmediate: false` to the `i18n.init()` options object, matching the intent documented in the existing comment.

---

## Verification

**Tests:** 67/67 passed (`yarn workspace @kartex/frontend test --run`)
**TypeScript:** Pre-existing backend errors (Prisma client not generated) unchanged. No new errors introduced in modified frontend files.

---

_Fixed: 2026-06-01T23:04:30Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
