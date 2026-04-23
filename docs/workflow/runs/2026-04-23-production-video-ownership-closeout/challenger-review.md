# Challenger Review: Production Video Ownership Closeout

## Must-Fix Checks

- Ownership checks must be strict for missing `username`; anonymous legacy jobs cannot be assumed safe.
- Manual polling must verify owner before calling the backend poller.
- Video streaming must reject ownerless or foreign jobs before checking the local file path.
- Quickfilm chained queue selection must include `username`, not just `projectId`.
- Export page must not invent status independently; it should reuse the shared shot status helper.

## Decision

Proceed. All must-fix checks are reflected in the implementation plan.
