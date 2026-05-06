# Planner Spec - Ark Seedance API switch + localized H5 video errors + concurrency-3 UX

**Date**: 2026-05-06  
**Author**: Codex  
**Audience**: Challenger / Builder / Verifier

## Background

The project has already switched storyboard video generation from Dreamina CLI to Volcengine Ark Seedance. Production validation on 2026-05-06 showed that the provider integration now works, but the queue/scheduler UX still reflects an older single-lane Dreamina mental model.

The user's Ark personal API documentation states that the provider supports three concurrent jobs. We need to align backend scheduling, ETA estimation, and H5 status wording with that concurrency model so users can tell:

- whether their shot is still waiting for an Ark slot
- whether it has already been submitted to Ark
- whether Ark is actively rendering it
- when it finishes, even if the user is not staring at the same panel

## Acceptance Criteria

### AC1 - Ark-aware scheduler behavior

When Ark mode is enabled, the scheduler should treat the provider as having three concurrent execution slots. Jobs beyond those slots must remain in `awaiting_submit` until a slot is available.

### AC2 - Clear provider state mapping

The backend should map Ark polling states into user-visible job states consistently enough that H5 can distinguish:

- platform queue waiting
- provider accepted / provider queueing
- provider rendering
- terminal success / failure / cancelled

### AC3 - Concurrency-aware ETA

Platform queue ETA should be estimated using concurrency = 3 instead of a single serial lane. Waiting jobs should not appear to be blocked behind every currently active job one-by-one.

### AC4 - H5 queue wording

H5 surfaces should stop implying a Dreamina-only queue and should use Ark-appropriate language in both Chinese and English where practical.

### AC5 - Completion reminders

When a storyboard video job finishes:

- success: in-app toast plus browser notification when permission is granted
- failed/cancelled terminal transitions: in-app toast

Reminder logic must avoid duplicate firing on SSE reconnect or job list refresh.

### AC6 - Backward compatibility

Existing consumers that read `failReason`, `lastVideoError.reason`, `pendingVideoSubmitId`, and current job statuses must keep working even if they do not yet understand new structured queue metadata.

## Risks

- Ark delete API still cannot stop already running tasks.
- SSE reconnects can replay updates, so reminder logic must be idempotent.
- Some legacy UI files still contain provider-specific wording and mixed encoding history.
- Persisted job/project shapes require optional-field compatibility.

## Recommended Implementation Shape

1. Keep `awaiting_submit` as the platform waiting state.
2. Use an Ark-aware max concurrent value of 3 in the scheduler when Ark mode is enabled.
3. Refine active job state mapping so Ark `queued` stays queued/submitted while Ark `running` maps to processing/rendering.
4. Extend queue snapshot DTOs with concurrency metadata needed by the frontend.
5. Centralize completion reminder dedupe in the global jobs stream layer rather than scattering it across multiple pages.

## Verification Matrix

1. Backend tests for scheduler / queue snapshot behavior under concurrency = 3.
2. Backend tests for Ark state mapping to `awaiting_submit` / `pending|queuing` / `processing`.
3. Frontend tests or deterministic checks for localized status wording and reminder dedupe.
4. Backend `npm run build`.
5. Frontend `npm run build`.
6. Staging smoke plus one real end-to-end Ark queue probe before prod.
