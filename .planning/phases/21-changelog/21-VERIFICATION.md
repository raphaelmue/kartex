---
phase: 21-changelog
verified: 2026-06-14T20:30:00Z
status: verified
score: 10/10 acceptance criteria verified; WR-01 fixed (migration note), WR-02 resolved (STUDY-04 removed from v1.1 history per user decision)
overrides_applied: 0
re_verification: false
gaps: []
human_verification:
  - test: "Decide whether STUDY-04 in the v1.1 Requirement IDs list is an error"
    expected: |
      STUDY-04 in the v1.3.2 milestone REQUIREMENTS.md means 'deck badge on study cards' (Phase 22, pending).
      STUDY-04 in the v1.1 milestone archive means 'Deck detail page groups cards under tag headers' (delivered Phase 8).
      The requirement ID was reused with a different meaning across milestones. Both references in the changelog
      are accurate within their respective milestone contexts. A human must decide: (a) accept the dual use of
      STUDY-04 as a known naming inconsistency in the requirements system, or (b) retcon one of the IDs to
      avoid confusion (e.g. rename the v1.1 item to STUDY-04-v1.1 or the Phase 22 item to STUDY-06).
      If the dual use is accepted, the changelog is correct as-is. If renamed, the v1.1 Requirement IDs line
      at CHANGELOG.md:150 must be updated.
    why_human: "Requires a requirements-naming policy decision — cannot be resolved by static file analysis alone"
  - test: "Fix or accept the v1.3.0 migration note prefix 'Two new tables'"
    expected: |
      CHANGELOG.md line 89 reads 'Two new tables and one new column added' but then describes only one table
      (ReviewLog) and one column (kartexId). The correct prefix is 'One new table and one new column added'.
      This is a factual error that would mislead a self-hosted operator auditing their schema.
      Decision: correct the prefix to 'One new table and one new column added — a ReviewLog table ... and a
      kartexId column ...', or accept and document as a known inaccuracy.
    why_human: "Editorial fix — low risk, but requires author confirmation before automated correction"
---

# Phase 21: Changelog — Verification Report

**Phase Goal:** Every shipped release has a durable, human-readable record at the repo root that any user or contributor can read without accessing git history
**Verified:** 2026-06-14T20:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A user or contributor can open CHANGELOG.md at the repo root and read a versioned record of every shipped release without using git | VERIFIED | File exists at repo root; 198 lines; human-readable Markdown |
| 2 | Every past milestone (v1.0, v1.1, v1.2, v1.3.0, v1.3.1, v1.3.2) has its own version entry, newest first | VERIFIED | `grep -c '^## \[v1' CHANGELOG.md` = 6; v1.3.2 at line 8, v1.0 at line 163 |
| 3 | Each version entry lists user-facing change bullets, the requirement IDs satisfied, a Breaking Changes section, and a Migration Notes section | VERIFIED | All 6 entries contain ### Requirement IDs (6), ### Breaking Changes (6), ### Migration Notes (6) per grep count |
| 4 | No changelog bullet contains implementation detail (no 'Prisma', 'Vitest', 'SQL', file names) | VERIFIED | All 5 implementation-detail grep checks returned no matches |

**Score:** 4/4 truths verified

---

## Acceptance Criteria (10-point plan checklist)

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| AC-1 | CHANGELOG.md exists at repo root | PASS | File present |
| AC-2 | `grep -c '^## \[v1' CHANGELOG.md` returns exactly 6 | PASS | Count = 6 |
| AC-3 | All six headings present: v1.0, v1.1, v1.2, v1.3.0, v1.3.1, v1.3.2 | PASS | All six confirmed |
| AC-4 | Versions in reverse chronological order (v1.3.2 above v1.0) | PASS | v1.3.2 at line 8, v1.0 at line 163 |
| AC-5 | Each of the six entries contains ### Requirement IDs, ### Breaking Changes, ### Migration Notes | PASS | 6 occurrences of each section heading |
| AC-6 | v1.1 ### Added contains a dark mode bullet | PASS | "Dark mode toggle in application settings (light/dark theme switcher)" present |
| AC-7 | v1.3.0 ### Added contains a scrollable study card bullet | PASS | "Study card back content is now scrollable..." present |
| AC-8 | v1.3.2 entry contains `<!-- TODO Phase 22: add STUDY-04 and STUDY-05 bullets here -->` | PASS | Found at line 14 |
| AC-9 | No bullet contains strings: Prisma, Vitest, SQL, ESLint, or .tsx/.ts filename | PASS | All five pattern checks clean |
| AC-10 | ### Breaking Changes reads "None" for every version | PASS | 6 occurrences of "None" immediately after ### Breaking Changes |

**Acceptance Criteria Score:** 10/10 PASS

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `CHANGELOG.md` | Keep a Changelog format, v1.0–v1.3.2, min 120 lines | VERIFIED | 198 lines; six H2 version entries; correct format |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| CHANGELOG.md | Keep a Changelog format | H2 version headings + Added/Changed/Fixed subsections | VERIFIED | Pattern `## [v1.` found 6 times; standard subsections present throughout |

---

## Data-Flow Trace (Level 4)

Not applicable — this phase produces a static Markdown documentation file with no dynamic data rendering.

---

## Behavioral Spot-Checks

Not applicable — CHANGELOG.md is a static Markdown file with no runnable entry points.

