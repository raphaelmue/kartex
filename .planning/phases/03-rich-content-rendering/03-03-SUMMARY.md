---
phase: 03-rich-content-rendering
plan: "03"
subsystem: media-pipeline
tags: [media-upload, hono-multipart, react-markdown, url-transform, tdd, cursor-insertion]
dependency_graph:
  requires:
    - 03-02
  provides:
    - media-upload-backend
    - media-renderer-frontend
    - upload-toolbar-ui
  affects:
    - packages/shared/src/schemas/media.ts
    - apps/backend/src/routes/media.ts
    - apps/backend/src/index.ts
    - docker-compose.yml
    - apps/frontend/src/components/KartexRenderer.tsx
    - apps/frontend/src/components/MediaUploadToolbar.tsx
    - apps/frontend/src/components/CardEditorModal.tsx
    - apps/frontend/src/components/__tests__/KartexRenderer.test.tsx
tech_stack:
  added: []
  patterns:
    - Split Hono router strategy (mediaPublicRouter GET before authMiddleware, mediaRouter POST after)
    - react-markdown urlTransform override to allow custom media:// protocol
    - UUID filename generation for path traversal prevention (randomUUID() + extname)
    - Raw fetch with credentials:include for multipart upload (not api.post — Pitfall 6)
    - Cursor-position text insertion via selectionStart/selectionEnd on textarea ref
    - TDD RED/GREEN cycle for CARD-09, CARD-10, CARD-11
key_files:
  created:
    - packages/shared/src/schemas/media.ts
    - apps/backend/src/routes/media.ts
    - apps/frontend/src/components/MediaUploadToolbar.tsx
  modified:
    - packages/shared/src/index.ts
    - apps/backend/src/index.ts
    - docker-compose.yml
    - apps/frontend/src/components/KartexRenderer.tsx
    - apps/frontend/src/components/CardEditorModal.tsx
    - apps/frontend/src/components/__tests__/KartexRenderer.test.tsx
decisions:
  - "react-markdown defaultUrlTransform strips unknown protocols (returns empty string for media://). Custom kartexUrlTransform passes media:// through while replicating the default safe-protocol allowlist for all other URLs. Without this, img/a component handlers never see the media:// URL — jsdom resolves the empty src to base URL."
  - "Split mediaRouter strategy: mediaPublicRouter (GET /:filename only) registered before authMiddleware; mediaRouter (POST /upload only) registered after. This is the minimal auth split needed for browser <img>/<audio> src resolution without cookies."
  - "UUID filename validation regex /^[A-Za-z0-9_-]+\\.[a-z0-9]{1,10}$/ in GET /:filename prevents path traversal. User-supplied filename is never written to disk (T-03-PATH mitigated)."
  - "No new npm packages installed — all dependencies (lucide-react, sonner, shadcn Button) were available from prior phases."
metrics:
  duration: "~7 minutes"
  completed: "2026-05-27"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 5
---

# Phase 3 Plan 03: Media Pipeline (Upload, Serve, Render) Summary

**One-liner:** Full media pipeline — Hono split-auth router (public GET + protected POST) with UUID filename storage, KartexRenderer media:// image/audio/YouTube handlers via custom urlTransform, and per-field MediaUploadToolbar with cursor-position insertion in CardEditorModal.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Shared schema, backend media router, Docker Compose env var | 0c515db | media.ts (shared), media.ts (routes), index.ts, docker-compose.yml |
| 2 (RED) | Add failing CARD-09, CARD-10, CARD-11 tests | ea8b93c | KartexRenderer.test.tsx |
| 2 (GREEN) | KartexRenderer handlers, MediaUploadToolbar, CardEditorModal | 548f2b4 | KartexRenderer.tsx, MediaUploadToolbar.tsx, CardEditorModal.tsx |

## Outcomes

