# Main Thread + A/B/C Sub-Agent + Heartbeat Runbook

> Date: 2026-05-11
> Applies to: GOBS/QAS work where one Codex main thread coordinates two Dev Worker lanes and one Release Owner lane inside the same conversation.

## Purpose

This runbook turns the repo's existing 4+1 workflow into a Codex-native coordination loop:

- one main thread acts as Orchestrator
- Agent A and Agent B handle parallel Dev Worker runs
- Agent C stays reserved for Release Owner work
- a thread heartbeat wakes the Orchestrator on a fixed interval and decides whether to wait, unblock, deploy, or dispatch the next run

Use this pattern when you want true orchestration inside one conversation. If you are coordinating three completely separate Codex windows, use shared repo artifacts instead; separate windows cannot be auto-prompted from this thread.

## Hard Boundaries

- The main thread is the only dispatcher.
- Agent A and Agent B are Dev Workers only.
- Agent C is Release Owner only.
- Agent A and Agent B must not run `scripts/deploy_all.py`, `scripts/mark_release_ready.py`, or `scripts/set_deployment_state.py`.
- Agent C must not start until the main thread has a concrete target SHA plus verification evidence from the dev lanes.
- The main thread should treat run artifacts as the source of truth, not "agent says it is done".

## Role Layout

| Lane | Role | Owns | Must return |
|---|---|---|---|
| Main thread | Orchestrator | dispatch, run selection, gate enforcement, escalation, release decision | current board, blockers, next assignment |
| Agent A | Dev Worker | one active run with disjoint editable scope | changed files, test evidence, branch/SHA, handoff notes |
| Agent B | Dev Worker | one active run with disjoint editable scope | changed files, test evidence, branch/SHA, handoff notes |
| Agent C | Release Owner | staging -> release-ready -> prod -> idle | deployed SHA, smoke evidence, final deployment state |

## Shared Signals The Main Thread Watches

The heartbeat should check these concrete signals in order:

1. Sub-agent state
   - whether Agent A/B/C is still running, completed, or blocked
2. Run artifact state
   - `docs/workflow/runs/<run-id>/SESSION-ANCHOR.md`
   - `planner-spec.md`
   - `challenger-review.md`
   - `builder-report.md`
   - `verifier-report.md`
   - `release-decision.md`
3. Guard/test state
   - `python scripts/workflow_guard.py --run-id <run-id> --stage verify`
   - `python scripts/workflow_guard.py --run-id <run-id> --stage build`
   - `bash scripts/eval.sh <run-id>` when the run requires full mechanical verification
   - `docs/workflow/runs/<run-id>/eval-result.json`
   - frontend/backend build results
4. Git state
   - branch name
   - pushed SHA
   - whether the release SHA exists on the intended branch
5. Deployment state
   - `python scripts/set_deployment_state.py --target staging --show`
   - `python scripts/set_deployment_state.py --target prod --show`
   - whether `updatedBy` still points to the same Release Owner
   - release-ready metadata for the target SHA when prod is queued
   - `http://43.134.186.196:8080/api/system/version`
   - `http://43.134.186.196/api/system/version`

The heartbeat should also catch coordination drift:

- `docs/TASK-INDEX.md` still matches the active runs and latest pushed SHA
- the two live `SESSION-ANCHOR.md` files do not claim overlapping editable paths
- `release-decision.md` clearly says `GO` and the handoff boundary is explicit
- any forbidden-file change, new env var, product tradeoff, or prod approval request is escalated instead of auto-advanced

## Transition Rules

### A / B dispatch

Spawn Agent A or B only when all of the following are true:

- the run already exists or the main thread has bootstrapped it
- `SESSION-ANCHOR.md` clearly lists editable files
- the run does not overlap another live builder's write scope
- Planner and Challenger blockers are clear enough for Builder to start

### A / B complete

Treat a dev lane as ready for handoff only when all of the following are true:

- the agent reports exact changed files
- `builder-report.md` maps AC to implementation
- `verifier-report.md` shows P0/P1 = 0
- `eval-result.json` is `PASS`, or the verifier records explicit substitute evidence and accepted risk
- required build/tests were run or skipped with reason
- `release-decision.md` says `GO` and the Dev Worker boundary is explicit
- a concrete branch/SHA is available for pickup

