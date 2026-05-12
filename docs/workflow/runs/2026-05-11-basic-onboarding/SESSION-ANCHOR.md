# SESSION-ANCHOR - 2026-05-11-basic-onboarding

## Run Summary
- Run ID: 2026-05-11-basic-onboarding
- Goal: Add lightweight onboarding cues that help first-time operators choose the right GOBS entry points.
- Owner: codex
- Branch or commit context: main@8a9de8b
- Last updated: 2026-05-11T15:36:18Z

## Acceptance Criteria Snapshot
- AC-01: Home can show a lightweight first-time onboarding card without adding a full tutorial system.
- AC-02: Onboarding cues help operators choose Campaign, Production, Editor, or Distribution entry paths with low friction.
- AC-03: Targeted tests and local frontend/backend builds validate the onboarding behavior.

## Editable Files (Builder Ownership)
- h5-video-tool/src/pages/Home.tsx
- h5-video-tool/src/components
- h5-video-tool/src/i18n
- h5-video-tool/tests

## Read-Only References
- docs/TASK-INDEX.md
- docs/plans/2026-05-11-node2-multi-agent-dispatch-plan.md

## Additional Forbidden Paths
- [None beyond AGENTS.md global forbidden files]

## Out of Scope
- Large navigation IA changes already handled in Node 1
- Production or Distribution behavioral refactors
- Persistent analytics or server-side onboarding state
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
