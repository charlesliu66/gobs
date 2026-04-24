# Release Modes

This skill supports four release modes.

## preflight

Use when the user wants to know:

- what is currently risky
- whether the repo is in release shape
- whether there are missing run artifacts
- whether build checks pass

This mode should inspect but not imply that a release is already approved.

## staging-release

Use when the user wants to prepare or approve a staging deploy.

Expected checks:

- current commit is appropriate for release
- release-scope dirty files are handled
- required run docs exist
- build and typecheck pass
- staging target is identified

This mode can conclude that staging is safe to deploy, but it should not silently claim prod is ready.

## prod-release

Use when the user wants to prepare or approve a prod deploy.

Expected checks:

- local release commit is on `origin/main`
- run evidence is stronger than staging
- staging live version matches the release candidate
- verified staging release marker matches the release candidate
- dangerous bypass paths are not used silently

This mode should be stricter than staging.

## post-release

Use when the user wants to close the loop after a release.

Expected checks:

- deployed version matches expectation
- prod verification happened
- deployment state should be restored to `idle`
- release notes / run artifacts are ready to close

