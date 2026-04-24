# Release Decision: GOBS Private Skills

## Decision

Pending scope clarification before GO/NO-GO.

## Required Evidence

- Commit pushed to `origin/main`
- Staging deploy completed
- Staging verification passed
- Release marked ready
- Prod deploy completed
- Prod verification passed
- Prod deployment state restored to `idle`

## Current Blocker

Release guard is currently `NO-GO` because the worktree contains additional uncommitted storyboard-rule changes outside the private-skill run scope. We need an explicit decision to either include that change set in this release or keep it out of this release.
