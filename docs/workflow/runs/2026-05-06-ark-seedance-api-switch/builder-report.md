# Builder Report

Run: `2026-05-06-ark-seedance-api-switch`

## Delivered

- Added Ark Seedance adapter in `h5-video-tool-api/src/services/arkSeedanceVideo.ts` for:
  - provider model resolution
  - Dreamina-compatible payload mapping
  - task create/get/delete
  - bilingual error normalization
  - result download to data URL
- Wired `h5-video-tool-api/src/services/dreaminaVideo.ts` to use Ark when `ARK_API_KEY` is present while keeping existing Dreamina-compatible entrypoints and task IDs.
- Updated `h5-video-tool-api/src/services/batchJobsQueue.ts` to persist Ark provider status and structured error fields through polling, cancellation, and project write-back.
- Extended backend/frontend job status models and DTOs to carry:
  - `errorCode`
  - `displayMessageZh`
  - `displayMessageEn`
  - `providerMessage`
  - `providerStatus`
- Extended `h5-video-tool/src/studio/productionTypes.ts` so storyboard/project state can retain localized provider error metadata.
- Added targeted regression tests:
  - `h5-video-tool-api/tests/arkSeedanceVideo.test.ts`
  - `h5-video-tool/tests/storyboardVideoErrorDisplay.test.ts`

## Acceptance Mapping

- AC: Replace Dreamina CLI submission/polling with official Ark Seedance API.
  - Met by `arkSeedanceVideo.ts` plus Ark branches in `dreaminaVideo.ts`.
- AC: Preserve current Dreamina-compatible frontend model names and queue flow.
  - Met by keeping Dreamina service function signatures and `dreamina-*` task IDs unchanged.
- AC: Show provider failures in a user-readable zh/en form.
  - Met by Ark error normalization plus propagation through task poll and batch job DTOs.
- AC: Adjust cancel semantics for running jobs to local abandon/stop-tracking instead of guaranteed remote termination.
  - Met by queue cancellation notes and remote delete only being attempted for submitted queued jobs.

## Verification

- `node --import tsx --test tests/arkSeedanceVideo.test.ts` in `h5-video-tool-api`
- `..\h5-video-tool-api\node_modules\.bin\tsx.cmd --test tests/storyboardVideoErrorDisplay.test.ts` in `h5-video-tool`
- `npm run build` in `h5-video-tool-api`
- `npm run build` in `h5-video-tool`

## Notes

- `h5-video-tool-api/src/services/dreaminaVideo.ts` was updated narrowly because this task explicitly requires replacing the Dreamina provider path.
- Some large legacy UI files in the repo use non-UTF-8 encoding, so the current implementation prioritizes provider-side bilingual error propagation first. The main queue/project flow now carries zh/en error metadata end-to-end.
