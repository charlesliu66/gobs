# Release Artifacts Map

Map release checks back to the repo's workflow artifacts.

## Minimum run context

Preferred run directory:

```txt
docs/workflow/runs/<run-id>/
```

## Artifacts by strength

### Required early

- `SESSION-ANCHOR.md`
- `planner-spec.md`

### Strongly preferred for release preparation

- `challenger-review.md`
- `builder-report.md`
- `verifier-report.md`

### Required for strong prod confidence

- `release-decision.md`

## Practical interpretation

### preflight

Hard require:

- `SESSION-ANCHOR.md`
- `planner-spec.md`

Warn if missing:

- `builder-report.md`
- `verifier-report.md`
- `release-decision.md`

### staging-release

Hard require:

- `SESSION-ANCHOR.md`
- `planner-spec.md`

Strongly prefer:

- `builder-report.md`

Warn if missing:

- `verifier-report.md`
- `release-decision.md`

### prod-release

Hard require:

- `SESSION-ANCHOR.md`
- `planner-spec.md`
- `builder-report.md`
- `verifier-report.md`
- `release-decision.md`

### post-release

Prefer:

- `release-decision.md`
- version verification evidence
- deployment state reset evidence

