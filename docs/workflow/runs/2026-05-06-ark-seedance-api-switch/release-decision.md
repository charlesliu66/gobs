# Release Decision

## Decision

- Result: `GO`
- Commit: `4eaa722`
- Scope: align Ark personal API queueing to `3` concurrent slots and refresh H5 queue / reminder UX so users can see whether work is still in the platform queue, already submitted to Ark, queued in Ark, rendering, or completed.

## Evidence

- Gate 1: `planner-spec.md` updated for concurrency-3 acceptance criteria.
- Gate 1.5: `challenger-review.md` completed with must-fix items resolved in implementation.
- Gate 2: `builder-report.md` records backend scheduler, snapshot, polling, UI, and reminder changes.
- Gate 3: `verifier-report.md` records local tests, build checks, `eval.sh`, staging smoke, and prod smoke.
- Release flow:
  - `staging` marked ready with commit `4eaa722`
  - `prod` deployed from the same pushed `main` commit
  - post-deploy smoke passed on both environments

## Follow-up

- Normalize legacy encoding in `ProductionWizard.tsx` so notification-permission timing can move from mount time to first enqueue action.
- Keep an eye on real-user ETA feel after the `3`-lane rollout and tune the average service-time window if queue predictions feel too optimistic or too conservative.
