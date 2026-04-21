# Distribution Caption Quality Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade distribute-page caption and hashtag generation from prompt-only fallback behavior to a video-aware, multi-candidate TikTok publishing workflow that produces better hooks, cleaner language, and more relevant tags.

**Architecture:** Keep the existing `/api/prompt/generate-caption` endpoint, but extend it to accept video context and return quality-controlled caption candidates. Move video understanding, candidate scoring, low-quality rejection, and structured hashtag assembly into `h5-video-tool-api/src/services/promptPolish.ts`. Update the distribute page to send video metadata and surface stronger results without forcing junk fallback text into the editor.

**Tech Stack:** React, TypeScript, Express, node:test, tsx, ffmpeg, Compass Gemini multimodal

---

### Task 1: Lock In Quality Rules With Failing Tests

**Files:**
- Modify: `h5-video-tool-api/tests/promptCaptionRules.test.ts`
- Modify: `h5-video-tool-api/src/services/promptPolish.ts`

**Step 1: Write the failing test**

Add focused tests for exported helpers that verify:

- low-quality fallback captions are detected and rejected
- caption cleanup enforces single-language output for the requested language
- hashtags are assembled as a compact TikTok-friendly mix instead of raw keyword dumps
- candidate selection prefers hook-first, non-template text over generic fallback text

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/promptCaptionRules.test.ts`

Expected: FAIL because the new helpers and quality rules do not exist yet.

**Step 3: Write minimal implementation**

Export pure helpers from `promptPolish.ts` for:

- caption quality scoring
- low-quality fallback detection
- hashtag slot normalization
- final candidate selection

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/promptCaptionRules.test.ts`

Expected: PASS

### Task 2: Add Video-Aware Caption Generation

**Files:**
- Modify: `h5-video-tool-api/src/services/promptPolish.ts`
- Modify: `h5-video-tool-api/src/routes/prompt.ts`

**Step 1: Write the failing test**

Extend backend tests to cover request handling and helper behavior for:

- prompt + video context together
- generation succeeding when prompt is weak but video context exists
- multi-candidate parsing falling back to safe empty output instead of junk template text

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/promptCaptionRules.test.ts`

Expected: FAIL because the service still only uses prompt text.

**Step 3: Write minimal implementation**

Update caption generation to:

- accept `videoPath` / `videoUrl`, `accountContext`, and optional style hints
- extract a few key frames from the selected video
- call Compass multimodal once for video understanding and once for candidate generation when needed
- generate multiple caption candidates plus hashtags
- reject low-confidence / template-like output and avoid auto-filling obviously bad fallback copy

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/promptCaptionRules.test.ts`

Expected: PASS

### Task 3: Upgrade Distribute Page Input And Result Handling

**Files:**
- Modify: `h5-video-tool/src/api/promptPolish.ts`
- Modify: `h5-video-tool/src/pages/TabDistribute.tsx`

**Step 1: Write the failing test**

Add frontend tests for the request body helper if needed, or at minimum define the expected request shape in code comments and types before wiring UI state.

**Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/promptPolish.test.ts`

Expected: FAIL if new helper exports are required.

**Step 3: Write minimal implementation**

Update the distribute flow to:

- send `videoPath` / `videoUrl` with prompt requests
- include selected account context for platform / region hints
- improve helper copy so users understand the system generates publish-ready hooks, not raw production prompt text
- only auto-fill the best candidate when it passes quality checks

**Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/promptPolish.test.ts`

Expected: PASS

### Task 4: Verify And Release

**Files:**
- Modify: `PRODUCT.md`

**Step 1: Run targeted tests**

Run:

- `node --import tsx --test tests/promptCaptionRules.test.ts` in `h5-video-tool-api`
- `node --import tsx --test tests/promptPolish.test.ts` in `h5-video-tool`

**Step 2: Run type checks**

Run:

- `npx tsc --noEmit` in `h5-video-tool-api`
- `npx tsc --noEmit` in `h5-video-tool`

**Step 3: Run builds**

Run:

- `npm run build` in `h5-video-tool-api`
- `npm run build` in `h5-video-tool`

**Step 4: Update product docs**

Add a changelog entry in `PRODUCT.md` using the next version marker and mention the distribute-page caption quality upgrade.

**Step 5: Commit, push, and deploy**

Commit only the files for this feature, push to `main`, build locally, upload compiled artifacts to the server, and restart `qas-api`.
