# Verifier Report

## Verdict

- Status: `GO`
- Run id: `2026-05-06-ark-seedance-api-switch`
- Verified workspace: current release candidate after the user-friendly queue wording polish

## Coverage

- Backend unit / integration checks
  - `node --import tsx --test tests/queueSnapshot.test.ts tests/arkSeedanceVideo.test.ts`
  - `node --import tsx --test tests/quickfilmBatchJobs.test.ts`
- Frontend state / status checks
  - `..\h5-video-tool-api\node_modules\.bin\tsx.cmd --test tests/storyboardQueueState.test.ts tests/shotUserStatus.test.ts`
  - `..\h5-video-tool-api\node_modules\.bin\tsx.cmd --test tests/storyboardVideoErrorDisplay.test.ts tests/productionExportStoryboardStatus.test.ts`
- Build verification
  - `h5-video-tool-api: npm run build`
  - `h5-video-tool: npm run build`
- Workflow evaluation
  - `bash scripts/eval.sh 2026-05-06-ark-seedance-api-switch`
- Staging smoke
  - `powershell -ExecutionPolicy Bypass -File .agents/skills/gobs-h5-smoke-test/scripts/smoke_http.ps1 -Env staging -Depth quick -ExpectedCommit 930a441`
- Prod smoke
  - `powershell -ExecutionPolicy Bypass -File .agents/skills/gobs-h5-smoke-test/scripts/smoke_http.ps1 -Env prod -Depth quick -ExpectedCommit 930a441`

## Results

- Queue scheduling now respects `3` Ark concurrency slots on both scheduler admission and ETA calculation.
- Successful storyboard jobs now persist real submit-to-video elapsed time, and queue snapshots expose the rolling average from the latest `10` successful videos.
- Main user-facing queue surfaces now reuse the same friendly wording model instead of provider-centric labels:
  - `排队中 / Queued`
  - `即将开始 / Starting soon`
  - `正在生成 / Generating`
  - `即将完成 / Finishing soon`
  - `已完成 / Done`
- Queue status copy now distinguishes:
  - platform queue
  - submitted to Ark
  - queued in Ark
  - rendering in Ark
  - tracking stopped
- Global jobs UI now exposes capacity context through `maxConcurrent` and `availableSlots`.
- The storyboard platform summary now shows the recent-success sec/job baseline and falls back transparently when no successful history exists yet.
- Completion reminders are emitted from the global jobs SSE layer so done / failed / cancelled jobs can notify outside the active shot view.
- Staging smoke passed with version `staging @ 930a441`.
- Prod smoke passed with version `prod @ 930a441`.

## Residual Risks

- `ProductionWizard.tsx` still requests browser notification permission on mount because the file contains legacy encoding damage that blocked safe `apply_patch` editing in this run.
- `eval.sh` reported `P1_WARN` only because local API health was not exercised from a running local server during the scripted eval; staging and prod smoke both passed afterward.
