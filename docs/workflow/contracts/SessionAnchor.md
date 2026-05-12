# SessionAnchor Contract

Use this exact structure for `SESSION-ANCHOR.md`.

```markdown
# SESSION-ANCHOR - <run-id>

## Run Summary
- Run ID:
- Goal:
- Owner:
- Branch or commit context:
- Last updated:

## Acceptance Criteria Snapshot
- AC-01:
- AC-02:

## Editable Files (Builder Ownership)
- path/to/file-or-directory

## Read-Only References
- path/to/reference

## Additional Forbidden Paths
- path/to/extra-forbidden-scope

## Out of Scope
- explicit non-goal

## Progress Checklist
- [ ] Planner approved
- [ ] Challenger approved
- [ ] Builder self-test recorded
- [ ] Verifier P0/P1 count is zero
- [ ] Release decision written

## Escalation Rules
- Escalate if:
```

Notes:
- `Editable Files (Builder Ownership)` is the primary scope input for workflow guard checks.
- `Additional Forbidden Paths` are merged with the global forbidden list from `AGENTS.md`.
- Keep `Read-Only References` focused so future agents do not reload the whole repo.

Optional extension for Codex main-thread orchestration:

```markdown
## Orchestration Snapshot
- Main thread owner:
- Agent A assignment:
- Agent B assignment:
- Agent C assignment:
- Heartbeat cadence:
- Last heartbeat review:
- Blocked lanes:
```

Use this block only when one main thread is coordinating multiple sub-agents or windows for the same run family. Keep it compact and treat it as a live status snapshot, not a full narrative log.
