# Session Anchor: Production Video Ownership Closeout

> Run ID: `2026-04-23-production-video-ownership-closeout`
> Date: 2026-04-23

## Goal

Close the remaining ownership and usability gaps for advanced production storyboard videos:

- A storyboard video must only be visible, pollable, cancellable, and written back inside the owning account, project, and shot.
- Users must see that their storyboard video task is queued, where it is in the shared platform queue, and that it will continue automatically until the result returns.
- The export/review page must present storyboard video status consistently with the storyboard step.

## Non-Goals

- Do not change Dreamina, Kling, VEO, studio pipeline, production types, or production assets core service files.
- Do not delete or clear existing generated videos.
- Do not add new provider integrations.

## Forbidden Files

- `h5-video-tool-api/src/services/dreaminaVideo.ts`
- `h5-video-tool-api/src/services/klingVideo.ts`
- `h5-video-tool-api/src/services/veoPython.ts`
- `h5-video-tool-api/src/services/studioPipeline.ts`
- `h5-video-tool-api/src/types/productionTypes.ts`
- `h5-video-tool-api/src/config/productionAssets.ts`
- `.env`

## File Scope

- `h5-video-tool-api/src/routes/batchJobs.ts`
- `h5-video-tool-api/src/services/batchJobsQueue.ts`
- `h5-video-tool-api/src/services/dreaminaRecovery.ts`
- `h5-video-tool/src/pages/ProductionWizard.tsx`
- `h5-video-tool/src/studio/steps/StepExportWorkspace.tsx`
- `h5-video-tool/src/studio/steps/StepExportStoryboardOverview.tsx`
- `h5-video-tool/tests/*`
- `h5-video-tool-api/tests/*`
- `PRODUCT.md`
- `CHANGELOG.md`
- `docs/workflow/runs/2026-04-23-production-video-ownership-closeout/*`

## Acceptance Commands

```powershell
cd h5-video-tool-api
npx tsc --noEmit
node --import tsx --test tests/quickfilmBatchJobs.test.ts

cd ..\h5-video-tool
npm run build
node --test tests/shotUserStatus.test.ts tests/productionExportStoryboardStatus.test.ts
```

## Release Requirement

Commit and push to `origin/main`, build local artifacts, deploy staging, mark release ready, deploy prod, and verify prod reports the released commit.
