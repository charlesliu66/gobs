# Release Decision

## Decision

- Result: `GO`
- Commit: `930a441`
- Scope: align Ark personal API queueing to `3` concurrent slots, refresh H5 queue / reminder UX, and surface a recent real-world duration baseline from the latest `10` successful storyboard videos.

## Evidence

- Gate 1: `planner-spec.md` updated for concurrency-3 acceptance criteria.
- Gate 1.5: `challenger-review.md` completed with must-fix items resolved in implementation.
- Gate 2: `builder-report.md` records backend scheduler, snapshot, polling, UI, reminder, and recent-duration baseline changes.
- Gate 3: `verifier-report.md` records local tests, build checks, `eval.sh`, staging smoke, and prod smoke.
- Release flow:
  - `staging` marked ready with commit `930a441`
  - `prod` deployed from the same pushed `main` commit
  - post-deploy smoke passed on both environments

## Follow-up

- Normalize legacy encoding in `ProductionWizard.tsx` so notification-permission timing can move from mount time to first enqueue action.
- Keep an eye on real-user ETA feel after the `3`-lane rollout and tune the average service-time window if queue predictions feel too optimistic or too conservative.
- Revisit whether the recent-success baseline should later power more explicit ETA copy in additional queue surfaces beyond the storyboard platform summary card.
