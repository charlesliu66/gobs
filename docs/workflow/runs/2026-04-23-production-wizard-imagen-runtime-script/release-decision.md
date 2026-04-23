# Release Decision: Production Wizard Imagen Runtime Script

## Decision

GO for staging after commit and push.

## Basis

- Root cause is deployment packaging, not frontend state or user project data.
- The fix is limited to deployment script behavior and a regression test.
- Local verification passed:
  - `python -m unittest scripts.tests.test_deploy_api`
  - `h5-video-tool-api` TypeScript check
  - `h5-video-tool-api` build
  - `h5-video-tool` build

## Production Promotion

Prod promotion must still follow staging verification and release-ready marking.
