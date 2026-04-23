# Release Decision: Production Wizard Usability Trim

## Decision

LOCAL GO / RELEASE PENDING.

Local implementation and automated verification have passed. Staging and prod release are pending final commit push and deploy execution.

## Current Commit

- Branch: `codex/production-wizard-usability-trim`
- Local implementation commit: `5242775 feat: simplify production wizard usability`

## Required Before Prod

1. Commit implementation and docs.
2. Push the release commit to GitHub.
3. Ensure release source is on `origin/main` before prod deploy.
4. Deploy staging.
5. Complete staging manual QA.
6. Run `python scripts/mark_release_ready.py --updated-by codex`.
7. Deploy prod.
8. Verify prod and restore deployment state to `idle`.

## Rollback

If staging fails:

- Restore the previous `StepStoryboardGenerateActions.tsx` entry behavior if video generation is affected.
- Restore the previous `StepStoryboardShotStrip.tsx` if shot selection or filters misbehave.
- Keep `shotUserStatus.ts` and docs unless they directly cause a build failure.

If prod fails:

- Use the standard server backup / previous GitHub `main` SHA rollback flow.
- Record final rollback SHA and reason in this file.
