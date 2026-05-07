# SESSION-ANCHOR - 2026-05-07-docs-hygiene-mainline-cleanup

## Run Summary
- Run ID: 2026-05-07-docs-hygiene-mainline-cleanup
- Goal: Clean stale task index, duplicate release notes, and unfinished non-mainline workflow run.
- North Star: Campaign Creative Agent must start from campaign brief, produce creative assets or variants, and move them into distribution.
- Owner: codex
- Branch or commit context: main@1ee752c
- Last updated: 2026-05-07T07:21:15Z

## Product Shape Guardrail

> `Campaign Creative Agent` must start from campaign brief, produce creative assets or variants, and move them into distribution.

This run is documentation hygiene only. It should make the current mainline easier to follow, not add runtime behavior or restart an Advanced Studio side quest.

## Acceptance Criteria Snapshot
- AC-01: `docs/TASK-INDEX.md` reflects the current Gold and Glory Campaign Creative Agent mainline instead of the stale April stability backlog.
- AC-02: `PRODUCT.md` and `CHANGELOG.md` no longer contain duplicated trailing release-note fragments, while preserving canonical recent history.
- AC-03: The unfinished template-only `production-english-reference-ux` run is removed from active workflow runs because it is not current product-mainline work.

## Editable Files (Builder Ownership)
- docs/TASK-INDEX.md
- PRODUCT.md
- CHANGELOG.md
- docs/workflow/runs/2026-05-07-production-english-reference-ux/
- docs/workflow/runs/2026-05-07-docs-hygiene-mainline-cleanup/

## Read-Only References
- docs/plans/2026-05-06-campaign-creative-agent-next-phase-design.md
- docs/plans/2026-05-07-gold-and-glory-canonical-brain-sync-design.md
- docs/workflow/runs/2026-05-07-gold-and-glory-canonical-brain-sync/

## Additional Forbidden Paths
- None beyond AGENTS.md global forbidden files.

## Out of Scope
- Runtime code changes.
- Advanced Studio English UX implementation.
- Changing deployment scripts or environment variables.
- Touching any AGENTS.md forbidden backend service file.

## Progress Checklist
- [x] Planner approved
- [x] Challenger approved
- [x] Builder self-test recorded
- [x] Verifier P0/P1 count is zero
- [x] Release decision written

## Escalation Rules
- Escalate if cleanup uncovers a runtime regression.
- Escalate if a change requires touching any AGENTS.md forbidden file.
- Escalate before any prod release decision.
