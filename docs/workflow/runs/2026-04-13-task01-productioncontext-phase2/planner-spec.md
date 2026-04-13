# Planner Spec — TASK-01 ProductionContext Phase 2

## Goal
- 在 Phase 1 基础上继续扩大 `ProductionContext` 覆盖面，将 Step2 的 UI 状态透传进一步下沉到 context 消费，降低 `ProductionWizard.tsx` 编排复杂度。

## In Scope
- 扩展 `ProductionContext`：加入 `l2Tab`、`checklistSubTab`、`showLibraryImport`、`setLightboxSrc` 的 Step2 消费路径。
- 改造 `StepDesignWorkspace`：从 context 读取上述状态与 setter，减少 props。
- 更新 `ProductionWizard.tsx`：Provider 注入新增 context 值，并精简 Step2 props 传递。

## Out of Scope
- 不进行 `useReducer` 全量迁移。
- 不变更业务逻辑与后端接口。
- 不对 Step2 子面板内部业务做重写。

## Acceptance Criteria
- AC-01: `ProductionContext` 新增 Step2 相关状态字段与 setter。
- AC-02: `StepDesignWorkspace` 至少减少 5 个原有透传 props，改为 context 读取。
- AC-03: `ProductionWizard.tsx` Step2 调用参数显著减少且行为保持一致。
- AC-04: `npm run build` 通过。
- AC-05: `ReadLints` 无新增问题。

## Risks
- R1 (P1): Context 类型扩展不一致导致 TS 报错或运行期 undefined。
- R2 (P1): Step2 tab 切换与 checklist 子 tab 绑定错位。
- R3 (P2): 过度下沉导致 workspace 隐式依赖增加，可读性下降。

## Approach
- 先改 Context 类型与 Provider 注入。
- 再改 `StepDesignWorkspace` 消费 context，并删除对应 props。
- 最后清理 `ProductionWizard.tsx` 冗余传参与 import。

## Test Matrix
- T1 / AC-01: 检查 `ProductionContext.tsx` 字段定义与 Provider value。
- T2 / AC-02: 对比 `StepDesignWorkspace` props 前后差异。
- T3 / AC-03: 代码审查 Step2 tab/checklist/图库显隐/灯箱行为映射。
- T4 / AC-04: 运行 `npm run build`。
- T5 / AC-05: 运行 `ReadLints`。

