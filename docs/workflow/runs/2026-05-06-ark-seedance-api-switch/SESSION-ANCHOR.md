# SESSION-ANCHOR - 2026-05-06-ark-seedance-api-switch

## Run Summary
- Run ID: `2026-05-06-ark-seedance-api-switch`
- Goal: Align Ark video scheduling and H5 queue UX with Ark personal API concurrency = 3 while preserving the existing storyboard generation flow.
- Owner: Codex
- Branch or commit context: `main@afe0d47`
- Last updated: `2026-05-06T05:00:00+08:00`

## Acceptance Criteria Snapshot
- AC-01: Ark mode uses provider concurrency `3` consistently for local admission, queue ETA, and active-slot accounting.
- AC-02: H5 clearly distinguishes platform queue, Ark accepted, Ark queued, Ark rendering, and terminal states in zh/en.
- AC-03: Users receive completion reminders without duplicate spam on SSE reconnect or manual polling.

## Editable Files (Builder Ownership)
- h5-video-tool-api/src/services/arkSeedanceVideo.ts
- h5-video-tool-api/src/services/batchJobsQueue.ts
- h5-video-tool-api/src/services/dreaminaScheduler.ts
- h5-video-tool-api/src/services/queueSnapshot.ts
- h5-video-tool-api/src/domain/job-status.ts
- h5-video-tool-api/src/routes/videoDreamina.ts
- h5-video-tool-api/src/routes/batchJobs.ts
- h5-video-tool-api/.env.example
- h5-video-tool-api/tests/queueSnapshot.test.ts
- h5-video-tool/src/api/batchJobs.ts
- h5-video-tool/src/hooks/useGlobalJobs.ts
- h5-video-tool/src/studio/productionTypes.ts
- h5-video-tool/src/pages/ProductionWizard.tsx
- h5-video-tool/src/components/GlobalJobsPanel.tsx
- h5-video-tool/src/components/BatchJobsBoard.tsx
- h5-video-tool/src/utils/notification.ts
- h5-video-tool/src/studio/storyboardQueueState.ts
- h5-video-tool/src/studio/steps/StepExportStoryboardOverview.tsx
- h5-video-tool/src/studio/steps/StepStoryboardShotStrip.tsx
- h5-video-tool/src/studio/steps/StepStoryboardGenerateActions.tsx
- h5-video-tool/src/studio/steps/StepStoryboardPreviewPanel.tsx
- h5-video-tool/src/studio/steps/StepStoryboardWorkspace.tsx
- h5-video-tool/src/i18n/messages.ts
- h5-video-tool/tests/storyboardQueueState.test.ts

## Read-Only References
- `docs/TASK-INDEX.md`
- `docs/workflow/runs/2026-05-06-ark-seedance-api-switch/planner-spec.md`
- `docs/workflow/runs/2026-05-06-ark-seedance-api-switch/challenger-review.md`
- `h5-video-tool-api/src/services/dreaminaVideo.ts`

## Additional Forbidden Paths
- `h5-video-tool-api/src/services/klingVideo.ts`
- `h5-video-tool-api/src/services/veoPython.ts`
- `h5-video-tool-api/src/services/studioPipeline.ts`
- `h5-video-tool-api/src/types/productionTypes.ts`
- `h5-video-tool-api/src/config/productionAssets.ts`

## Out of Scope
- introducing a new environment variable just for Ark concurrency
- changing non-Ark image generation providers
- redesigning unrelated H5 pages outside queue/status/reminder surfaces

## Progress Checklist
- [x] Planner approved
- [x] Challenger approved
- [x] Builder self-test recorded
- [ ] Verifier P0/P1 count is zero
- [ ] Release decision written

## Escalation Rules
- Escalate if a forbidden file must change.
- Escalate if a new env var is required.
- Escalate if acceptance criteria need to expand beyond queue/scheduler/status/reminders.
- Escalate before prod release approval.