- CARD-09: `![alt](media://filename)` renders as `<img src="/api/media/filename">` — unit test passes
- CARD-10: `[audio](media://filename)` renders as `<audio controls src="/api/media/filename">` — unit test passes
- CARD-11: YouTube URLs (`youtube.com/watch?v=`, `youtu.be/`, `youtube.com/embed/`) render as `<iframe src="https://www.youtube.com/embed/{id}">` — unit test passes
- Non-YouTube links render as standard `<a>` tags — non-regression test passes
- External image URLs (non-media://) pass through unchanged — non-regression test passes
- D-01/D-02: Upload toolbar (Image + Audio buttons) present in CardEditorModal above each Tabs component (front and back fields)
- D-03: media:// reference inserted at cursor position via selectionStart/selectionEnd
- T-03-PATH: UUID filename validation regex in GET /:filename prevents path traversal
- Auth split: GET /api/media/:filename public (no cookie), POST /api/media/upload auth-protected
- All 10 tests pass: `yarn workspace @kartex/frontend test --run` exits 0

## TDD Gate Compliance

- RED commit: `ea8b93c test(03-03): add failing CARD-09, CARD-10, CARD-11 tests for media and YouTube rendering`
- GREEN commit: `548f2b4 feat(03-03): KartexRenderer media/YouTube handlers, MediaUploadToolbar, CardEditorModal integration`
- Both gates present in git log — TDD cycle complete.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] react-markdown defaultUrlTransform strips media:// protocol**
- **Found during:** Task 2 GREEN — first test run after implementing KartexRenderer img/a handlers
- **Issue:** `react-markdown` v10 applies `defaultUrlTransform` to all URLs before passing them to component handlers. `defaultUrlTransform` only allows `https?`, `ircs?`, `mailto`, `xmpp` protocols — all others return `''`. The `media://` protocol was stripped, so the `src` prop reaching our img component was empty, jsdom resolved it to `http://localhost:3000/`, and the CARD-09 test failed with `expected 'http://localhost:3000/' to contain '/api/media/carnot.png'`. CARD-10 audio was also null since `[audio](media://...)` link href was also stripped.
- **Fix:** Added `kartexUrlTransform()` function that passes `media://` URLs through unchanged, and replicates `defaultUrlTransform`'s safe-protocol logic for all other URLs. Passed as `urlTransform={kartexUrlTransform}` prop to ReactMarkdown.
- **Files modified:** apps/frontend/src/components/KartexRenderer.tsx
- **Commit:** 548f2b4

## Known Stubs

None — all CARD-09, CARD-10, CARD-11 stubs replaced with real tests. All 10 tests pass.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: unauthenticated-media-access | apps/backend/src/routes/media.ts | GET /api/media/:filename is intentionally unauthenticated (T-03-MEDIA-AUTH: accepted for MVP). UUID obscurity prevents enumeration. Phase 5 adds authenticated media access. |

## Self-Check: PASSED

Files created:
- packages/shared/src/schemas/media.ts — FOUND
- apps/backend/src/routes/media.ts — FOUND
- apps/frontend/src/components/MediaUploadToolbar.tsx — FOUND

Files modified:
- packages/shared/src/index.ts — FOUND (export * from './schemas/media')
- apps/backend/src/index.ts — FOUND (mediaPublicRouter + mediaRouter registrations)
- docker-compose.yml — FOUND (STORAGE_PATH: /app/media)
- apps/frontend/src/components/KartexRenderer.tsx — FOUND (img/a handlers + kartexUrlTransform)
- apps/frontend/src/components/CardEditorModal.tsx — FOUND (MediaUploadToolbar + refs)
- apps/frontend/src/components/__tests__/KartexRenderer.test.tsx — FOUND (CARD-09/10/11 real tests)

Commits verified:
- 0c515db — feat(03-03): shared media schema, backend media router, docker env var
- ea8b93c — test(03-03): add failing CARD-09, CARD-10, CARD-11 tests
- 548f2b4 — feat(03-03): KartexRenderer media/YouTube handlers, MediaUploadToolbar, CardEditorModal

Test run: 10/10 passing — VERIFIED
