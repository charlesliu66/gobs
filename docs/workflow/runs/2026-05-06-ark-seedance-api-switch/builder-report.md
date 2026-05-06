# Builder Report

## Scope

- Run id: `2026-05-06-ark-seedance-api-switch`
- Builder goal: align Ark personal API concurrency with a `3`-slot scheduler, refresh the H5 queue UX, and surface a recent real-world duration baseline based on the latest `10` successful storyboard videos.

## Implemented

- Backend queue math now uses Ark-aware concurrency with a single source of truth:
  - `h5-video-tool-api/src/services/arkSeedanceVideo.ts`
  - `h5-video-tool-api/src/services/queueSnapshot.ts`
  - `h5-video-tool-api/src/services/dreaminaScheduler.ts`
  - `h5-video-tool-api/src/services/batchJobsQueue.ts`
  - `h5-video-tool-api/src/routes/batchJobs.ts`
- Queue snapshots now expose `maxConcurrent` and `availableSlots`, and waiting ETA is derived from submitted service time plus `3`-lane capacity instead of old single-lane age math.
- Successful jobs now persist real `submittedAt -> completedAt` duration so queue snapshots can expose a rolling average across the latest `10` successful videos instead of relying on a generic static pace.
- Batch-job polling now preserves the Ark phase split:
  - `awaiting_submit` = local platform queue
  - `pending` = submitted to Ark, waiting for provider acceptance
  - `queuing` = accepted by Ark, waiting in Ark queue
  - `processing` = Ark running/rendering
- Project-level cancellation now allows `processing` jobs to transition into local “stop tracking” semantics instead of pretending the provider always cancelled remotely.
- Frontend queue DTO/state now carries the richer snapshot and uses it across:
  - `h5-video-tool/src/components/GlobalJobsPanel.tsx`
  - `h5-video-tool/src/components/BatchJobsBoard.tsx`
  - `h5-video-tool/src/studio/steps/StepStoryboardGenerateActions.tsx`
  - `h5-video-tool/src/studio/steps/StepStoryboardPreviewPanel.tsx`
  - `h5-video-tool/src/studio/steps/StepStoryboardShotStrip.tsx`
  - `h5-video-tool/src/studio/steps/StepStoryboardWorkspace.tsx`
  - `h5-video-tool/src/studio/steps/StepExportStoryboardOverview.tsx`
  - `h5-video-tool/src/hooks/useGlobalJobs.ts`
  - `h5-video-tool/src/i18n/messages.ts`
- Browser reminders are now emitted from the SSE global-jobs layer so completed / failed / stopped jobs can still notify after the user leaves the current shot view.
- User-facing progress wording is now unified around one business-friendly stage model:
  - `排队中 / Queued`
  - `即将开始 / Starting soon`
  - `正在生成 / Generating`
  - `即将完成 / Finishing soon`
  - `已完成 / Done`
- The primary queue surfaces now reuse the same friendly progress resolver so operations and marketing teammates no longer need provider-specific vocabulary:
  - `h5-video-tool/src/studio/steps/StepStoryboardGenerateActions.tsx`
  - `h5-video-tool/src/studio/steps/StepStoryboardPreviewPanel.tsx`
  - `h5-video-tool/src/studio/steps/StepStoryboardShotStrip.tsx`
  - `h5-video-tool/src/components/GlobalJobsPanel.tsx`
  - `h5-video-tool/src/components/BatchJobsBoard.tsx`
- The storyboard platform summary card now prefers the recent-success average label:
  - when enough history exists, it shows the latest successful sample count plus average sec/job
  - when no success history exists yet, it honestly falls back to an estimate instead of presenting a fake “recent average”

## Self-check Evidence

- Backend tests:
  - `node --import tsx --test tests/queueSnapshot.test.ts tests/arkSeedanceVideo.test.ts`
  - `node --import tsx --test tests/quickfilmBatchJobs.test.ts`
- Frontend tests:
  - `..\\h5-video-tool-api\\node_modules\\.bin\\tsx.cmd --test tests/storyboardQueueState.test.ts tests/shotUserStatus.test.ts`
  - `..\\h5-video-tool-api\\node_modules\\.bin\\tsx.cmd --test tests/storyboardVideoErrorDisplay.test.ts tests/productionExportStoryboardStatus.test.ts`
  - `..\\h5-video-tool-api\\node_modules\\.bin\\tsx.cmd --test tests/storyboardQueueState.test.ts tests/storyboardVideoErrorDisplay.test.ts`
- Builds:
  - `h5-video-tool-api: npm run build`
  - `h5-video-tool: npm run build`

## Notes

- `ProductionWizard.tsx` still contains a legacy mount-time notification permission request because the file currently has an invalid UTF-8 byte sequence that blocks `apply_patch` from editing it safely. The new browser reminder path is already centralized in `useGlobalJobs.ts`, so functional completion reminders are still in place.
- `PRODUCT.md` is now updated with the v0.138 queue-progress wording changelog entry.
