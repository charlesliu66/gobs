# Production Execution Segments Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an execution-segment layer for Production Wizard so Dreamina receives merged/split executable segments while the UI still centers on original storyboard shots.

**Architecture:** Keep `shots[]` as the narrative layer and add `executionSegments[]` as the execution layer. Batch jobs, submit flow, and project writeback move to segment-aware identifiers, while the frontend aggregates segment status back onto each original shot.

**Tech Stack:** React, TypeScript, Express, project JSON persistence, Dreamina batch queue.

---

### Task 1: Add execution segment types and helpers

**Files:**
- Modify: `C:\Users\wei.liu\Desktop\cursor_try\QAS\h5-video-tool\src\studio\productionTypes.ts`
- Create: `C:\Users\wei.liu\Desktop\cursor_try\QAS\h5-video-tool\src\studio\executionSegments.ts`

**Step 1: Add segment types**

- Define `ProductionExecutionSegment`
- Extend `ProductionProject` with `executionSegments?: ProductionExecutionSegment[]`
- Extend `ProductionShot` with `executionSegmentIds?: string[]`

**Step 2: Add segment-building helpers**

- Implement helpers for:
  - `buildDirectExecutionSegments`
  - `mergeShortShotsIntoSegments`
  - `splitLongShotIntoSegments`
  - `ensureExecutionSegments(project)`

**Step 3: Verify local type references**

Run:

```bash
cd h5-video-tool
npx tsc --noEmit
```

Expected: new types compile cleanly.

### Task 2: Persist execution segments in project load/save flow

**Files:**
- Modify: `C:\Users\wei.liu\Desktop\cursor_try\QAS\h5-video-tool\src\studio\productionWizardStorage.ts`
- Modify: `C:\Users\wei.liu\Desktop\cursor_try\QAS\h5-video-tool-api\src\routes\productionPersist.ts`

**Step 1: Frontend load compatibility**

- On load, if `executionSegments` is missing, build direct segments from shots.

**Step 2: Frontend save payload**

- Include `executionSegments` in persisted project payload.

**Step 3: Backend save compatibility**

- Preserve `executionSegments` during save/merge just like shots.
- Avoid losing execution segment state when preview video writeback happens.

**Step 4: Verify with one old-style project payload**

- Confirm missing `executionSegments` does not break load.

### Task 3: Make batch jobs segment-aware

**Files:**
- Modify: `C:\Users\wei.liu\Desktop\cursor_try\QAS\h5-video-tool-api\src\services\batchJobsQueue.ts`
- Modify: `C:\Users\wei.liu\Desktop\cursor_try\QAS\h5-video-tool-api\src\routes\batchJobs.ts`
- Modify: `C:\Users\wei.liu\Desktop\cursor_try\QAS\h5-video-tool\src\api\batchJobs.ts`

**Step 1: Extend batch job model**

- Add `segmentId`
- Add `sourceShotIndexes`
- Add `primaryShotIndex`

**Step 2: Update enqueue route**

- Accept segment-aware payload instead of only `shotIndex`
- Preserve backward compatibility where possible

**Step 3: Update queue writeback**

- On submit / fail / cancel / done, write status back to segment first
- Then update shot aggregate fields if needed

**Step 4: Verify queue APIs**

- Ensure SSE payload still works for existing consumers
- Keep `shotIndex` populated as `primaryShotIndex`

### Task 4: Update Production Wizard submit flow

**Files:**
- Modify: `C:\Users\wei.liu\Desktop\cursor_try\QAS\h5-video-tool\src\pages\ProductionWizard.tsx`

**Step 1: Resolve shot-associated segments**

- Replace direct `shot -> enqueue` logic with `shot -> related execution segments -> enqueue each segment`

**Step 2: Deduplicate merged segments**

- If a merged segment already has a queued/running/completed job, do not enqueue duplicate work.

**Step 3: Keep original shot UX intact**

- Current shot button triggers related segments, not raw shot duration.

**Step 4: Verify submit payload**

- Confirm duration sent to Dreamina comes from segment duration and stays within `4-15s`.

### Task 5: Add shot-level execution segment UI

**Files:**
- Modify: `C:\Users\wei.liu\Desktop\cursor_try\QAS\h5-video-tool\src\studio\steps\StepStoryboardWorkspace.tsx`
- Modify: `C:\Users\wei.liu\Desktop\cursor_try\QAS\h5-video-tool\src\studio\steps\StepStoryboardShotStrip.tsx`
- Create: `C:\Users\wei.liu\Desktop\cursor_try\QAS\h5-video-tool\src\studio\components\ShotExecutionSegmentsPanel.tsx`

**Step 1: Add compact summary**

- Show execution segment count and mode summary under each shot.

**Step 2: Add expandable panel**

- Show related segments with:
  - label
  - duration
  - source shots
  - status
  - video / failure message

**Step 3: Shared segment handling**

- If one merged segment belongs to multiple shots, display it consistently without duplicate enqueue behavior.

### Task 6: Add aggregate shot status helpers

**Files:**
- Create: `C:\Users\wei.liu\Desktop\cursor_try\QAS\h5-video-tool\src\studio\executionSegmentStatus.ts`
- Modify: `C:\Users\wei.liu\Desktop\cursor_try\QAS\h5-video-tool\src\studio\exportStoryboardStatus.ts`

**Step 1: Add aggregate logic**

- Implement `resolveShotAggregateStatus(shot, relatedSegments)`

**Step 2: Use aggregate status in UI**

- Replace assumptions that one shot only has one underlying execution job.

### Task 7: Documentation and product notes

**Files:**
- Modify: `C:\Users\wei.liu\Desktop\cursor_try\QAS\PRODUCT.md`

**Step 1: Add changelog entry**

- Record execution segment layer, merge/split behavior, and UI compatibility.

**Step 2: Update Production Wizard module description**

- Mention original shot view + Dreamina execution segments.

### Task 8: Verification and release

**Files:**
- No code changes required unless issues are found

**Step 1: Local verification**

Run:

```bash
cd h5-video-tool-api
npx tsc --noEmit
npm run build

cd ../h5-video-tool
npm run build
```

**Step 2: Behavioral verification**

- Test one `<4s` consecutive short-shot project
- Test one `>15s` long-shot project
- Confirm resulting queued units are segments, not raw shots
- Confirm original shot cards still render correctly

**Step 3: Release flow**

Run:

```bash
git add <relevant files> PRODUCT.md
git commit -m "feat: add production execution segments"
git push origin main
python scripts/deploy_all.py --target staging --updated-by wei.liu
python scripts/mark_release_ready.py --updated-by wei.liu
python scripts/deploy_all.py --target prod --updated-by wei.liu
python scripts/set_deployment_state.py --target prod --phase idle --updated-by wei.liu
```

Plan complete and saved to `docs/plans/2026-04-24-production-execution-segments-implementation-plan.md`. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints

Which approach?

