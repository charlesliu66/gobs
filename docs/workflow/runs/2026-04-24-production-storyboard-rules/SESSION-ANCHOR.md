# Session Anchor: Production Storyboard Rules

> Run ID: `2026-04-24-production-storyboard-rules`
> Date: 2026-04-24

## Goal

Add a maintainable production-storyboard rules layer for Advanced Production so storyboard generation and auto-refine both steer shots toward more usable narrative pacing and a practical `4-15s` duration band.

## Non-Goals

- Do not change Dreamina, Kling, VEO, studio pipeline, production types, or production assets core service files.
- Do not introduce execution-layer merge/split of storyboard shots.
- Do not add new frontend UI or task models in this run.

## Forbidden Files

- `h5-video-tool-api/src/services/dreaminaVideo.ts`
- `h5-video-tool-api/src/services/klingVideo.ts`
- `h5-video-tool-api/src/services/veoPython.ts`
- `h5-video-tool-api/src/services/studioPipeline.ts`
- `h5-video-tool-api/src/types/productionTypes.ts`
- `h5-video-tool-api/src/config/productionAssets.ts`
- `.env`

## File Scope

- `h5-video-tool-api/src/services/productionStoryboardRules.ts`
- `h5-video-tool-api/src/routes/studio.ts`
- `h5-video-tool-api/src/routes/videoKling.ts`
- `h5-video-tool-api/src/services/googleDriveService.ts`
- `docs/plans/2026-04-24-production-storyboard-rules-design.md`
- `docs/plans/2026-04-24-production-storyboard-rules-implementation-plan.md`
- `PRODUCT.md`
- `CHANGELOG.md`
- `docs/workflow/runs/2026-04-24-production-storyboard-rules/*`

## Acceptance Commands

```powershell
cd h5-video-tool-api
npx tsc --noEmit
npm run build
node --import tsx -e "import { buildStoryboardGenerationRulesContext, buildStoryboardRefineRulesContext } from './src/services/productionStoryboardRules.ts'; console.log(buildStoryboardGenerationRulesContext()); console.log(buildStoryboardRefineRulesContext());"

cd ..\h5-video-tool
npm run build
```

## Release Requirement

Ship together with the same release that lands repo-private release/smoke skills: push to `origin/main`, verify `staging`, mark release ready, release `prod`, verify the released SHA, then restore deployment state to `idle`.
