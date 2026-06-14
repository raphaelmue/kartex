---
phase: 20
slug: logo-pwa-icons
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-14
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 + jsdom |
| **Config file** | `apps/frontend/vitest.config.ts` |
| **Quick run command** | `yarn workspace @kartex/frontend test` |
| **Full suite command** | `yarn workspace @kartex/frontend test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `yarn workspace @kartex/frontend test`
- **After every plan wave:** Run `yarn workspace @kartex/frontend test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 1 | BRAND-01 | — | N/A | unit | `yarn workspace @kartex/frontend test` | ❌ W0 | ⬜ pending |
| 20-01-02 | 01 | 1 | BRAND-01 | — | N/A | unit | `yarn workspace @kartex/frontend test` | ❌ W0 | ⬜ pending |
| 20-01-03 | 01 | 1 | BRAND-02 | — | N/A | manual (file check) | `ls apps/frontend/public/ | grep -E 'pwa|maskable|apple'` | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/frontend/src/components/AppShell.test.tsx` (new test or extension) — covers BRAND-01: `<img src="/logo.svg">` renders in both brand areas (desktop sidebar + mobile drawer)

*Note: if `AppShell.test.tsx` already exists, add a single describe block rather than creating a new file.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| All 7 icon files present in `public/` after generator run | BRAND-02 | Build-time CLI output; not a runtime React behavior | Run `yarn workspace @kartex/frontend generate-pwa-assets`, then `ls apps/frontend/public/` — verify `favicon.ico`, `favicon.svg`, `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, `apple-touch-icon.png` all present |
| Favicon visible in browser tab | BRAND-01 | Browser caching makes automated check unreliable | Open app in private/incognito window; check browser tab shows new logo icon |
| PWA install icon shows new logo | BRAND-02 | Requires PWA install flow in browser | Install or simulate install in Chrome DevTools → Application → Manifest → check icon previews |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
