# Run Template

Create one folder per feature:

- `docs/workflow/runs/YYYY-MM-DD-<feature-name>/`

Fast path:

```bash
python scripts/init_workflow_run.py \
  --slug <feature-name> \
  --goal "<one sentence goal>"
```

Required files inside every run:

1. `SESSION-ANCHOR.md`
2. `planner-spec.md`
3. `challenger-review.md`
4. `builder-report.md`
5. `verifier-report.md`
6. `release-decision.md`

Optional:

- `eval-result.json`
- `defect-list.md`
- `test-evidence/`

Rules:

- `SESSION-ANCHOR.md` is mandatory and should be finalized before Builder starts.
- `planner-spec.md` must exist before any implementation work.
- `challenger-review.md` must clear blockers before Builder starts.
- `builder-report.md`, `verifier-report.md`, and `release-decision.md` are living artifacts and should be updated in-place during the run.
