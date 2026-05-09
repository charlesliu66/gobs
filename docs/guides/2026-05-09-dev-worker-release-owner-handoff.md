# Dev Worker -> Release Owner Handoff Checklist

> Date: 2026-05-09
> Applies to: GOBS/QAS multi-window development where one window develops and another window deploys.

## Purpose

This checklist keeps development windows fast while making releases serial and auditable. A Dev Worker may implement, test, and commit code. A Release Owner window is the only window that should deploy staging/prod, mark release-ready, or restore deployment state.

## Dev Worker Boundary

Dev Worker windows may:

- Pull or fetch the latest repository state before starting.
- Create a `codex/<run-id>` branch when the work is not already on `main`.
- Update run docs, code, tests, `PRODUCT.md`, and `CHANGELOG.md`.
- Run local tests, builds, and workflow guard checks.
- Create a local commit when the user asks for commit-only handoff.
- Push only when the user explicitly asks this Dev Worker window to push.

Dev Worker windows must not:

- Run `python scripts/deploy_all.py --target staging`.
- Run `python scripts/deploy_all.py --target prod`.
- Run `python scripts/deploy_api.py` or `python scripts/deploy_frontend.py` against staging/prod.
- Run `python scripts/mark_release_ready.py`.
- Run `python scripts/set_deployment_state.py` for staging/prod.
- Use `--emergency-bypass` unless the current user instruction explicitly approves an emergency release action.

## Commit-Only Handoff Packet

Before stopping at commit, the Dev Worker should leave the Release Owner with:

- Local commit SHA and branch name.
- Summary of changed areas and risk level.
- Test/build commands run and their result.
- Any skipped validation with the reason.
- Clear note that staging/prod deploy was not run from the Dev Worker window.

## Release Owner Pickup

The Release Owner window should start with:

```bash
git fetch origin main
git status --short
git branch --show-current
git rev-parse HEAD
git rev-parse origin/main
```

Then decide one of the following:

- If the Dev Worker commit is local-only, pull/cherry-pick/merge it intentionally before release.
- If the Dev Worker pushed the commit, verify `HEAD == origin/main` after updating the release branch.
- If another window changed deployment scripts, pause and inspect the diff before deploying.

## Release Owner Deployment Path

For normal releases:

```bash
cd h5-video-tool-api && npm run build
cd ../h5-video-tool && npm run build
cd ..
python scripts/deploy_all.py --target staging
python scripts/mark_release_ready.py --updated-by release-owner
python scripts/deploy_all.py --target prod --updated-by release-owner
python scripts/set_deployment_state.py --target prod --phase idle --updated-by release-owner
```

For commit-only Dev Worker handoffs, do not assume deployment has happened. The Release Owner owns staging smoke, prod smoke, version convergence, and deployment-state cleanup.

## Upload Script Notes

The deploy helpers use two upload paths:

- Small archives stream through SSH stdin into a remote tarball.
- Larger archives split into bounded base64 parts, optionally using a fresh SSH connection per part, then merge server-side before extraction.

If a future real deploy still stalls during artifact upload, the Release Owner should capture the exact archive size, target, and last visible chunk/progress line before changing scripts.
