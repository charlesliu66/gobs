# Session Anchor: GOBS Private Skills

> Run ID: `2026-04-24-gobs-private-skills`
> Date: 2026-04-24

## Goal

Land the first repo-private Codex skills for GOBS/QAS release operations:

- `gobs-release-guard`
- `gobs-h5-smoke-test`

and carry them through commit, push, staging verification, prod release, and release wrap-up.

## Non-Goals

- Do not change Dreamina, Kling, VEO, studio pipeline, production types, or production assets core service files.
- Do not change runtime provider behavior.
- Do not add new user-facing H5 features in this run.

## Forbidden Files

- `h5-video-tool-api/src/services/dreaminaVideo.ts`
- `h5-video-tool-api/src/services/klingVideo.ts`
- `h5-video-tool-api/src/services/veoPython.ts`
- `h5-video-tool-api/src/services/studioPipeline.ts`
- `h5-video-tool-api/src/types/productionTypes.ts`
- `h5-video-tool-api/src/config/productionAssets.ts`
- `.env`

## File Scope

- `.agents/skills/gobs-release-guard/*`
- `.agents/skills/gobs-h5-smoke-test/*`
- `docs/plans/2026-04-24-gobs-private-skills-design.md`
- `docs/plans/2026-04-24-gobs-private-skills-implementation-plan.md`
- `PRODUCT.md`
- `CHANGELOG.md`
- `docs/workflow/runs/2026-04-24-gobs-private-skills/*`

## Acceptance Commands

```powershell
cd h5-video-tool-api
npx tsc --noEmit
npm run build

cd ..\h5-video-tool
npm run build

cd ..
powershell -ExecutionPolicy Bypass -File .agents/skills/gobs-release-guard/scripts/release_guard.ps1 -Mode preflight -RunId 2026-04-24-gobs-private-skills -Target staging
powershell -ExecutionPolicy Bypass -File .agents/skills/gobs-h5-smoke-test/scripts/smoke_http.ps1 -Env staging -Depth quick
```

## Release Requirement

Commit and push to `origin/main`, deploy `staging`, verify with smoke checks, mark the release ready, deploy `prod`, verify the released SHA, and restore prod deployment state to `idle`.
