# SESSION-ANCHOR - production style ref asset picker

> Run ID: `2026-04-22-production-style-ref-asset-picker`
> Sprint: production usability polish
> 对应诉求：高级制片参考图反解析支持从素材库直接选图

---

## 目标（一句话）

让高级制片 Step 0 的“参考图反解析”除了本地上传，还能直接从素材库挑图，并复用现有风格反解析链路。

## 本轮交付物

| ID | 交付项 | 主要落地文件 |
|---|---|---|
| SR-01 | Step 0 增加“从素材库选择”入口 | `h5-video-tool/src/studio/steps/StepInput.tsx` |
| SR-02 | 选中素材后沿用既有参考图处理链路 | `h5-video-tool/src/studio/steps/StepInput.tsx` |
| SR-03 | 补最小回归测试 | `h5-video-tool/src/studio/steps/StepInput.test.tsx` |

## 只读文件（允许参考，不允许改）

- `h5-video-tool-api/src/services/dreaminaVideo.ts`
- `h5-video-tool-api/src/services/klingVideo.ts`
- `h5-video-tool-api/src/services/veoPython.ts`
- `h5-video-tool-api/src/services/studioPipeline.ts`
- `h5-video-tool-api/src/types/productionTypes.ts`
- `h5-video-tool-api/src/config/productionAssets.ts`
- `.env`

## 本轮禁区

- 不改底层视频/图片生成服务
- 不新增后端素材库接口
- 不做 `ProductionWizard` 大规模状态重构

## 参考文件

- `h5-video-tool/src/pages/ProductionWizard.tsx`
- `h5-video-tool/src/components/production/CharacterWardrobePanel.tsx`
- `docs/plans/2026-04-22-production-style-ref-asset-picker-design.md`

## 通过门禁条件

- Gate 2 Builder：新增入口可见，选图逻辑走既有 `onStyleRefFileChange`
- Gate 3 Verifier：目标测试通过，前端构建通过
- Gate 5 Integrator：更新 `PRODUCT.md` 并记录验证结论