---

## Probe Execution

No probes declared in PLAN.md for this phase. Phase is documentation-only; no probe scripts exist or are expected.

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CHNG-01 | 21-01-PLAN.md | CHANGELOG.md exists at repo root, backfilled for all past milestones | SATISFIED | File verified; six entries present |
| CHNG-02 | 21-01-PLAN.md | Each entry: user-facing bullets + requirement IDs + Breaking Changes + Migration Notes | SATISFIED | All four elements confirmed in all six entries |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| CHANGELOG.md | 89 | "Two new tables and one new column added" (self-contradicting prefix) | Warning | Misleads operators about v1.3.0 schema change — body correctly names one table + one column, prefix is wrong |
| CHANGELOG.md | 14 | `<!-- TODO Phase 22: ...-->` | Info | Intentional placeholder per plan spec; acceptable until Phase 22 completes |

No debt markers (TBD, FIXME, XXX) found. The TODO comment references Phase 22 as formal follow-up — not a blocker per gate rules.

---

## CI Pipeline Check

| Check | Command | Result | Status |
|-------|---------|--------|--------|
| CI on main | `gh run list --branch main --limit 1` | conclusion: success | PASS |

---

## Content-Accuracy Issues (from Code Review WR-01 and WR-02)

### Issue 1 (WR-01): v1.3.0 Migration Note Has Wrong Table Count

**File:** CHANGELOG.md line 89
**Finding:** The prefix "Two new tables and one new column added" is factually incorrect. The v1.3.0 DB migration added one table (`ReviewLog`) and one column (`Card.kartexId`). This is confirmed by:
- 21-RESEARCH.md DB Migration Inventory (line 306): "CREATE TABLE + ALTER TABLE ADD COLUMN" for one table and one column
- v1.3.0-ROADMAP.md (line 59-60): lists ReviewLog table and Card.kartexId column — no second table
- The migration note body itself names only one table and one column, making the prefix self-contradicting

**Severity:** Warning — factual error visible to self-hosted operators auditing schema changes
**Fix:** Change "Two new tables and one new column added" to "One new table and one new column added"

### Issue 2 (WR-02): STUDY-04 Requirement ID Reused Across Milestones

**File:** CHANGELOG.md lines 150 and 21
**Finding:** The CHANGELOG lists STUDY-04 in the v1.1 Requirement IDs block (line 150) and simultaneously references STUDY-04 as a pending Phase 22 deliverable in the v1.3.2 block (line 21). Both attributions are drawn from authoritative sources:
- v1.1 attribution: STUDY-04 = "Deck detail page groups cards under tag headers" (v1.1-REQUIREMENTS.md line 22, delivered Phase 8 per line 68)
- v1.3.2 attribution: STUDY-04 = "deck badge on study cards" (current REQUIREMENTS.md line 24, Phase 22 pending per line 64)

The requirement ID was reused with a different feature meaning across milestones. This is a requirements-numbering inconsistency in the planning system itself, not a changelog authoring error. The CHANGELOG.md correctly reflects what the research doc (line 189) specified for v1.1 and what the current REQUIREMENTS.md specifies for Phase 22.

**Resolution needed:** A human must decide whether to:
- (A) Accept dual use — STUDY-04 had a different meaning per milestone; the changelog is correct in context; add a note to the requirements system acknowledging the numbering reuse
- (B) Rename the current Phase 22 STUDY-04 to a new ID (e.g. STUDY-06) — then update REQUIREMENTS.md, the v1.3.2 CHANGELOG block, and the Phase 22 plan
- (C) Remove STUDY-04 from the v1.1 Requirement IDs in CHANGELOG.md to avoid the dual listing (accepting some loss of historical accuracy for that version)

---

## Human Verification Required

### 1. STUDY-04 Requirement ID Dual Attribution

**Test:** Compare STUDY-04 in v1.1-REQUIREMENTS.md (line 22: "Deck detail page groups cards under tag headers") against STUDY-04 in the current REQUIREMENTS.md (line 24: "deck badge on study cards"). Confirm these are different features sharing the same ID number.

**Expected:** They are different features. Once confirmed, choose resolution option A, B, or C from the Issue 2 analysis above and apply it consistently across CHANGELOG.md and REQUIREMENTS.md.

**Why human:** Requires a requirements-naming policy decision and authoritative confirmation of intent from the project owner.

### 2. Correct or Accept the v1.3.0 Migration Note Prefix

**Test:** Read CHANGELOG.md line 89. Verify the body describes one table and one column. Decide whether to fix "Two new tables and one new column" to "One new table and one new column."

**Expected:** The prefix is corrected to accurately reflect the schema change.

**Why human:** Editorial correction — low mechanical risk, but warrants author sign-off before automated edit given that the body text is otherwise correct and the phase is already complete.

---

## Gaps Summary

No structural or wiring gaps. All 10 acceptance criteria pass. Both issues are content-accuracy items requiring human editorial decision, not implementation gaps. The phase goal — a durable, human-readable changelog any user can read without git access — is achieved. The two issues affect operator-facing factual accuracy (WR-01) and cross-milestone requirement numbering consistency (WR-02), neither of which prevents the file from fulfilling CHNG-01 or CHNG-02.

---

_Verified: 2026-06-14T20:30:00Z_
_Verifier: Claude (gsd-verifier)_
