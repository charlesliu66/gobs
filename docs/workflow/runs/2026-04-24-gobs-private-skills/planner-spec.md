# Planner Spec: GOBS Private Skills

## Background

The repo now has a stable staging-first release workflow, but the operator steps still depend too much on memory. We want two repo-private skills that convert that workflow into repeatable commands:

- a release guard that checks whether a release is allowed
- an H5 smoke skill that verifies local/staging/prod reachability and version alignment

The user asked to land both skills in the repository, then complete a clean release flow through `main`, `staging`, and `prod`.

## Acceptance Criteria

- A repo-private `gobs-release-guard` skill exists with deterministic PowerShell checks and clear `GO / NO-GO / GO WITH WARNINGS` output.
- A repo-private `gobs-h5-smoke-test` skill exists with deterministic quick/full HTTP checks for `local`, `staging`, and `prod`.
- Both skills include repo-local manifests and supporting references/docs.
- Run artifacts exist for this run and record planner, challenger, builder, verifier, and release decision outputs.
- `PRODUCT.md` and `CHANGELOG.md` record the new internal tooling release.
- Backend typecheck/build, frontend build, staging verification, prod verification, and release wrap-up all pass.

## Risks

- The workspace may contain unrelated untracked planning docs. Mitigation: stage only files that belong to this run and surface any leftover warnings explicitly.
- Internal tooling changes still produce a new deployed SHA. Mitigation: run the full staging-first deployment flow even though H5 behavior is unchanged.
- Smoke checks are HTTP-level only. Mitigation: mark `full` smoke as `PASS WITH WARNINGS` unless manual follow-up is completed.

## Test Matrix

- Skill dry-run validation: release guard `preflight` and post-push/prod-release checks.
- Skill smoke validation: staging `quick`, staging `full`, prod `quick`, prod `full`.
- Standard repo build validation: backend `npx tsc --noEmit`, backend `npm run build`, frontend `npm run build`.
- Release validation: `deploy_all.py --target staging`, `mark_release_ready.py`, `deploy_all.py --target prod`, `set_deployment_state.py --phase idle`.

## Challenger Review

No must-fix blocker before build. This run must keep scope limited to skill folders, run docs, and release documentation, and it must not touch forbidden service files.
