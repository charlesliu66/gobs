# SESSION-ANCHOR — Ark Seedance API switch + localized H5 video errors

**Run ID**: `2026-05-06-ark-seedance-api-switch`
**Target**: Replace Dreamina CLI dependency with Ark Seedance APIs while preserving storyboard queue behavior and exposing bilingual user-facing failure messages in GOBS H5.
**Gate**: Gate 1 -> Gate 2

## Scope

### Allowed code areas

- `h5-video-tool-api/src/services/dreaminaVideo.ts`
- `h5-video-tool-api/src/services/batchJobsQueue.ts`
- `h5-video-tool-api/src/services/dreaminaScheduler.ts`
- `h5-video-tool-api/src/domain/job-status.ts`
- `h5-video-tool-api/src/routes/videoDreamina.ts`
- `h5-video-tool-api/src/routes/batchJobs.ts`
- `h5-video-tool-api/.env.example`
- `h5-video-tool/src/api/batchJobs.ts`
- `h5-video-tool/src/studio/productionTypes.ts`
- `h5-video-tool/src/pages/ProductionWizard.tsx`
- `h5-video-tool/src/studio/steps/StepStoryboardShotStrip.tsx`
- `h5-video-tool/src/studio/steps/StepStoryboardGenerateActions.tsx`

### New files expected

- `h5-video-tool-api/src/services/arkSeedanceVideo.ts`
- targeted tests for backend/frontend display logic
- run docs and builder report

## Explicit decisions

- Keep frontend model IDs stable; backend maps them to Ark model IDs.
- Default provider model is `Doubao-Seedance-2.0`; fast stays config-driven.
- Running-job cancel in H5 must be described as abandon/stop tracking, not guaranteed provider cancellation.
- Failure display should be readable in both Chinese and English depending on locale, with raw provider detail preserved.

## Acceptance focus

1. Existing H5 flow continues to enqueue/poll/write back storyboard videos through the current route surface.
2. Provider task failures surface readable localized reasons in GOBS H5.
3. Ark queued-task deletion is used when remotely possible.
4. TypeScript builds remain green in backend and frontend.
