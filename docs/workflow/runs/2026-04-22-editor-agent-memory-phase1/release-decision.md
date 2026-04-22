# Release Decision - editor agent memory phase1

> Run: `2026-04-22-editor-agent-memory-phase1`
> Gate 5 artifact

---

## Decision

GO

## Released Scope

- project memory persists with editor projects
- user communication profiles persist across projects
- bounded memory compression now turns saved history into apply-time prompt context
- users can now see and manually correct remembered project/user memory from the agent panel
- low-confidence communication memories are treated as weak hints
- the latest user instruction explicitly outranks older remembered preferences

## Known Gaps

- browser manual smoke is still needed for the full reopen -> apply loop
- users still cannot batch-edit or bulk-approve multiple memory items in one step

## Integration Notes

- `PRODUCT.md` updated
- build artifacts must be rebuilt after commit so `build-info.json` matches the release commit
- deploy requires local / GitHub / cloud sync
