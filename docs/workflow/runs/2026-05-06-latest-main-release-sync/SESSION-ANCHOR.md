# SESSION-ANCHOR - 2026-05-06-latest-main-release-sync

## Run Summary
- Run ID: 2026-05-06-latest-main-release-sync
- Goal: Promote current origin/main to staging and prod so local, GitHub and cloud run the same latest SHA.
- Owner: wei.liu
- Branch or commit context: main@8613bc4
- Last updated: 2026-05-06T03:02:25Z

## Acceptance Criteria Snapshot
- AC-01: staging and prod both serve the same SHA as origin/main

## Editable Files (Builder Ownership)
- docs/workflow/runs/2026-05-06-latest-main-release-sync/

## Read-Only References
- docs/plans/2026-05-01-campaign-creative-agent-implementation-plan.md
- docs/workflow/runs/2026-05-06-campaign-creative-agent-phase0-phase1/SESSION-ANCHOR.md
- .agents/skills/gobs-release-guard/SKILL.md
- .agents/skills/gobs-h5-smoke-test/SKILL.md

## Additional Forbidden Paths
- [None beyond AGENTS.md global forbidden files]

## Out of Scope
- No feature implementation.
- No runtime code edits unless release blockers are discovered.
- No deployment bypass; release must follow staging -> smoke -> prod.

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
