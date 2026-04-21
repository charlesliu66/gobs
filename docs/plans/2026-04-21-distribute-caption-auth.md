# Distribution Caption Auth Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix distribution-page caption generation auth failures and upgrade generated TikTok copy/hashtags.

**Architecture:** Keep backend prompt routes protected by JWT and fix the frontend caller to send auth headers. Refine backend caption fallback and prompt instructions so both LLM output and fallback output match a hook-first TikTok distribution style.

**Tech Stack:** React, TypeScript, Express, node:test, tsx

---

### Task 1: Lock In Frontend Auth Behavior

**Files:**
- Modify: `h5-video-tool/src/api/promptPolish.ts`
- Test: `h5-video-tool/tests/promptPolish.test.ts`

**Step 1: Write the failing test**

Create a test for a small exported helper that builds prompt POST headers and confirms JWT is included when a token is present.

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/promptPolish.test.ts`

Expected: fail because helper does not exist yet.

**Step 3: Write minimal implementation**

Export a helper from `promptPolish.ts` that builds JSON headers for prompt requests and includes `Authorization` when `gobs_token` exists or when a token override is passed. Reuse it for prompt POST requests.

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/promptPolish.test.ts`

Expected: PASS

### Task 2: Lock In TikTok Fallback Rules

**Files:**
- Modify: `h5-video-tool-api/src/services/promptPolish.ts`
- Test: `h5-video-tool-api/tests/promptCaptionRules.test.ts`

**Step 1: Write the failing test**

Create tests for exported helpers that verify:

- hashtags normalize to a smaller relevant set
- fallback caption starts with a TikTok-style hook
- fallback hashtags keep traffic plus topic tags without ballooning

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/promptCaptionRules.test.ts`

Expected: fail because helpers are not exported and/or rules do not match.

**Step 3: Write minimal implementation**

Update `promptPolish.ts` to export the helper functions needed by the test and revise the TikTok instructions/fallback generation.

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/promptCaptionRules.test.ts`

Expected: PASS

### Task 3: Refresh Distribution Page Copy

**Files:**
- Modify: `h5-video-tool/src/pages/TabDistribute.tsx`

**Step 1: Update UI copy**

Replace the current helper text with clearer distribution-focused wording:

- emphasize hook-first TikTok copy
- explain that generated text is publish-ready, not raw prompt text
- adjust placeholders to feel more like real social copy

**Step 2: Smoke check mentally against user flow**

Ensure the copy still fits the existing layout and language tabs.

### Task 4: Verify End To End

**Files:**
- Modify: `PRODUCT.md`

**Step 1: Run targeted tests**

Run:

- `node --import tsx --test tests/promptPolish.test.ts` in `h5-video-tool`
- `node --import tsx --test tests/promptCaptionRules.test.ts` in `h5-video-tool-api`

**Step 2: Run type checks**

Run:

- `npx tsc --noEmit` in `h5-video-tool`
- `npx tsc --noEmit` in `h5-video-tool-api`

**Step 3: Run builds**

Run:

- `npm run build` in `h5-video-tool`
- `npm run build` in `h5-video-tool-api`

If memory pressure appears, rerun with `NODE_OPTIONS=--max-old-space-size=4096`.

**Step 4: Update product docs**

Add a changelog entry in `PRODUCT.md` using the next version marker.

**Step 5: Commit**

Commit only the files for this fix, then push and deploy.
