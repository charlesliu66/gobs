# SESSION-ANCHOR - <run-id>

> Replace `<run-id>` with the folder name, for example `2026-05-02-multi-agent-dev-loop`.
> This file is the first run-specific document every agent should read.

## Run Summary
- Run ID: <run-id>
- Goal: [Copy the one-sentence goal from planner-spec.md]
- North Star: [Campaign Creative Agent must start from campaign brief, produce creative assets/variants, and move them into distribution.]
- Owner: [owner name]
- Branch or commit context: [branch@commit]
- Last updated: [ISO-8601 timestamp]

## Product Shape Guardrail

Use this short version in every campaign-creative-related run:

> `Campaign Creative Agent` must start from campaign brief, produce creative assets or variants, and move them into distribution.

If a change improves a local tool or editing experience but does not make the system more capable on this chain, treat it as secondary work rather than core roadmap progress.

## Acceptance Criteria Snapshot
- AC-01: [summary]
- AC-02: [summary]

## Editable Files (Builder Ownership)
- [Exact file or directory path]

## Read-Only References
- docs/TASK-INDEX.md
- docs/workflow/runs/<run-id>/planner-spec.md

## Additional Forbidden Paths
- [Optional extra forbidden path for this run]

## Out of Scope
- [Explicit non-goal]

## Progress Checklist
- [ ] Planner approved
- [ ] Challenger approved
- [ ] Builder self-test recorded
- [ ] Verifier P0/P1 count is zero
- [ ] Release decision written

## Escalation Rules
- Escalate if a forbidden file must change.
- Escalate if a new env var is required.
- Escalate if acceptance criteria need to expand.
- Escalate before prod release approval.
