# Release Decision — TASK-01 ProductionContext Phase 2

## Decision
- **GO（本轮范围）**

## Blocking Issues
- 本轮无 P0/P1 阻塞。

## Accepted Risks
- `ProductionContext` 仍为受控分发 + 局部状态承载，未进入 reducer 终态。
- `ProductionWizard.tsx` 体量仍远高于 TASK-01 最终验收标准。

## Release Boundary
- 覆盖内容：
  - Step2 UI 状态透传下沉到 Context（tab/checklist/library/lightbox 路径）
  - `StepDesignWorkspace` context 消费改造
- 不覆盖：
  - 全量状态 ownership 迁移
  - `useReducer` 化

## Next Actions
1. Phase 3：把 Step2 的高频 action（如部分 modal 打开/关闭与 patch 入口）进一步下沉。
2. 设计 `ProductionReducer` 草案，开始替换分散 `useState`。
3. 达到 reducer 基础稳定后，再做 `ProductionWizard` 壳化压缩冲刺。

