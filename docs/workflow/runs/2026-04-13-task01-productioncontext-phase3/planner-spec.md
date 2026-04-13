# Planner Spec — TASK-01 ProductionContext Phase 3

## Goal
- 继续下沉 Step2 模态相关状态到 `ProductionContext`，减少 `ProductionWizard.tsx` 到 `StepDesignWorkspace` 的状态与开关透传。

## In Scope
- 扩展 `ProductionContext`：
  - `portraitEdit` / `setPortraitEdit`
  - `scenePropModal` / `setScenePropModal`
  - `scenePropPreview` / `setScenePropPreview`
  - `scenePropError` / `setScenePropError`
  - `scenePropGenBusy`
- 改造 `StepDesignWorkspace`：
  - 通过 context 管理 portrait 与 scene/prop 模态开关和局部展示状态
  - 删除对应 props 与中转回调
- 更新 `ProductionWizard.tsx`：
  - Provider 注入新增值
  - 缩减 Step2 相关 props

## Out of Scope
- 不进行 reducer 化。
- 不改变模态内业务逻辑和接口调用行为。

## Acceptance Criteria
- AC-01: `ProductionContext` 新增上述 Step2 模态状态字段。
- AC-02: `StepDesignWorkspace` 至少减少 6 个相关 props。
- AC-03: `ProductionWizard.tsx` 的 Step2 调用简化且行为保持。
- AC-04: `npm run build` 通过。
- AC-05: `ReadLints` 无新增问题。

## Risks
- R1 (P1): 模态开关状态引用错位，导致弹窗无法打开/关闭。
- R2 (P1): `onConfirmPortrait` 对 `portraitEdit` 依赖错误导致确认后更新失败。
- R3 (P2): context 类型耦合上升，后续 reducer 迁移复杂度增加。

## Test Matrix
- T1 / AC-01: 检查 `ProductionContext.tsx` 字段定义与 Provider 注入一致。
- T2 / AC-02: 检查 `StepDesignWorkspace` props 缩减结果。
- T3 / AC-03: 审核角色生图弹窗与场景/道具弹窗的 open/close 链路。
- T4 / AC-04: 执行 `npm run build`。
- T5 / AC-05: 执行 `ReadLints`。

