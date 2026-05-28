---
created: 2026-05-28T00:00:00Z
title: Migrate to Prisma 7
area: database
files: []
---

## Problem

Project currently uses Prisma 5.x. Prisma 7 is a major release with potential breaking changes to the client API, migration engine, and generated types. Should be evaluated and migrated at an appropriate point (ideally before Phase 6 production deploy to avoid upgrading under a frozen milestone).

## Solution

TBD — review Prisma 7 changelog for breaking changes, update `prisma` and `@prisma/client` in `apps/backend/package.json`, run `prisma generate`, verify all queries still type-check, run the test suite.
