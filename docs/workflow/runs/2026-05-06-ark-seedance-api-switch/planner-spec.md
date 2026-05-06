# Planner Spec — Ark Seedance API switch + localized H5 video errors

**Date**: 2026-05-06
**Author**: Codex
**Audience**: Builder / Verifier

## Background

The project currently depends on a local Dreamina CLI path for storyboard video generation. The user no longer has a usable CLI membership and instead has Volcengine Ark API access with the available model names:

- `Doubao-Seedance-2.0`
- `Doubao-Seedance-2.0-fast`

The replacement must preserve existing H5 generation UX, queueing, and project writeback behavior.

## Acceptance Criteria

### AC1 — Submission compatibility

Calls that currently invoke `submitDreaminaVideo` or `submitDreaminaMultimodalVideo` should create Ark video-generation tasks successfully without requiring Dreamina CLI login or wrapper scripts.

### AC2 — Polling compatibility

Current batch job polling should continue to work against Ark provider task IDs and should still drive:

- queue status updates
- processing state
- success writeback
- failed/cancelled writeback

### AC3 — Localized H5 failure visibility

When the provider rejects a request for reasons such as copyright/IP restrictions, content policy, invalid inputs, or provider-side failure, GOBS H5 should display a readable user-facing message in the active locale.

### AC4 — Safe cancellation semantics

- queued provider tasks: remote delete/cancel when supported
- running provider tasks: local abandon/stop-tracking wording only

### AC5 — Backward compatibility

Existing consumers that read `failReason` or `lastVideoError.reason` must keep working even if they do not yet understand new structured fields.

## Risks

- Ark delete API cannot stop already running tasks.
- Provider multimedia reference rules may differ from current CLI assumptions.
- Old data shapes in persisted projects/jobs require optional-field compatibility.

## Verification matrix

1. Backend adapter tests for request mapping, polling normalization, and error classification.
2. Frontend display test for locale-sensitive failure-message choice.
3. Backend `npx tsc --noEmit`.
4. Frontend `npm run build`.
