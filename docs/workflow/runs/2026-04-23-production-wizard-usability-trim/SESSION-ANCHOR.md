# Session Anchor: Production Wizard Usability Trim

> Run ID: `2026-04-23-production-wizard-usability-trim`  
> Date: 2026-04-23  
> Source plan: `docs/plans/2026-04-23-production-wizard-usability-trim.md`

## Goal

把高级制片从默认暴露大量专业工具的工作台，收敛为主路径清楚、状态可信、专业能力可展开的生产向导。

主路径应默认呈现：

1. 输入与故事设定。
2. 角色 / 场景设计。
3. 分镜表。
4. 分镜视频生成。
5. 放映室 / 剪辑入口。

## Non-Goals

- 不新增模型入口。
- 不重做整套 H5 视觉系统。
- 不改底层视频 / 图像生成服务。
- 不扩大任务看板范围。
- 不新增跨项目复用能力。

## Forbidden Files

本 run 不允许修改：

- `h5-video-tool-api/src/services/dreaminaVideo.ts`
- `h5-video-tool-api/src/services/klingVideo.ts`
- `h5-video-tool-api/src/services/veoPython.ts`
- `h5-video-tool-api/src/services/studioPipeline.ts`
- `h5-video-tool-api/src/types/productionTypes.ts`
- `h5-video-tool-api/src/config/productionAssets.ts`
- `.env`

## Primary File Scope

- `h5-video-tool/src/pages/ProductionWizard.tsx`
- `h5-video-tool/src/studio/steps/StepStoryboardWorkspace.tsx`
- `h5-video-tool/src/studio/steps/StepStoryboardGenerateActions.tsx`
- `h5-video-tool/src/studio/steps/StepStoryboardShotStrip.tsx`
- `h5-video-tool/src/studio/steps/StepStoryboardPreviewPanel.tsx`
- `h5-video-tool/src/studio/steps/StepDesignCharactersPanel.tsx`
- `h5-video-tool/src/components/production/CharacterLookTreeCanvas.tsx`
- `h5-video-tool/src/components/production/CharacterPortraitEditorModal.tsx`
- `h5-video-tool/src/studio/shotUserStatus.ts`
- `h5-video-tool/src/i18n/messages.ts`
- `PRODUCT.md`
- `CHANGELOG.md`
- `docs/product/*.md`

## Acceptance Commands

```powershell
cd h5-video-tool-api
npx tsc --noEmit

cd ..\h5-video-tool
npm run build

node --test tests/shotUserStatus.test.ts
```

If the frontend package has no `npm test` script, use `node --test` for the targeted helper test and record that gap in the reports.

## Release Requirement

Release must follow `staging -> verification -> prod`:

1. Commit and push the final code to GitHub.
2. Build local artifacts.
3. Deploy staging and verify `http://43.134.186.196:8080`.
4. Mark release ready.
5. Deploy prod and verify `http://43.134.186.196`.
6. Restore prod deployment state to `idle`.

## Current Notes

- Existing unrelated dirty files are present in `scripts/ops/archive/root-python/**`, `scripts/.env.example`, and `tmp_server_ronin_check/`.
- Only stage files owned by this run.
