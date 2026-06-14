---
phase: 19
slug: library-remove-action
status: verified
nyquist_compliant: false
wave_0_complete: true
created: 2026-06-14
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 (backend + frontend, separate workspaces) |
| **Config files** | `apps/backend/vitest.config.ts`, `apps/frontend/vitest.config.ts` |
| **Backend quick run** | `cd apps/backend && yarn vitest run src/routes/__tests__/library-remove.test.ts` |
| **Frontend quick run** | `cd apps/frontend && yarn vitest run src/pages/__tests__/DecksPage.test.tsx` |
| **Full suite** | `yarn test` (from monorepo root) |
| **Estimated runtime** | ~5s (both suites combined) |

---

## Sampling Rate

- **After every task commit:** Run backend + frontend quick run commands
- **After every plan wave:** Run full suite
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 19-01-01a | 01 | 1 | LIB-02 (D-08) | T-19-01, T-19-02 | DELETE /api/decks/:id/library returns 204 + deletes DeckShare when caller has a share | unit (vi.mock Prisma) | `cd apps/backend && yarn vitest run src/routes/__tests__/library-remove.test.ts` | ✅ | ✅ green |
| 19-01-01b | 01 | 1 | LIB-02 (D-08, IDOR) | T-19-01 | Returns 403 when no DeckShare row exists for (deckId, userId) — IDOR guard | unit (vi.mock Prisma) | `cd apps/backend && yarn vitest run src/routes/__tests__/library-remove.test.ts` | ✅ | ✅ green |
| 19-01-01c | 01 | 1 | LIB-02 (D-09) | T-19-04 | DELETE does not call prisma.cardProgress.deleteMany — study history preserved | unit (vi.mock Prisma) | `cd apps/backend && yarn vitest run src/routes/__tests__/library-remove.test.ts` | ✅ | ✅ green |
| 19-01-02 | 01 | 1 | LIB-02 (D-10) | T-19-03 | All 5 removeFromLibrary* keys present in en.json and de.json with correct values | verification script | `cd apps/frontend && node -e "const e=require('./src/locales/en.json').decks,d=require('./src/locales/de.json').decks,k=['removeFromLibrary','removeFromLibraryTitle','removeFromLibraryBody','removeFromLibraryConfirm','removedFromLibraryToast'];k.forEach(x=>{if(!e[x]||!d[x]){throw new Error('missing '+x)}});console.log('i18n parity ok')"` | ✅ | ✅ green |
| 19-01-03a | 01 | 1 | LIB-02a | — | Library deck footer shows ⋮ "More actions" trigger | unit (JSDOM, Radix) | `cd apps/frontend && yarn vitest run src/pages/__tests__/DecksPage.test.tsx` | ✅ | ✅ green |
| 19-01-03b | 01 | 1 | LIB-02b | — | ⋮ menu reveals "Remove from library" item | unit (JSDOM, Radix) | `cd apps/frontend && yarn vitest run src/pages/__tests__/DecksPage.test.tsx` | ✅ | ✅ green |
| 19-01-03c | 01 | 1 | LIB-02c | — | Clicking "Remove from library" opens AlertDialog with correct title and body | unit (JSDOM) | `cd apps/frontend && yarn vitest run src/pages/__tests__/DecksPage.test.tsx` | ✅ | ✅ green |
| 19-01-03d | 01 | 1 | LIB-02d | T-19-01 | Confirm "Remove Deck" calls `api.delete` with `/library` URL, removes deck optimistically, fires toast.success | unit (JSDOM) | `cd apps/frontend && yarn vitest run src/pages/__tests__/DecksPage.test.tsx` | ✅ | ✅ green |
| 19-01-03e | 01 | 1 | LIB-02e | — | Owned deck (ownerId === user.id) does NOT show "Remove from library" menu item | unit (JSDOM) | `cd apps/frontend && yarn vitest run src/pages/__tests__/DecksPage.test.tsx` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test framework installs were needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Removed deck no longer appears in user's library / study queue after DELETE (backend round-trip) | LIB-02 success criteria 2+3 | Requires a full `GET /api/decks` round-trip with mocked DeckShare list containing no entry for the removed deck — out of scope for a unit-level DELETE handler test. The observable end-user behavior is fully covered by the frontend `LIB-02d` test (optimistic removal from the list) and `LIB-02e` (owned decks unaffected). Backend stub documented in `library-remove.test.ts` with rationale. | After removing a library deck via the ⋮ menu on `/decks`, refresh the page and confirm the deck is gone from the library section. |

---

## Validation Audit 2026-06-14

| Metric | Count |
|--------|-------|
| Gaps found | 4 (backend it.todo stubs) |
| Resolved | 3 (Prisma-mocked unit tests implemented) |
| Escalated to manual-only | 1 (backend round-trip list check — covered by frontend LIB-02d) |

---

## Validation Sign-Off

- [x] All critical tasks have automated verification (9 automated, 1 manual-only documented)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (no MISSING — all were PARTIAL or COVERED)
- [x] No watch-mode flags in any test command
- [x] Feedback latency < 5s
- [ ] `nyquist_compliant: true` — **BLOCKED**: 1 behavior is manual-only (backend round-trip list check)

**Approval:** verified 2026-06-14 (partial — 1 manual-only stub documented)
