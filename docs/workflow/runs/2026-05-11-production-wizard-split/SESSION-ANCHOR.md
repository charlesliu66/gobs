# SESSION-ANCHOR - 2026-05-11-production-wizard-split

## Run Summary
- Run ID: 2026-05-11-production-wizard-split
- Goal: Split ProductionWizard into smaller bounded modules without changing production behavior.
- Owner: codex
- Branch or commit context: main@8a9de8b
- Last updated: 2026-05-11T15:36:18Z

## Acceptance Criteria Snapshot
- AC-01: ProductionWizard becomes a thinner entry surface with extracted step and state modules.
- AC-02: Existing production flow behavior, data contracts, and exported outputs remain unchanged.
- AC-03: Targeted tests and local frontend/backend builds validate the refactor boundary.

## Editable Files (Builder Ownership)
- h5-video-tool/src/pages/ProductionWizard.tsx
- h5-video-tool/src/studio/steps
- h5-video-tool/tests

## Read-Only References
- docs/TASK-INDEX.md
- docs/plans/2026-05-11-node2-multi-agent-dispatch-plan.md

## Additional Forbidden Paths
- [None beyond AGENTS.md global forbidden files]

## Out of Scope
- Editor workbench refactor
- Production to Editor bridge enhancements
- Provider service logic changes
- Deployment work

## Progress Checklist
- [x] Planner approved
- [x] Challenger approved
- [x] Builder self-test recorded
- [ ] Verifier P0/P1 count is zero
- [x] Release decision written

## Escalation Rules
- Escalate if a change requires touching any AGENTS.md forbidden file.
- Escalate if a new env var is required and `.env.example` is not yet updated.
- Escalate if acceptance criteria need to expand beyond this run scope.
- Escalate before any prod release decision.
