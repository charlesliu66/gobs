# Planner Spec: Production Video Ownership Closeout

## Background

The advanced production flow already writes generated storyboard videos back to project shots, but the final polish pass needs to guarantee that no legacy ownerless job or cross-project route can leak into another user's history. The same pass should reduce user anxiety by making queue position and returned-result behavior visible beyond the storyboard editor itself.

## Acceptance Criteria

- Batch job creation, cancellation, manual polling, and video file access require a logged-in owner and reject jobs that do not belong to that owner.
- Quickfilm's chained auto-submit only advances jobs in the same account and project queue.
- The export/review step displays completed, queued, generating, failed, cancelled, and not-started shot counts using the same status model as the storyboard page.
- Queue copy explicitly tells the user their platform queue rank when available and that completion writes back to the same shot history.
- Existing videos are not deleted or cleared; stricter ownership only blocks ownerless/cross-owner access.
- Type checks, focused tests, frontend build, and staging/prod deployment pass.

## Risks

- Legacy ownerless jobs may become inaccessible through direct video URLs. This is intentional for safety because they cannot be proven to belong to the current account.
- Export page has less interaction context than storyboard page. Mitigation: pass the active job/status/queue maps from `ProductionWizard` so both steps share the same live state.
- Queue position is global and includes active provider jobs ahead of waiting jobs. Mitigation: copy labels it as the shared platform queue.

## Test Matrix

- Backend ownership: TypeScript check plus focused quickfilm queue ownership helper test via `node --import tsx --test`.
- Frontend status: focused status helper/export summary tests plus full production build.
- Manual smoke: verify storyboard selected shot, export summary, and queue copy on staging/prod after deploy.

## Challenger Review

No must-fix blockers before build. The implementation must avoid forbidden service files and must not migrate/delete existing generated media.
