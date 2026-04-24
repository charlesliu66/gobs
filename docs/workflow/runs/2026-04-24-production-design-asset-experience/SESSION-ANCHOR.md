# Session Anchor: Production Design Asset Experience

> Run ID: `2026-04-24-production-design-asset-experience`
> Date: 2026-04-24
> Design: `docs/plans/2026-04-24-production-design-asset-experience-design.md`
> Plan: `docs/plans/2026-04-24-production-design-asset-experience-plan.md`

## Goal

Improve Production Wizard step 2 so asset readiness is obvious, missing character generation is one-click, wardrobe states are inspectable, and storyboard state references are explicit.

## Acceptance Criteria IDs

- AC-1: 设计台顶部能展示角色/场景/道具就绪度，并在存在缺图时突出批量补全入口。
- AC-2: 角色缺图卡支持点击直接生图，角色/场景/道具卡统一展示 ready / review / generating / missing 反馈。
- AC-3: 状态衣橱里的基础形象和状态图都支持放大查看，并清晰暴露“设为分镜默认状态”。
- AC-4: 分镜页能清楚展示角色当前生效状态，并允许按镜头手动覆盖状态参考。
- AC-5: 风格锚点、批量补全 ETA 与完成总结在设计台中可见。

## Forbidden Scope

- `h5-video-tool-api/src/services/dreaminaVideo.ts`
- `h5-video-tool-api/src/services/klingVideo.ts`
- `h5-video-tool-api/src/services/veoPython.ts`
- `h5-video-tool-api/src/services/studioPipeline.ts`
- `h5-video-tool-api/src/types/productionTypes.ts`
- `h5-video-tool-api/src/config/productionAssets.ts`
- `.env`

## Primary Files

- `docs/plans/2026-04-24-production-design-asset-experience-design.md`
- `docs/plans/2026-04-24-production-design-asset-experience-plan.md`
- `h5-video-tool/src/pages/ProductionWizard.tsx`
- `h5-video-tool/src/studio/steps/StepDesignHeader.tsx`
- `h5-video-tool/src/studio/steps/StepDesignCharactersPanel.tsx`
- `h5-video-tool/src/studio/steps/StepDesignScenesPanel.tsx`
- `h5-video-tool/src/studio/steps/StepDesignPropsPanel.tsx`
- `h5-video-tool/src/components/production/CharacterWardrobePanel.tsx`
- `h5-video-tool/src/studio/steps/StepStoryboardAssetsSidebar.tsx`
- `h5-video-tool/src/studio/steps/StepStoryboardWorkspace.tsx`
- `h5-video-tool/src/studio/productionAssets.ts`
- `h5-video-tool/src/studio/productionTypes.ts`
- `h5-video-tool/src/i18n/messages.ts`

## Progress

- [ ] AC-1
- [ ] AC-2
- [ ] AC-3
- [ ] AC-4
- [ ] AC-5

## Current Notes

- Worktree branch: `codex/production-design-asset-experience-polish`
- Baseline targeted test passes: `node --test tests/shotUserStatus.test.ts`
- Frontend `npm run build` is currently blocked by missing local `tsc` binary in this environment; treat as environment issue and verify again after dependency remediation or equivalent command path validation.

