# Release Decision - unified project lifecycle

> Run: `2026-04-23-unified-project-lifecycle`
> Gate 5 artifact

---

## Decision

GO

## Released Scope

- editor now stays in draft mode until meaningful content appears and a valid project name is provided
- advanced production now keeps local draft work first and blocks first cloud persistence until naming is completed
- both project lists now expose search, rename, delete, and unnamed-governance entry points
- backend save routes now reject blank-name first formal saves while preserving compatibility for existing persisted projects

## Known Gaps

- browser manual smoke is still needed for the full “draft -> naming modal -> formal project” interaction on both surfaces
- historical unnamed project governance remains manual-entry driven and does not yet run as background cleanup

## Integration Notes

- `PRODUCT.md` updated to `v0.108`
- release requires local / GitHub / cloud sync
- backend build artifacts must be rebuilt after the final commit so deployed `build-info.json` matches the release commit
