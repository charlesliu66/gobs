# I18n Key Library Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Stabilize the current locale foundation and localize the first high-visibility downstream surfaces by expanding the centralized key library and replacing hardcoded Chinese in gallery/history flows.

**Architecture:** Keep the current frontend locale provider and request-header model, then extend `messages.ts` with page-level namespaces and route the first visible downstream pages through shared `t(...)` lookups and locale-aware formatting helpers. Avoid touching forbidden backend files and avoid mixing unrelated in-progress workspace changes into this task.

**Tech Stack:** React, TypeScript, Vite, Node test runner

---

### Task 1: Align locale helpers with current UX

**Files:**
- Modify: `h5-video-tool/src/i18n/locale.ts`
- Modify: `h5-video-tool/src/i18n/locale.test.ts`

**Steps:**
1. Remove or neutralize stale preset-oriented assumptions that no longer match the two-option language switch UX.
2. Ensure stored locale readers behave consistently with current runtime behavior.
3. Add locale-aware date/time formatting helpers that touched pages can share.
4. Run `node --test h5-video-tool/src/i18n/locale.test.ts`.

### Task 2: Expand the key library

**Files:**
- Modify: `h5-video-tool/src/i18n/messages.ts`

**Steps:**
1. Add namespaces for:
   - `gallery`
   - `history`
   - `batchJobs`
   - `errors`
2. Keep existing keys stable so already-landed pages do not regress.
3. Add any new common CTA/status keys needed by the first migration slice.

### Task 3: Localize first priority surfaces

**Files:**
- Modify: `h5-video-tool/src/pages/Gallery.tsx`
- Modify: `h5-video-tool/src/components/GalleryView.tsx`
- Modify: `h5-video-tool/src/pages/History.tsx`
- Modify: `h5-video-tool/src/components/BatchJobsBoard.tsx`

**Steps:**
1. Add `useLocale()` where missing.
2. Replace hardcoded Chinese strings with `t(...)`.
3. Replace direct `zh-CN` formatting with shared helpers.
4. Keep behavior unchanged apart from localization.

### Task 4: Keep network and status copy locale-aware

**Files:**
- Modify: `h5-video-tool/src/api/client.ts`

**Steps:**
1. Replace hardcoded Chinese network fallback text with locale-aware lookup.
2. Keep request behavior unchanged.

### Task 5: Verify and release

**Files:**
- Modify: `PRODUCT.md`

**Steps:**
1. Run locale tests.
2. Run frontend type/build verification.
3. Update `PRODUCT.md` changelog and feature summary.
4. Commit only i18n-related files.
5. Push to `main`.
6. Build frontend/backend and deploy using the standard project flow.
