# SESSION-ANCHOR - 2026-05-09-release-and-workflow-governance

## Run Summary
- Run ID: 2026-05-09-release-and-workflow-governance
- Goal: Stabilize dev-worker/release-owner collaboration and harden release upload scripts enough for a development-only handoff.
- Owner: codex
- Branch or commit context: codex/2026-05-09-release-and-workflow-governance@9fcf80d
- Last updated: 2026-05-09T12:26:14Z

## Acceptance Criteria Snapshot
- AC-01: Dev Worker and Release Owner responsibilities are explicit enough that this window can stop at a local commit while a separate deployment window can safely continue.
- AC-02: SSH artifact upload has a documented, test-covered fallback for larger archives that avoids relying on one long-lived stdin stream.
- AC-03: Release handoff evidence is recorded without running staging or prod deployment from this development window.
- AC-04: Product/task documentation reflects this governance run and the next operator action.

## Editable Files (Builder Ownership)
- docs/workflow/runs/2026-05-09-release-and-workflow-governance/
- docs/plans/
- docs/guides/
- docs/TASK-INDEX.md
- PRODUCT.md
- CHANGELOG.md
- scripts/deploy_api.py
- scripts/deploy_frontend.py
- scripts/tests/test_deploy_api.py

## Read-Only References
- docs/TASK-INDEX.md
- docs/plans/2026-05-09-next-optimization-execution-checklist.md
- AGENTS.md
- .claude/memory/feedback.md

## Additional Forbidden Paths
- No deployment commands from this Dev Worker window: `scripts/deploy_all.py`, `scripts/deploy_api.py`, `scripts/deploy_frontend.py`, `scripts/mark_release_ready.py`, or `scripts/set_deployment_state.py` must not be executed against staging/prod.
- No changes to AGENTS.md global forbidden provider/service files.

## Out of Scope
- Business feature work in Campaign, Studio, Distribution, Editor, or Production.
- Server release, staging verification, prod verification, rollback, or release-ready promotion.
- Secret/env value changes.
- Large codebase cleanup such as `sj-ui` deletion or giant component refactors.

## Progress Checklist
- [x] Planner approved
- [x] Challenger approved
- [x] Builder self-test recorded
- [x] Verifier P0/P1 count is zero
- [x] Release decision written

## Escalation Rules
- Escalate if a change requires touching any AGENTS.md forbidden file.
- Escalate if a new env var is required and `.env.example` is not yet updated.
- Escalate if acceptance criteria need to expand beyond this run scope.
- Escalate before any prod release decision.
