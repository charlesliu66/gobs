# Ark Seedance API Switch Design

**Date:** 2026-05-06

## Goal

Replace the local Dreamina CLI dependency with Volcengine Ark Seedance video-generation APIs while keeping the existing GOBS/QAS H5 generation flow, queue model, and project writeback behavior stable.

## Context

The current implementation uses `dreaminaVideo.ts` as the submission and polling boundary for storyboard video generation. Frontend code, queue orchestration, and project persistence already depend on this boundary and on the existing model IDs:

- `dreamina-text2video`
- `dreamina-image2video`
- `dreamina-multimodal`

The user now has Ark API access instead of a Dreamina CLI-capable membership. The replacement should avoid broad frontend churn and should preserve existing production workflows.

## Decisions

### 1. Keep frontend model IDs stable

The frontend will continue to use the existing Dreamina-oriented model IDs. The backend will map them to Ark Seedance model IDs so we do not need to rewrite queueing, shot defaults, or historical project data.

Default backend mapping:

- `dreamina-text2video` -> `Doubao-Seedance-2.0`
- `dreamina-image2video` -> `Doubao-Seedance-2.0`
- `dreamina-multimodal` -> `Doubao-Seedance-2.0`

Fast model support will be configuration-driven so we can later route selected scenarios to `Doubao-Seedance-2.0-fast` without changing H5 state shape.

### 2. Introduce an Ark adapter behind the Dreamina compatibility layer

Add a new service dedicated to Ark request/response translation. `dreaminaVideo.ts` will remain the compatibility facade used by routes and queueing code, but its internals will stop depending on the CLI.

This keeps these files mostly stable:

- `h5-video-tool-api/src/routes/videoDreamina.ts`
- `h5-video-tool-api/src/services/dreaminaScheduler.ts`
- `h5-video-tool-api/src/services/batchJobsQueue.ts`

### 3. Preserve existing queue semantics, but adjust cancellation messaging

Ark only allows cancellation for queued tasks. Running tasks cannot be remotely stopped through the documented delete API.

Therefore:

- backend should call Ark delete only when the provider task is still queued
- if the local job is already running, local cancel means “stop tracking / abandon this result”, not “the provider task is terminated”
- H5 text must reflect this distinction in Chinese and English

### 4. Surface provider failures as localized user-facing messages

Current H5 surfaces already show `failReason` and `lastVideoError.reason`. We should keep using those paths, but make the content better.

Backend should normalize provider failures into:

- stable error code
- localized user-facing message in Chinese and English
- original provider message for debugging

The H5 should prefer a localized display string while preserving raw details for support/debug use.

## Data Contract Changes

### Backend job / project persistence

Enhance failure payloads so they can carry:

- `errorCode`
- `displayMessageZh`
- `displayMessageEn`
- `providerMessage`
- `providerStatus`

These fields should be optional and backward-compatible. Existing `failReason` and `lastVideoError.reason` remain populated so old UI paths still work.

### Frontend rendering

Frontend should prefer:

1. localized display message for current locale
2. fallback to the other locale if needed
3. fallback to `failReason`

This ensures the GOBS H5 can display readable bilingual errors such as:

- `提示词可能涉及版权/IP限制，请改写品牌名、角色名、歌词或受保护作品描述后重试。`
- `The prompt may hit copyright or IP restrictions. Rewrite brand names, character names, lyrics, or protected work descriptions and try again.`

## Ark Input Strategy

### Supported initial inputs

- text prompt
- image reference via public URL or `data:image/...;base64,...`
- multimodal images via `reference_image`

### Deferred compatibility concerns

Ark docs provided by the user clearly support base64 data URLs for images. Video and audio references are documented as URLs; if current multimodal production flow relies on local-only video/audio inputs, we will adapt them through server-hosted accessible URLs rather than blocking the broader API switch.

## Error Taxonomy

Initial normalized categories:

- `ARK_CONTENT_POLICY`
- `ARK_COPYRIGHT_RISK`
- `ARK_INPUT_INVALID`
- `ARK_ASSET_UNAVAILABLE`
- `ARK_RATE_LIMIT`
- `ARK_AUTH_INVALID`
- `ARK_TIMEOUT`
- `ARK_TASK_FAILED`

These will map into concise bilingual user messages while preserving the underlying provider text.

## Verification Targets

- existing queue enqueue / polling / writeback flow still works with Ark task IDs
- failed jobs populate readable localized reasons in H5
- queued job cancellation calls Ark delete
- running job cancellation uses local abandon wording and no false promise of remote cancellation
- TypeScript builds stay green in backend and frontend
