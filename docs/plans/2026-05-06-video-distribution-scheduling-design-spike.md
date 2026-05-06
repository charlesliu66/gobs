# Video Distribution Scheduling And Handoff Design Spike

## Purpose

Document the minimum backend and product constraints for adding marketer-facing scheduling and handoff later, without expanding the runtime scope of run `2026-05-06-video-distribution-marketer-ux-initial`.

## Scope Boundary

This spike is design-only.

Not included in this run:

- scheduled publish runtime behavior
- approval workflow runtime behavior
- new background workers
- new environment variables
- low-level video service changes

## Current Backend Reality

The current distribution backend can publish immediately through `POST /api/geelark/publish`, but it is not yet a durable scheduler:

- `publishVideo()` currently sets `scheduleAt` to `Date.now() / 1000`, so every task is immediate.
- `/api/geelark/tasks` and `/api/geelark/task/:id` expose execution history, not editable future plans.
- There is no server-owned store for pending schedules, reviewer assignment, or preflight snapshots.
- There is no retry, cancellation, or ownership model for a scheduled publish request after the browser closes.

This means the existing route set is good enough for "publish now" and history review, but not good enough for "publish later" or "hand off to another teammate safely."

## Product Jobs To Be Done

Scheduling should solve these user problems:

1. A marketer prepares a video and platform copy now, but wants it to go live later.
2. A teammate prepares the publish package, but another teammate approves or triggers it.
3. The team needs a durable record of who prepared, who approved, what copy was frozen, and what finally ran.

## Proposed Future Model

Introduce a server-owned publish job concept that wraps the current immediate GeeLark submit path.

Suggested lifecycle:

- `draft`: asset, account set, copy, and campaign framing are editable
- `ready`: preflight complete and ready for approval or scheduling
- `scheduled`: frozen payload with a target publish time
- `approved`: reviewer has approved the frozen payload
- `dispatching`: backend is submitting to GeeLark
- `running`: GeeLark accepted the task and execution is in progress
- `succeeded`
- `failed`
- `canceled`

Suggested durable fields:

- `jobId`
- `assetRef` (`videoPath`, optional derived URL)
- `accountIds`
- `platformPayloads`
- `campaignContext`
- `preflightSnapshot`
- `scheduledFor`
- `timezone`
- `preparedBy`
- `approvedBy`
- `approvalNotes`
- `submittedTaskIds`
- `lastDispatchError`

## Scheduling Design Recommendation

Use a two-layer model instead of calling GeeLark future scheduling directly from the browser:

1. QAS stores the durable publish intent.
2. A backend dispatcher submits to GeeLark near execution time.

Why:

- the current frontend should not become the source of truth for future jobs
- handoff/approval needs durable state before dispatch
- retry, cancellation, and audit become tractable only if QAS owns the job record

## GeeLark Questions To Resolve

The existing code strongly suggests GeeLark accepts a `scheduleAt` field, but the current implementation only uses "now". Before implementing future scheduling, verify:

1. Does GeeLark reliably accept future `scheduleAt` timestamps for this task type?
2. Which timezone does GeeLark expect: UTC epoch seconds, local device time, or account-region-local time?
3. Can a future task be edited, canceled, or rescheduled after submission?
4. What happens if the phone is not ready at the scheduled moment?
5. How are share links, screenshots, and failures surfaced for a delayed task versus an immediate task?

Until those answers are confirmed in staging, QAS should treat GeeLark future scheduling as untrusted.

## Handoff / Approval Design Recommendation

Keep approval lightweight at first.

Suggested v1 fields:

- `preparedBy`
- `preparedAt`
- `approvedBy`
- `approvedAt`
- `approvalStatus`
- `approvalNotes`

Suggested v1 rules:

- only `ready` jobs can move to `approved`
- editing a scheduled or approved job returns it to `draft`
- dispatch uses the frozen snapshot captured at approval time

This avoids "copy changed after approval" ambiguity.

## API Follow-Up Candidates

These are candidate endpoints for a later run, not commitments for this one:

- `POST /api/distribution/jobs`
- `PATCH /api/distribution/jobs/:id`
- `POST /api/distribution/jobs/:id/approve`
- `POST /api/distribution/jobs/:id/schedule`
- `POST /api/distribution/jobs/:id/cancel`
- `GET /api/distribution/jobs`
- `GET /api/distribution/jobs/:id`

The existing `POST /api/geelark/publish` can remain the immediate execution primitive underneath this layer.

## Rollout Constraints

Do not ship scheduling until all of the following are true:

1. Staging verifies timezone handling with explicit absolute timestamps.
2. The backend has a durable source of truth for future jobs.
3. Approval and edit rules are defined well enough to prevent silent payload drift.
4. Failure recovery is clear: retry, cancel, or manual rerun.
5. Task history can correlate a scheduled job with the final GeeLark task IDs.

## Recommended Next Slice

The next backend-safe slice should be a persistence-and-contract run, not a UI-only run:

- define the durable publish job schema
- add non-dispatch CRUD endpoints
- add staging-only validation for future `scheduleAt` semantics
- keep actual automatic dispatch behind a second gate after staging evidence

## Decision

For run `2026-05-06-video-distribution-marketer-ux-initial`, keep scheduling and handoff out of runtime scope. The correct next step is durable job modeling plus staging verification, not immediate future-publish behavior in the existing GeeLark route.
