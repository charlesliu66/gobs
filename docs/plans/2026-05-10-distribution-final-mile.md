# Distribution Final Mile

> Run: `2026-05-11-distribution-final-mile`
> Source checklist item: Run 7 - Distribution Final Mile
> Status: in progress

## Goal

Make the final publishing workflow easier to recover, inspect, and complete after Campaign Package or Studio material is ready.

## Scope

This run stays on the Distribution UI layer and deterministic helper functions:

- restore the active publish context after refresh;
- keep recent Package/account/copy/publish-option context easy to reuse;
- make account groups inspectable and editable;
- keep the latest publish batch visible after submit;
- show failure reason plus a next step.

## Product Rules

- Restoring a context never auto-publishes.
- Account restore only selects accounts that the current user can still access.
- Failure guidance is operational guidance, not a guarantee that GeeLark provider state is fixed.
- Backend GeeLark publish behavior and provider routes stay unchanged.

## Acceptance

- Refreshing `/distribute` restores the latest active Package, selected account ids, copy drafts, and publish options when they are still valid.
- Operators can preview account-group members and update a custom group from the current selection.
- Latest publish batch keeps a current-batch summary with review/history actions.
- Publish failures show the raw reason and a clear next action.
