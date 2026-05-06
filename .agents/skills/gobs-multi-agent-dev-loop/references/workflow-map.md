# Workflow Map

## Choose The Entry Path

- Start a new run when the task is new, multi-file, or not already anchored.
- Reuse the current run when the task is clearly part of an existing scoped implementation.

## Command Map

Create a run:

```bash
python scripts/init_workflow_run.py \
  --slug <feature-name> \
  --goal "<one sentence goal>"
```

Guard before implementation:

```bash
python scripts/workflow_guard.py --run-id <run-id> --stage build
```

Mechanical verification:

```bash
bash scripts/eval.sh <run-id>
python scripts/workflow_guard.py --run-id <run-id> --stage verify
```

Release gating:

```bash
python scripts/workflow_guard.py --run-id <run-id> --stage release
```

## Artifact Map

Each run should own:

- `SESSION-ANCHOR.md`
- `planner-spec.md`
- `challenger-review.md`
- `builder-report.md`
- `verifier-report.md`
- `release-decision.md`

## Escalation Boundaries

Escalate only for:

- forbidden-file changes
- new env vars
- product behavior tradeoffs
- prod release approval

## Related Skills

Use these repo-local skills as the run matures:

- `.agents/skills/gobs-release-guard/SKILL.md`
- `.agents/skills/gobs-h5-smoke-test/SKILL.md`
