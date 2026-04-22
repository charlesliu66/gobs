# GeeLark Publish Status Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show the latest GeeLark publish batch directly on the distribution page, with per-account live status, failure reasons, screenshots, and share links.

**Architecture:** Extend the publish API response with deterministic batch metadata, normalize task detail data in the backend, and let the distribution page keep a local batch model that polls all unfinished tasks until they settle. The implementation stays inside the existing GeeLark route/service pair and `TabDistribute.tsx`, without adding a new route page.

**Tech Stack:** React, TypeScript, Express, Axios, GeeLark OpenAPI, `node:test`

---

### Task 1: Lock backend batch mapping with a failing test

**Files:**
- Modify: `h5-video-tool-api/tests/geelarkAccounts.test.ts`
- Modify: `h5-video-tool-api/src/services/geelark.ts`

**Step 1: Write the failing test**

Add a test for a helper that maps selected accounts and env ids to returned `taskIds`, preserving username/account metadata for the frontend batch card.

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/geelarkAccounts.test.ts`
Expected: FAIL because the batch helper does not exist yet.

**Step 3: Write minimal implementation**

Export a helper from `h5-video-tool-api/src/services/geelark.ts` that builds `batch.items[]` by index and safely handles missing task ids.

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/geelarkAccounts.test.ts`
Expected: PASS

### Task 2: Lock task detail normalization with a failing test

**Files:**
- Modify: `h5-video-tool-api/tests/geelarkAccounts.test.ts`
- Modify: `h5-video-tool-api/src/services/geelark.ts`

**Step 1: Write the failing test**

Add tests for a detail normalizer that extracts:
- `statusText`
- `failDesc`
- `resultImages`
- `shareLink`
- `logs`

from the GeeLark detail payload without leaking raw unknown structures to the UI.

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/geelarkAccounts.test.ts`
Expected: FAIL because the normalizer does not exist yet.

**Step 3: Write minimal implementation**

Add a pure normalization helper and use it inside `getTaskDetail()`.

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/geelarkAccounts.test.ts`
Expected: PASS

### Task 3: Extend publish response with batch metadata

**Files:**
- Modify: `h5-video-tool-api/src/services/geelark.ts`
- Modify: `h5-video-tool-api/src/routes/geelark.ts`

**Step 1: Write the failing test**

Reuse the batch helper assertions so the service contract is pinned before changing the route response.

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/geelarkAccounts.test.ts`

**Step 3: Write minimal implementation**

Update `publishVideo()` to return:
- `taskIds`
- `planName`
- `batch`

and keep the route typed consistently.

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/geelarkAccounts.test.ts`
Expected: PASS

### Task 4: Lock frontend batch state with a failing test

**Files:**
- Modify: `h5-video-tool/tests/promptPolish.test.ts` or create a focused GeeLark distribute test if the existing suite is not a fit
- Modify: `h5-video-tool/src/pages/TabDistribute.tsx`
- Modify: `h5-video-tool/src/api/geelark.ts`

**Step 1: Write the failing test**

Cover the behavior that after publish success:
- the latest batch stores all returned items
- the UI no longer tracks only the first task id

**Step 2: Run test to verify it fails**

Run the focused frontend test command for the chosen file.
Expected: FAIL because the page still stores only one task id.

**Step 3: Write minimal implementation**

Add frontend batch/task types and state for the latest publish batch.

**Step 4: Run test to verify it passes**

Run the same focused frontend test command.
Expected: PASS

### Task 5: Implement polling panel and terminal-state merge

**Files:**
- Modify: `h5-video-tool/src/pages/TabDistribute.tsx`
- Modify: `h5-video-tool/src/i18n/messages.ts`
- Modify: `h5-video-tool/src/api/geelark.ts`

**Step 1: Write the failing test**

Cover:
- rendering one row per account
- polling only unfinished rows
- showing failure text/screenshots/share link from fetched details

**Step 2: Run test to verify it fails**

Run the focused frontend test command for the new/updated test file.

**Step 3: Write minimal implementation**

Replace the single-task modal with an inline latest-batch panel and polling effect.

**Step 4: Run test to verify it passes**

Run the same focused frontend test command.
Expected: PASS

### Task 6: Verify, document, and release

**Files:**
- Modify: `PRODUCT.md`

**Step 1: Run focused backend tests**

Run: `node --import tsx --test tests/geelarkAccounts.test.ts`
Expected: PASS

**Step 2: Run focused frontend tests**

Run the focused frontend test command for the new batch-status suite.
Expected: PASS

**Step 3: Run backend TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS in `h5-video-tool-api`

**Step 4: Run frontend TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS in `h5-video-tool`

**Step 5: Run backend build**

Run: `npm run build`
Expected: PASS in `h5-video-tool-api`

**Step 6: Run frontend build**

Run: `npm run build`
Expected: PASS in `h5-video-tool`

**Step 7: Update release docs and ship**

Update `PRODUCT.md`, then commit, push, upload compiled assets, and restart `qas-api`.
