# Run Template

Create a new folder per feature:

- `docs/workflow/runs/YYYY-MM-DD-<feature-name>/`

Inside it, create:

1. `SESSION-ANCHOR.md`
2. `planner-spec.md`
3. `challenger-review.md`
4. `builder-report.md`
5. `verifier-report.md`
6. `release-decision.md`

Optional:

- `defect-list.md`
- `test-evidence/`

Use these templates first:

- `docs/workflow/runs/SESSION-ANCHOR-template.md`
- `docs/workflow/runs/planner-spec-template.md`

## North Star Rule

For any run related to `Campaign Creative Agent`, copy this short statement into both `SESSION-ANCHOR.md` and `planner-spec.md`:

> `Campaign Creative Agent` 必须从 campaign brief 出发，稳定产出创意素材或变体，并把它们送入分发。

This sentence is not just description. It is the scope guardrail for the run.

If a proposed change does not make the system stronger on `brief -> asset/variant production -> distribution`, it should not be framed as core roadmap progress.
