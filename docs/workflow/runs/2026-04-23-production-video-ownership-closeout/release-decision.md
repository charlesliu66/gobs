# Release Decision: Production Video Ownership Closeout

## Decision

GO for staging and prod after commit is pushed to `origin/main`.

## Required Release Checks

- Local focused tests and builds passed.
- Deploy staging and confirm version endpoint reports this commit.
- Mark release ready.
- Deploy prod and confirm version endpoint reports this commit.
- Restore deployment state to idle.
