---
phase: 9
slug: internationalization
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-01
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 |
| **Config file** | `apps/frontend/vitest.config.ts` |
| **Quick run command** | `pnpm --filter @kartex/frontend test --run` |
| **Full suite command** | `pnpm --filter @kartex/frontend test --run && pnpm --filter @kartex/frontend typecheck` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @kartex/frontend test --run`
- **After every plan wave:** Run `pnpm --filter @kartex/frontend test --run && pnpm --filter @kartex/frontend typecheck`
- **Before `/gsd-verify-work`:** Full suite must be green + TypeScript clean
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 0 | I18N-01 | — | N/A | smoke | `pnpm --filter @kartex/frontend test --run` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 0 | I18N-01 | — | N/A | build | `pnpm --filter @kartex/frontend typecheck` | ❌ W0 | ⬜ pending |
| 09-01-03 | 01 | 0 | I18N-03 | — | N/A | unit | `pnpm --filter @kartex/frontend test --run` | ❌ W0 | ⬜ pending |
| 09-02-01 | 02 | 1 | I18N-01 | — | N/A | unit | `pnpm --filter @kartex/frontend test --run` | ✅ | ⬜ pending |
| 09-02-02 | 02 | 1 | I18N-02 | — | N/A | unit | `pnpm --filter @kartex/frontend test --run` | ✅ | ⬜ pending |
| 09-03-01 | 03 | 2 | I18N-02 | — | N/A | unit | `pnpm --filter @kartex/frontend test --run` | ✅ | ⬜ pending |
| 09-03-02 | 03 | 2 | I18N-03 | — | N/A | unit | `pnpm --filter @kartex/frontend test --run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/frontend/src/test/setup.ts` — add i18n initialization with `initImmediate: false` and English locale (prevents existing 65 tests from breaking)
- [ ] `apps/frontend/src/components/__tests__/LanguageToggle.test.tsx` — failing stub for I18N-03 (switcher renders, changeLanguage called)
- [ ] `apps/frontend/src/locales/en.json` — covers I18N-01 (locale directory creation)
- [ ] `apps/frontend/src/locales/de.json` — covers I18N-01 (both locales required)
- [ ] `apps/frontend/src/i18n.ts` — covers I18N-01 (i18next init)
- [ ] `apps/frontend/src/i18n.d.ts` — covers I18N-01 (type-safe keys)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No hardcoded English strings remain in JSX | I18N-02 | Static analysis only partially captures dynamic strings | `grep -rn ">[A-Z][a-z]" apps/frontend/src --include="*.tsx" \| grep -v "//\|{t(\|{i18n\|import\|export"` — review remaining matches |
| Switching language updates all visible strings without page reload | I18N-03 | Runtime DOM behavior; requires a browser | Open app → click EN/DE toggle → verify all nav labels, page headings, form labels, toast messages update immediately |
| German translations are complete and natural | I18N-02 | Content quality; requires human judgment | Open app with DE language → walk through all 9 pages; verify no [object Object] or key names appear |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