### C dispatch

Spawn Agent C only when all of the following are true:

- the main thread has chosen the exact SHA to promote
- the dev work is already pushed to the required branch
- the target SHA is reachable from `origin/main`
- staging/prod deployment is explicitly in C's scope for this round
- release prerequisites are recorded in the relevant run docs or handoff packet

### Next A / B round

Dispatch the next run to A/B only after C reports:

- staging result
- prod result when prod was requested
- final `idle` restore for prod when prod was touched
- version convergence across local `HEAD`, `origin/main`, staging, and prod when release was involved
- any release-side blockers or rollback notes

## Recommended Heartbeat Cadence

- Use a thread heartbeat, not a detached cron job, because the orchestration context lives in this conversation.
- Recommended interval: every 15 minutes for normal work, every 5 minutes during an active release window.
- If the main thread is already actively waiting for Agent C during staging/prod, the heartbeat may be shortened temporarily and then restored.

## Main Thread Loop

1. Read `AGENTS.md`, `.claude/memory/feedback.md`, `docs/TASK-INDEX.md`, and the active run docs.
2. Choose up to two parallel Dev Worker runs with disjoint editable scope.
3. Spawn Agent A and Agent B with explicit ownership, stop conditions, and required output format.
4. Do not busy-wait. Let the heartbeat or a deliberate `wait_agent` check drive the next review point.
5. When A or B finishes, verify artifacts and tests before treating the lane as done.
6. When the target SHA is ready, spawn Agent C with release-owner-only instructions.
7. After C completes, record the deployed SHA and assign the next queued run to A/B.

## Release Owner Gate Checks

Before C starts release work, the main thread should confirm:

- exactly one Release Owner is active for the round
- the release-scope working tree is clean enough for preflight
- local `HEAD`, `origin/main`, staging version, and prod version are all known
- staging promotion only proceeds after staging reports the target SHA and smoke passes
- prod promotion only proceeds after the release-ready metadata matches the same target SHA
- prod is not considered complete until version checks pass, smoke passes, and deployment state returns to `idle`

## Dispatch Packet Template

Use this structure when spawning A or B:

```text
You are Dev Worker A/B for run <run-id>.
Ownership:
- Editable scope: <paths>
- Do not edit: <paths>
- Do not deploy or mark release-ready.
Required read order:
- AGENTS.md
- .claude/memory/feedback.md
- docs/TASK-INDEX.md
- docs/workflow/runs/<run-id>/SESSION-ANCHOR.md
- docs/workflow/runs/<run-id>/planner-spec.md
Required output:
- changed files
- commands run
- builder/verifier artifact updates
- branch/SHA or blocker
Stop and report if:
- forbidden file needed
- new env var needed
- product tradeoff needed
- scope collides with another live lane
```

Use this structure when spawning C:

```text
You are Release Owner C.
Target SHA: <sha>
Inputs:
- run ids: <run-id list>
- staging/prod intent: <staging only | staging then prod>
- handoff evidence: <tests, smoke checklist, risks>
Allowed actions:
- deploy staging
- run staging smoke
- mark release ready
- deploy prod when approved for this round
- restore prod idle
Return:
- deployed SHA by environment
- smoke evidence
- deployment-state result
- rollback or blocker notes
```

## Heartbeat Prompt Template

Attach a heartbeat to the main thread with a prompt equivalent to:

```text
Check the current orchestration state for Agent A, Agent B, and Agent C.
Read the active run artifacts and deployment state.
Then do exactly one of:
1. wait because all active lanes are still legitimately in progress
2. surface a blocker that requires user approval
3. dispatch Agent C because the target SHA and dev evidence are ready
4. dispatch the next queued run to Agent A or Agent B because release work is done
5. summarize drift if artifacts, SHA, or deployment state disagree
Never invent completion from chat alone. Prefer repo artifacts, guard output, pushed SHA, and environment version checks.
```

## When Not To Use This Pattern

Do not use this pattern when:

- the work can be finished safely in one lane
- the candidate runs touch the same files
- the release owner work is not yet needed
- you are actually coordinating separate human-operated windows rather than sub-agents in one thread

In those cases, use the simpler single-run Orchestrator flow or the existing Dev Worker -> Release Owner handoff checklist.
