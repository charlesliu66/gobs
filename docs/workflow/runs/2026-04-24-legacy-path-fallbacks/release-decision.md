# Release Decision: Legacy Path Fallbacks

## Decision

GO

## Basis

- Build and targeted tests passed locally.
- Scope is limited to backward-compatible path fallback and migration logic.
- Changes reduce breakage risk after the dual-env shared-data split.
- Product and changelog entries were updated for traceability.

## Known Warnings

- Staging and prod must be redeployed from the final post-commit SHA to restore three-end consistency.
- `PRODUCT.md` and `CHANGELOG.md` still use a legacy file encoding; only minimal safe edits were applied.
