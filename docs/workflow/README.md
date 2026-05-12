# Harnesswork 4+1 Workflow

This directory contains the repo-local delivery system for GOBS/QAS. It is designed for multi-agent work, but it also works when one agent is covering every role.

## What Lives Here

- `contracts/`
  - Required artifact structure for each gate.
- `prompts/`
  - Role prompts for Planner, Challenger, Builder, Verifier, Integrator, and Orchestrator.
- `checklists/`
  - Gate checklist and release rules.
- `runs/`
  - One folder per delivery run.

## Core Rule

No role can skip gates.

The base flow is:

1. Planner
2. Challenger
3. Builder
4. Verifier
5. Integrator / Release owner

If Verifier finds P0/P1 defects, the flow loops back to Builder until those defects are zero.

## Minimal Multi-Agent Setup

Use this layout unless the task is unusually large:

1. `Orchestrator`
   - Owns the loop, escalation, and release decision.
2. `Planner`
   - Writes `planner-spec.md`.
3. `Challenger`
   - Attacks the plan and clears `must-fix-before-build`.
4. `Builder`
   - Edits only files listed in `SESSION-ANCHOR.md`.
5. `Verifier`
   - Validates, reproduces, and blocks release on P0/P1.

This keeps the user out of day-to-day coordination while preserving clear handoff points.

## Run Bootstrap

Create a run folder first.

```bash
python scripts/init_workflow_run.py \
  --slug multi-agent-dev-loop \
  --goal "Land repo-local multi-agent workflow guardrails" \
  --ac "Run bootstrap script creates required artifacts" \
  --ac "Workflow guard blocks forbidden or out-of-scope edits" \
  --editable docs/workflow \
  --editable scripts/init_workflow_run.py \
  --editable scripts/workflow_guard.py
```

This generates:

- `SESSION-ANCHOR.md`
- `planner-spec.md`
- `challenger-review.md`
- `builder-report.md`
- `verifier-report.md`
- `release-decision.md`

## Scope Contract

`SESSION-ANCHOR.md` is the file-ownership contract for the run.

It must list:

- `Editable Files (Builder Ownership)`
- `Read-Only References`
- `Additional Forbidden Paths`
- `Out of Scope`
- `Escalation Rules`

If editable scope is missing or vague, the run is not ready for Builder.

## Workflow Guard

Use workflow guard before build, before verify, and again before release.

```bash
python scripts/workflow_guard.py --run-id <run-id> --stage build
python scripts/workflow_guard.py --run-id <run-id> --stage verify
python scripts/workflow_guard.py --run-id <run-id> --stage release
```

It checks:

- required run artifacts for the current stage
- forbidden-file touches
- edits outside the run's editable scope
- whether `PRODUCT.md` was updated for code/tooling changes
- whether Challenger and Release docs still show blockers

## Verification Loop

Workflow guard is not a replacement for verification. Use both:

```bash
bash scripts/eval.sh <run-id>
python -m unittest scripts.tests.<targeted-tests>
```

At minimum:

- backend build must pass
- frontend build must pass
- task-specific tests must pass
- Verifier must record evidence in `verifier-report.md`

## Release Ownership

Only one release owner should execute:

1. `python scripts/deploy_all.py --target staging`
2. staging verification
3. `python scripts/mark_release_ready.py --updated-by <name>`
4. `python scripts/deploy_all.py --target prod --updated-by <name>`
5. `python scripts/set_deployment_state.py --target prod --phase idle --updated-by <name>`

This avoids the "one person built it, another person half-released it" drift that already caused confusion in prior runs.

## Codex Main-Thread Variant

When you want one Codex conversation to coordinate multiple lanes internally, use:

- `docs/guides/2026-05-11-main-thread-subagent-heartbeat-runbook.md`
  - repo-specific operating model for one main thread, two Dev Worker sub-agents, one Release Owner sub-agent, plus a thread heartbeat
- `docs/workflow/prompts/main-thread-subagent-heartbeat-orchestrator.md`
  - reusable prompt for the main dispatch thread

This variant is for sub-agents inside one thread. If you are coordinating fully separate windows, keep using shared run artifacts plus the existing handoff guide instead of expecting cross-window auto-dispatch.

## Recommended Escalations

Escalate to the user only when:

- a forbidden file must change
- a new env var is required
- acceptance criteria need to expand
- a product behavior tradeoff needs approval
- prod release approval is required

Everything else should stay inside the loop.
