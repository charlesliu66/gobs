# Planner Spec — TASK-01 ProductionWizard Final Sprint

## Goal
- 在不改业务行为的前提下，继续拆分 `ProductionWizard.tsx`，将主页面进一步收敛为编排层，并为后续 Context 化收口铺路。

## In Scope
- 抽离 Step 2 编排块为独立 Workspace 组件（包含 tab 区、模态、L3 入口）。
- 抽离 Step 4 编排块为独立 Workspace 组件（包含总览与 Prompt 一致性区块）。
- 保持现有 API、状态流、交互文案不变。
- 保持构建通过、无新增 lint 错误。

## Out of Scope
- 本轮不引入 `ProductionContext.tsx` 与 `useReducer` 全量迁移。
- 不修改后端接口与生成逻辑。
- 不调整 UI 样式与业务规则。

## Acceptance Criteria
- AC-01: `ProductionWizard.tsx` 中 Step 2 与 Step 4 的内联 JSX 被 Workspace 组件替换。
- AC-02: `ProductionWizard.tsx` 行数继续下降（相对当前基线 1868）。
- AC-03: 前端 `npm run build` 通过。
- AC-04: 改动文件 `ReadLints` 无新增问题。
- AC-05: 行为回归：Step 2 角色/场景/道具/checklist 切换、Step 2 模态操作、Step 4 导出区交互保留。

## Risk Register
- R1 (P1): 组件 props 过多导致回调绑定遗漏，出现功能断裂。
- R2 (P1): Step 2 中 portrait/scene-prop 模态依赖闭包状态，抽离后可能引用过期。
- R3 (P2): 类型定义拆出后重复或不兼容，触发 TS 报错。
- R4 (P2): 仅结构迁移但误改判空条件，导致某 Step 不渲染。

## Implementation Approach
- 先新增 `StepDesignWorkspace.tsx`，把 Step 2 的编排壳与模态逻辑整体迁移。
- 再新增 `StepExportWorkspace.tsx`，把 Step 4 容器编排迁移。
- 最后在 `ProductionWizard.tsx` 回接新组件并清理无用 import。

## Test Matrix
- T1 / AC-01: 静态检查 `ProductionWizard.tsx` 中 `step===2/4` 使用新 Workspace。
- T2 / AC-02: 统计 `ProductionWizard.tsx` 行数。
- T3 / AC-03: 运行 `h5-video-tool` 的 `npm run build`。
- T4 / AC-04: 对相关文件运行 `ReadLints`。
- T5 / AC-05: 代码审查关键回调映射（角色库导入、人像确认、场景/道具模态确认、导出按钮链路）。

