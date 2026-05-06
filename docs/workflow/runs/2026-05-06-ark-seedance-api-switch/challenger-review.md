# Challenger Review

Run: `2026-05-06-ark-seedance-api-switch`  
Date: 2026-05-06  
Reviewer: Codex Challenger sidecars

## Must-Fix Before Builder Completes

1. Backend concurrency must have one Ark-aware source of truth.
   - `dreaminaScheduler.ts` still defaults submission concurrency to `1`
   - polling and UI assumptions already drift away from that

2. Submit retry behavior must avoid burning all retries in one scheduler pass.
   - a transient submit error can currently spin at the queue head and starve later jobs

3. ETA must be recalculated for concurrency `3`.
   - current snapshot math assumes a single serial lane and uses total job age that already includes waiting time

4. H5 wording must stop implying a single-lane Dreamina flow.
   - `awaiting_submit`, `pending/queuing`, and `processing` need Ark-appropriate wording
   - avoid phrases like “轮到你了 / it is your turn now”

5. Completion reminders must be centralized to avoid duplicate spam.
   - do not add browser reminders independently in page-level handlers and SSE handlers
   - dedupe should live in the global jobs stream layer

6. Batch/global job surfaces must align with stop-tracking semantics.
   - running jobs should support local “stop tracking” behavior consistently across surfaces
   - terminal progress should count all terminal states, not just `done`

## Recommended State Model

- `awaiting_submit`: local platform queue only, not yet accepted by Ark
- `pending`: Ark accepted the task and returned IDs, but provider queue/run state not yet confirmed
- `queuing`: Ark task exists and is queued on provider side
- `processing`: Ark reports active rendering/running
- `done|failed|cancelled`: terminal

## ETA Recommendation

- Use recent provider service time rather than total job age from initial enqueue
- Scale waiting ETA by effective concurrency `3`
- Treat `etaSec` as “estimated wait until Ark starts this job” unless the UI explicitly needs finish ETA

## UX Wording Recommendation

- `awaiting_submit`: `平台排队中` / `In platform queue`
- `pending`: `已提交到 Ark` / `Submitted to Ark`
- `queuing`: `Ark 队列中` / `Queued in Ark`
- `processing`: `Ark 生成中` / `Rendering in Ark`
- `done`: `已完成` / `Completed`
- `failed`: `生成失败` / `Failed`
- `cancelled`: `已取消排队` or `已停止跟进` depending on whether rendering had started

## Gate Result

- Challenger blockers remain until Builder:
  - unifies Ark concurrency handling
  - fixes ETA math
  - centralizes reminder dedupe
  - updates user-facing queue wording across the main H5 surfaces
