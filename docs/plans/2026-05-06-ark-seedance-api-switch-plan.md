# Ark Seedance API Switch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Dreamina CLI-backed storyboard video generation with Ark Seedance APIs and show localized provider failure messages in GOBS H5.

**Architecture:** Add an Ark Seedance adapter beneath the existing Dreamina-compatible service boundary so current queue orchestration and H5 flows remain stable. Normalize provider failures into bilingual user-facing display strings plus raw provider details.

**Tech Stack:** Node.js, TypeScript, Express, native `node:test`, React, existing GOBS queue/event architecture

---

### Task 1: Track the run and implementation scope

**Files:**
- Create: `docs/workflow/runs/2026-05-06-ark-seedance-api-switch/SESSION-ANCHOR.md`
- Create: `docs/workflow/runs/2026-05-06-ark-seedance-api-switch/planner-spec.md`

**Step 1: Write the run anchor**

Document the allowed scope, provider API decision, cancellation semantics, and localized error-display goal.

**Step 2: Write the planner spec**

Capture acceptance criteria for:

- Ark submission
- Ark polling
- local/remote cancellation semantics
- localized H5 failure display

**Step 3: Sanity-check file paths**

Confirm the new run folder follows the project naming convention and references only allowed code areas.

### Task 2: Add backend failing tests for the Ark adapter

**Files:**
- Create: `h5-video-tool-api/tests/arkSeedanceVideo.test.ts`
- Modify: `h5-video-tool-api/package.json`

**Step 1: Write a failing test for request content mapping**

Cover text-only, image-first-frame, and multimodal reference-image requests.

**Step 2: Run the targeted backend test**

Run: `node --test tests/arkSeedanceVideo.test.ts`

Expected: FAIL because the adapter does not yet exist.

**Step 3: Write a failing test for polling/status normalization**

Cover `queued`, `running`, `succeeded`, `failed`, and `cancelled`.

**Step 4: Write a failing test for error classification**

Cover copyright/IP restriction, generic content policy, invalid input, and rate-limit/provider failure cases.

### Task 3: Implement the Ark adapter

**Files:**
- Create: `h5-video-tool-api/src/services/arkSeedanceVideo.ts`
- Modify: `h5-video-tool-api/.env.example`

**Step 1: Add Ark environment configuration helpers**

Introduce:

- `ARK_API_KEY`
- `ARK_BASE_URL`
- `ARK_SEEDANCE_DEFAULT_MODEL`
- `ARK_SEEDANCE_FAST_MODEL`

**Step 2: Implement task creation**

Translate existing submission params into Ark `content[]` payloads.

**Step 3: Implement task polling**

Normalize Ark task responses into the shape expected by current queue code.

**Step 4: Implement queued-task deletion**

Provide a delete call that is safe to use only for remotely queued provider tasks.

### Task 4: Rewire the Dreamina compatibility layer

**Files:**
- Modify: `h5-video-tool-api/src/services/dreaminaVideo.ts`
- Modify: `h5-video-tool-api/src/domain/job-status.ts`

**Step 1: Write a failing test for compatibility output**

Ensure `submitDreaminaVideo`, `submitDreaminaMultimodalVideo`, and `pollDreaminaTask` preserve current external contracts while sourcing from Ark.

**Step 2: Implement compatibility wiring**

Replace CLI submission/polling internals with Ark adapter calls while preserving exported function names.

**Step 3: Expand normalized error codes**

Add Ark-oriented codes and map provider messages into stable categories.

### Task 5: Carry localized error payloads through queue persistence

**Files:**
- Modify: `h5-video-tool-api/src/services/batchJobsQueue.ts`
- Modify: `h5-video-tool-api/src/routes/batchJobs.ts`

**Step 1: Write a failing test for localized failure persistence**

Verify failed jobs can carry bilingual display messages plus provider details.

**Step 2: Update job types and writeback behavior**

Keep `failReason` populated for backward compatibility, while also persisting structured localized fields.

**Step 3: Adjust cancel notes**

Make running-job cancellation explicitly mean local abandon/stop-tracking instead of guaranteed provider cancellation.

### Task 6: Teach the H5 to prefer localized failure text

**Files:**
- Modify: `h5-video-tool/src/api/batchJobs.ts`
- Modify: `h5-video-tool/src/studio/productionTypes.ts`
- Modify: `h5-video-tool/src/pages/ProductionWizard.tsx`
- Modify: `h5-video-tool/src/studio/steps/StepStoryboardShotStrip.tsx`
- Modify: `h5-video-tool/src/studio/steps/StepStoryboardGenerateActions.tsx`
- Create: `h5-video-tool/tests/storyboardVideoErrorDisplay.test.ts`

**Step 1: Write a failing frontend test for localized error preference**

Verify the UI prefers zh-CN or en text based on locale and falls back safely.

**Step 2: Extend frontend DTO/types**

Allow localized display fields to pass through existing state.

**Step 3: Update rendering and toasts**

Use localized display messages for:

- shot failure toast
- shot strip failure text
- cancel/abandon helper copy

### Task 7: Verify and document

**Files:**
- Modify: `PRODUCT.md`
- Create: `docs/workflow/runs/2026-05-06-ark-seedance-api-switch/builder-report.md`

**Step 1: Run targeted backend tests**

Run: `node --test tests/arkSeedanceVideo.test.ts`

**Step 2: Run broader regression tests touched by the change**

Run the relevant backend/frontend node tests plus:

- backend `npx tsc --noEmit`
- frontend `npm run build`

**Step 3: Update PRODUCT.md**

Document the API switch and bilingual failure visibility.

**Step 4: Write builder report**

Map acceptance criteria to implementation and verification evidence.
