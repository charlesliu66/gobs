# SESSION-ANCHOR - 2026-05-07-docs-mainline-sync

## Run Summary
- Run ID: 2026-05-07-docs-mainline-sync
- Goal: Sync local-only campaign planning docs into mainline and release the aligned repo state
- North Star: Campaign Creative Agent must start from campaign brief, produce creative assets or variants, and move them into distribution.
- Owner: codex
- Branch or commit context: main@fafc43e
- Last updated: 2026-05-07T02:27:00Z

## Product Shape Guardrail

Use this short version for the campaign-planning docs touched in this run:

> `Campaign Creative Agent` must start from campaign brief, produce creative assets or variants, and move them into distribution.

The run is only in scope if it makes the shipped planning baseline, templates, or release history more consistent with that chain.

## Acceptance Criteria Snapshot
- AC-01: Local-only campaign planning docs and workflow templates are cleaned, indexed, and free of stale machine-specific links.
- AC-02: `PRODUCT.md` and `CHANGELOG.md` record the docs sync so the mainline repo state can be committed, pushed, and released without documentation drift.
- AC-03: The aligned mainline commit is validated through local build checks and the standard `staging -> verify -> prod` release flow.

## Editable Files (Builder Ownership)
- CHANGELOG.md
- PRODUCT.md
- docs/plans/README.md
- docs/plans/2026-05-06-campaign-mission-control-phase0-implementation-plan.md
- docs/plans/2026-05-06-gobs-fastpublish-knowledge-integration-design.md
- docs/plans/2026-05-06-gobs-fastpublish-knowledge-integration-implementation-plan.md
- docs/workflow/runs/RUN_TEMPLATE.md
- docs/workflow/runs/SESSION-ANCHOR-template.md
- docs/workflow/runs/planner-spec-template.md
- docs/workflow/runs/2026-05-07-docs-mainline-sync/

## Read-Only References
- docs/TASK-INDEX.md
- docs/DOCS-INDEX.md
- .claude/memory/feedback.md
- docs/guides/2026-04-23-single-owner-staging-prod-release-runbook.md

## Additional Forbidden Paths
- None beyond AGENTS.md global forbidden files

## Out of Scope
- Runtime feature changes in `h5-video-tool/` or `h5-video-tool-api/`
- New environment variables or deployment-script behavior changes
- Rewriting previously shipped run artifacts from unrelated runs

## Progress Checklist
- [x] Planner approved
- [x] Challenger approved
- [ ] Builder self-test recorded
- [ ] Verifier P0/P1 count is zero
- [ ] Release decision written

## Escalation Rules
- Escalate if a change requires touching any AGENTS.md forbidden file.
- Escalate if a new env var is required and `.env.example` is not yet updated.
- Escalate if acceptance criteria need to expand beyond docs sync plus release alignment.
- Escalate before any prod release decision.
