---
quick_id: 260526-001
slug: quality-baseline
status: complete
date: 2026-05-26
commits:
  - 28706d6  # docs: quality decisions in PROJECT.md + ROADMAP.md
  - fe2d6f2  # fix: Phase 2 code smells
  - 372837e  # chore: ESLint + Prettier baseline + lint-surfaced bug fixes
---

## Summary

Established the quality baseline for Kartex before Phase 3 begins.

### T1 — Quality decisions recorded

- `PROJECT.md` Key Decisions: added "Tests per phase (Option A)" and "ESLint + Prettier as baseline"
- `ROADMAP.md`: new Quality Policy section covering Vitest coverage targets, tooling baseline, and CI gate plan (GitHub Actions in Phase 6)

### T2 — Phase 2 code smells fixed

| File | Smell | Fix |
|------|-------|-----|
| `DecksPage.tsx` | Silent `catch` on load (blank page on error) | `toast.error()` on both fetch failure and non-ok response |
| `DeckDetailPage.tsx` | Silent `catch` on cards load | `toast.error()` (discovered while fixing exhaustive-deps) |
| `App.tsx` | No React ErrorBoundary | Added `ErrorBoundary` class component wrapping `AuthProvider` + routes |
| `CardEditorModal.tsx` | `card!.id` non-null assertion | Replaced with `isEdit && card ? ... card.id` guard |
| `DeckFormModal.tsx` | `deck!.id` non-null assertion | Replaced with `isEdit && deck ? ... deck.id` guard |

### T3 — ESLint + Prettier installed

- Packages: `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `prettier`, `eslint-config-prettier`
- `eslint.config.js`: flat config, TS rules + React hooks rules for frontend, Prettier last
- `.prettierrc`: singleQuote, no semi, trailingComma, 100 width
- Root scripts: `lint`, `lint:fix`, `format`, `format:check`
- `yarn lint` exits 0; `yarn typecheck` exits 0

### Bugs surfaced by ESLint (now fixed)

1. `auth.ts`: `verifyToken` imported but never used → removed
2. `auth.ts`: `logout` handler called `deleteCookie` without `secure`/`sameSite` options — cookies might not clear in production (set with `secure: true, sameSite: 'Strict'`). Fixed to pass matching options.
3. `main.tsx`: `getElementById('root')!` replaced with explicit guard (throws clear error if element missing)
4. `input.tsx`: empty `interface InputProps extends ...` converted to `type` alias (no-empty-object-type)
