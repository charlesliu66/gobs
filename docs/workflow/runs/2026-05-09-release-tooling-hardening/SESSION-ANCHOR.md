# SESSION-ANCHOR - 2026-05-09-release-tooling-hardening

## Run Summary
- Run ID: 2026-05-09-release-tooling-hardening
- Goal: Harden release tooling so Python 3.10 deploy machines can mark/promote releases and Paramiko deploy scripts finish deterministically after successful uploads.
- Owner: codex
- Branch or commit context: main@2fedae1
- Last updated: 2026-05-09T06:58:00Z

## Acceptance Criteria Snapshot
- AC-01: Python 3.10 can build release-ready and deployment-state timestamps without temporary datetime.UTC shims.
- AC-02: deploy_api.py and deploy_frontend.py close SSH resources deterministically and do not hang after successful uploads or PM2 restarts.
- AC-03: Existing deploy guard, release guard, and deployment-state tests pass with added regression coverage for the compatibility and resource-close behavior.
- AC-04: Run docs, PRODUCT.md, CHANGELOG.md, and TASK-INDEX.md record the release tooling hardening.

## Editable Files (Builder Ownership)
- scripts/deploy_api.py
- scripts/deploy_frontend.py
- scripts/release_guard.py
- scripts/set_deployment_state.py
- scripts/mark_release_ready.py
- scripts/init_dual_env_server.py
- scripts/tests/
- docs/workflow/runs/2026-05-09-release-tooling-hardening/
- docs/TASK-INDEX.md
- PRODUCT.md
- CHANGELOG.md

## Read-Only References
- docs/guides/2026-04-23-single-owner-staging-prod-release-runbook.md
- docs/workflow/runs/2026-05-09-campaign-production-loop-closeout/

## Additional Forbidden Paths
- [None beyond AGENTS.md global forbidden files]

## Out of Scope
- No product UI or Campaign/Studio/Distribution behavior changes.
- No server env var changes or provider integration changes.
- No emergency-bypass or prod release without Verifier GO.

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
