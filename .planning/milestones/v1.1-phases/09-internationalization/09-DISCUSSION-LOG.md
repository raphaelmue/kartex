# Phase 9: Internationalization - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-31
**Phase:** 09-internationalization
**Areas discussed:** Languages to ship, Language switcher placement, String scope boundary

---

## Languages to Ship

| Option | Description | Selected |
|--------|-------------|----------|
| English only | Ship i18n infrastructure + English locale. German added incrementally. No translation work now. | |
| English + German | Ship both locales in v1.1. Full German translation required. | ✓ |

**User's choice:** English + German
**Notes:** Both locales fully translated — de.json must be complete, not a stub.

---

### Locale file organization

| Option | Description | Selected |
|--------|-------------|----------|
| Single file per language | One en.json and one de.json. All keys in one namespace. | ✓ |
| Feature namespaces per language | src/locales/en/common.json, auth.json, study.json, etc. | |

**User's choice:** Single file per language (en.json, de.json)

---

### Type-safe keys

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, type-safe keys | react-i18next CustomTypeOptions augmentation. t('bad.key') = TypeScript error. | ✓ |
| Runtime strings only | t() accepts any string. Simpler, but typos cause silent fallbacks. | |

**User's choice:** Yes, type-safe keys

---

## Language Switcher Placement

| Option | Description | Selected |
|--------|-------------|----------|
| AppShell sidebar | Add toggle near theme toggle. Settings stays ComingSoon. | ✓ |
| Settings page | Implement minimal Settings page this phase. | |

**User's choice:** AppShell sidebar (near existing theme toggle)

---

### Switcher visual style

| Option | Description | Selected |
|--------|-------------|----------|
| Flag/code toggle button | Small button showing EN/DE. Click cycles. Same size as theme toggle. | ✓ |
| Dropdown select | Select component listing all languages. Scales better. | |

**User's choice:** Compact toggle button (EN / DE code)

---

### Language persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Persist to localStorage | i18next-browser-languagedetector. Survives reload/new sessions. | ✓ |
| Session only | Resets on reload. | |

**User's choice:** Yes, persist to localStorage

---

## String Scope Boundary

### What is NOT translated

| Option | Description | Selected |
|--------|-------------|----------|
| User-authored content | Deck titles, card text, tags | ✓ |
| Usernames and email addresses | Interpolated into translated strings | ✓ |
| Media filenames and URLs | Technical values, not natural language | ✓ |
| KaTeX / Typst math content | Rendered verbatim | ✓ |

**User's choice:** All four excluded (user-authored content, usernames, media paths, math)

---

### Backend error messages

| Option | Description | Selected |
|--------|-------------|----------|
| Translate frontend labels only | Generic labels ("Something went wrong") translated. Raw backend errors in console only. | ✓ |
| All user-facing errors translated | Map backend error codes to translation keys. | |

**User's choice:** Frontend labels only — raw backend error text never shown to users

---

### Aria labels

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, translate aria labels | aria-label strings use t(). Accessibility strings are user-facing. | ✓ |
| Visual strings only | Skip aria labels. | |

**User's choice:** Yes, translate aria labels

---

## Claude's Discretion

- Exact key naming convention in locale JSON (flat dotted vs nested objects)
- Whether to use `useTranslation()` directly or a thin wrapper
- Whether language state lives in ThemeContext or a new LanguageContext
- Exact positioning of language toggle relative to theme toggle
- i18next initialization file location (`src/i18n.ts` + import in `main.tsx`)

## Deferred Ideas

None — discussion stayed within phase scope.
