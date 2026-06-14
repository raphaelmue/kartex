---
phase: 21-changelog
reviewed: 2026-06-14T00:00:00Z
depth: standard
files_reviewed: 1
files_reviewed_list:
  - CHANGELOG.md
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 21: Code Review Report

**Reviewed:** 2026-06-14
**Depth:** standard
**Files Reviewed:** 1
**Status:** issues_found

## Summary

`CHANGELOG.md` was written as a pure documentation deliverable for phase 21. The file covers six milestone versions (v1.0 through v1.3.2) in correct reverse-chronological order and generally follows the Keep a Changelog format as specified by CHNG-01/02. The structure is sound: each entry carries Added/Changed/Fixed subsections plus the project-required Requirement IDs, Breaking Changes, and Migration Notes sections.

Three material defects were found:

1. A factual error in the v1.3.0 migration note claims "two new tables" were added when the authoritative DB migration inventory in the research document confirms only one table (`ReviewLog`) plus one column (`Card.kartexId`) — a "one new table and one new column" migration. This misrepresents the schema change to operators running the upgrade.

2. Requirement ID `STUDY-04` is listed as already-shipped in the v1.1 Requirement IDs block, yet the v1.3.2 block simultaneously references STUDY-04 as a future Phase 22 deliverable pending addition. A requirement ID cannot belong to two different milestones; one of these attributions is wrong.

3. The v1.2 service-worker caching bullet omits a significant constraint — Typst WASM (28 MB) is explicitly excluded from the service-worker precache, a fact the research document flagged as user-relevant and which affects offline behavior expectations.

Two minor inconsistencies are flagged as Info items.

## Warnings

### WR-01: v1.3.0 Migration Note Claims Two New Tables When Only One Was Added

**File:** `CHANGELOG.md:89`
**Issue:** The migration note reads "Two new tables and one new column added." The authoritative DB migration inventory in `21-RESEARCH.md` (line 306) records v1.3.0 as "CREATE TABLE + ALTER TABLE ADD COLUMN" — one table (`ReviewLog`) and one column (`Card.kartexId`). The research body text (line 249) also lists only one table. "Two new tables" is a factual error that would mislead a self-hosted operator auditing their schema after an upgrade.
**Fix:** Change line 89 to:

```markdown
**DB migrations:** One new table and one new column added — a `ReviewLog` table (recording each rating with user, card, deck, rating, and timestamp) and a `kartexId` column on the Card table (stable identifier per deck, nullable, unique per deck). Both are append-only additions; existing data is unaffected. Applied automatically on `docker compose up`.
```

---

### WR-02: STUDY-04 Claimed by Both v1.1 (shipped) and v1.3.2 (pending Phase 22)

**File:** `CHANGELOG.md:150` and `CHANGELOG.md:21`
**Issue:** Line 150 lists `STUDY-04` in the v1.1 Requirement IDs block, attributing it to the Study Experience & Polish milestone that shipped on 2026-06-01. Line 21 references `STUDY-04` as a Phase 22 requirement not yet completed ("STUDY-04, STUDY-05 to be added after Phase 22 completes"). A requirement ID can only belong to one milestone. Either STUDY-04 shipped in v1.1 (making the v1.3.2 pending reference wrong) or it belongs to Phase 22 (making the v1.1 attribution wrong). The research document (line 189) lists `STUDY-01, STUDY-02, STUDY-03, STUDY-04` as v1.1 requirement IDs, suggesting v1.1 is the correct home and the v1.3.2 parenthetical is erroneous — but this needs verification against the requirements source of truth.
**Fix:** Verify whether STUDY-04 was delivered in v1.1 or is a Phase 22 deliverable. If STUDY-04 belongs to v1.1, remove it from the pending parenthetical in line 21 and the TODO comment in line 14; Phase 22 should introduce only STUDY-05 (or whatever IDs are genuinely new). If STUDY-04 belongs to Phase 22, remove it from the v1.1 Requirement IDs list at line 150.

---

### WR-03: v1.2 Service-Worker Bullet Omits the Typst WASM Exclusion From Precache

**File:** `CHANGELOG.md:105`
**Issue:** The v1.2 service-worker bullet reads "Service worker caches static assets for instant shell on repeat visits; API calls always go to the network (no stale card data)." The research document (line 209) specifies an additional user-relevant constraint: Typst WASM (28 MB) is excluded from the service-worker precache and handled separately. This matters to users who rely on Typst rendering offline — Typst blocks will fail to render without a network connection even after the PWA is installed, which contradicts the "fast repeat loads" framing if Typst content is present.
**Fix:** Expand the bullet to include the cache exclusion:

```markdown
- Service worker caches static assets for instant shell on repeat visits; API calls always go to the network (no stale card data); Typst WASM (28 MB) is excluded from the precache and requires network access for first use after install
```

---

## Info

### IN-01: v1.3.2 Entry Contains a Leftover HTML Comment in the Published Document Body

**File:** `CHANGELOG.md:14`
**Issue:** Line 14 is `<!-- TODO Phase 22: add STUDY-04 and STUDY-05 bullets here -->`. While HTML comments are invisible when rendered by GitHub/browsers, they remain visible in the raw Markdown source and in any plain-text reading of the file. The same pending-state signal is already communicated by the parenthetical in the Requirement IDs line (line 21). The duplicate signalling mechanisms are redundant and the comment leaks internal planning language into the public-facing document.
**Fix:** Once Phase 22 completes, remove the HTML comment and the parenthetical on line 21 and add the actual STUDY-04/STUDY-05 bullets. Until then, this is acceptable as-is per the agreed placeholder strategy, but the redundancy between the comment and the Requirement IDs parenthetical should be resolved by removing one of the two mechanisms.

---

### IN-02: v1.0 Migration Notes Omit the "No Prior Version" Context Sentence

**File:** `CHANGELOG.md:196`
**Issue:** The v1.0 Migration Notes section contains the required env-var information but omits the "initial release — no prior version to migrate from" framing that the research document's content outline (line 166) specifies. For operators encountering the changelog for the first time on a fresh install, this context clarifies that the DB migration step is initialization rather than upgrade. All other versions include a complete migration narrative; v1.0 is the only entry that omits the framing sentence.
**Fix:** Add the framing sentence before the DB migration line:

```markdown
### Migration Notes

Initial release — no prior version to migrate from.
**DB migrations:** Full initial schema applied automatically on first run via `docker compose up`.
**Env var changes:** Required env vars: `JWT_SECRET`, `DB_PASSWORD`. Optional: `MAX_UPLOAD_SIZE_MB` (default 10), `STORAGE_PATH`.
```

---

_Reviewed: 2026-06-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
