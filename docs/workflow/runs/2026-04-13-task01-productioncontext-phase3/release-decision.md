# Release Decision — TASK-01 ProductionContext Phase 3

## Decision
- **GO（本轮范围）**

## Blocking Issues
- 本轮范围内无 P0/P1 阻塞项。

## Accepted Risks
- Context 继续增大，尚未 reducer 化治理。
- `ProductionWizard.tsx` 仍高于 TASK-01 终态目标（<50 行）。

## Release Boundary
- 覆盖：
  - Step2 portrait/scene-prop 模态状态下沉到 Context
  - `StepDesignWorkspace` 使用 context 控制模态与 reset
- 不覆盖：
  - 全量 reducer 迁移
  - 主文件壳化终态

## Next Actions
1. Phase 4：抽 `ProductionWizardStateAdapter`（或 `useProductionController`）把页面内回调打包下沉。
2. 准备 reducer 迁移草图（state 分片 + action 列表 + side-effect 边界）。
3. 在完成 reducer 基础后再冲刺 `<50 行` 壳化目标。

