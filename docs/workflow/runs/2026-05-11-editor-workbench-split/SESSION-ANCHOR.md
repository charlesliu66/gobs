# SESSION-ANCHOR - 2026-05-11-editor-workbench-split

## Run Summary
- Run ID: 2026-05-11-editor-workbench-split
- Goal: Split EditorWorkbench into smaller bounded modules without changing editing behavior.
- Owner: codex
- Branch or commit context: main@8a9de8b
- Last updated: 2026-05-11T15:36:18Z

## Acceptance Criteria Snapshot
- AC-01: EditorWorkbench becomes a thinner container with extracted state and panel modules.
- AC-02: Existing editor timeline, preview, export, and side-panel behavior remain intact.
- AC-03: Targeted tests and local frontend/backend builds validate the refactor boundary.

## Editable Files (Builder Ownership)
- h5-video-tool/src/pages/EditorWorkbench.tsx
- h5-video-tool/src/editor/components
- h5-video-tool/src/editor
- h5-video-tool/tests

## Read-Only References
- docs/TASK-INDEX.md
- docs/plans/2026-05-11-node2-multi-agent-dispatch-plan.md

## Additional Forbidden Paths
- [None beyond AGENTS.md global forbidden files]

## Out of Scope
- ProductionWizard refactor internals
- Production to Editor bridge enhancements before the refactor settles
- Distribution page changes
- Deployment work

## Progress Checklist
- [ ] Planner approved
- [ ] Challenger approved
- [ ] Builder self-test recorded
- [ ] Verifier P0/P1 count is zero
- [ ] Release decision written

## Escalation Rules
- Escalate if a change requires touching any AGENTS.md forbidden file.
- Escalate if a new env var is required and `.env.example` is not yet updated.
- Escalate if acceptance criteria need to expand beyond this run scope.
- Escalate before any prod release decision.
